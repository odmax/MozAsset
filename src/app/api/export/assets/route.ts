import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';
import { canAccessFeature } from '@/lib/billing';
import { formatDate } from '@/lib/utils';

export async function GET(request: Request) {
  const context = await getCurrentUserContext();
  if (!context?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canAccessFeature(context.plan, 'exports')) {
    return NextResponse.json(
      { error: 'PLAN_LIMIT_EXCEEDED', feature: 'csvExport' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || '';
  const categoryId = searchParams.get('categoryId') || '';
  const financial = searchParams.get('financial');

  // Platform admins can export all, others scoped to org
  const isPlatformAdmin = context.isPlatformAdmin || context.isInternalAdmin;
  const where: any = isPlatformAdmin ? {} : { organizationId: context.organizationId };
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