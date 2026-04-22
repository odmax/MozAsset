import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getPlanDetails, canAccessFeature } from '@/lib/billing';
import { formatCurrency, formatDate } from '@/lib/utils';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canAccessFeature(user.plan || 'FREE', 'exports')) {
    return NextResponse.json(
      { error: 'PLAN_LIMIT_EXCEEDED', feature: 'csvExport' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const financial = searchParams.get('financial');

  const where: any = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;

  const assets = await prisma.asset.findMany({
    where,
    include: {
      category: { select: { name: true } },
      department: { select: { name: true } },
      location: { select: { name: true } },
      assignedTo: { select: { name: true, email: true } },
      vendor: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });

  const headers = financial 
    ? ['AssetTag', 'Name', 'Category', 'Status', 'Condition', 'PurchaseDate', 'PurchaseCost', 'CurrentValue', 'Department', 'Location', 'AssignedTo', 'Vendor']
    : ['AssetTag', 'Name', 'SerialNumber', 'Brand', 'Model', 'Category', 'Status', 'Condition', 'Department', 'Location', 'AssignedTo', 'PurchaseDate', 'PurchaseCost', 'Vendor', 'WarrantyExpiry'];

  const rows = assets.map(a => {
    if (financial) {
      return [
        a.assetTag,
        `"${(a.name || '').replace(/"/g, '""')}"`,
        a.category?.name || '',
        a.status,
        a.condition,
        a.purchaseDate ? formatDate(a.purchaseDate) : '',
        a.purchaseCost ? a.purchaseCost.toString() : '',
        a.purchaseCost ? a.purchaseCost.toString() : '',
        a.department?.name || '',
        a.location?.name || '',
        a.assignedTo?.name || '',
        a.vendor?.name || '',
      ].join(',');
    }
    return [
      a.assetTag,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      a.serialNumber || '',
      a.brand || '',
      a.model || '',
      a.category?.name || '',
      a.status,
      a.condition,
      a.department?.name || '',
      a.location?.name || '',
      a.assignedTo?.name || a.assignedTo?.email || '',
      a.purchaseDate ? formatDate(a.purchaseDate) : '',
      a.purchaseCost ? a.purchaseCost.toString() : '',
      a.vendor?.name || '',
      a.warrantyExpiry ? formatDate(a.warrantyExpiry) : '',
    ].join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="assets${financial ? '-financial' : ''}.csv"`,
    },
  });
}