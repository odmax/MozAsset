import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { canAccessFeature } from '@/lib/billing';
import type { Plan } from '@prisma/client';
import { formatDate } from '@/lib/utils';

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

  if (!canAccessFeature((user.plan || 'FREE') as Plan, 'exports')) {
    return NextResponse.json(
      { error: 'PLAN_LIMIT_EXCEEDED', feature: 'exports' },
      { status: 403 }
    );
  }

  const days = parseInt(new URL(request.url).searchParams.get('days') || '90');
  const now = new Date();
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const assets = await prisma.asset.findMany({
    where: {
      warrantyExpiry: {
        gte: now,
        lte: future,
      },
    },
    include: {
      category: { select: { name: true } },
      department: { select: { name: true } },
      vendor: { select: { name: true } },
    },
    orderBy: { warrantyExpiry: 'asc' },
    take: 5000,
  });

  const csv = [
    'AssetTag,Name,Category,Department,PurchaseDate,PurchaseCost,WarrantyExpiry,Vendor,DaysUntilExpiry',
    ...assets.map(a => [
      a.assetTag,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      a.category?.name || '',
      a.department?.name || '',
      a.purchaseDate ? formatDate(a.purchaseDate) : '',
      a.purchaseCost ? a.purchaseCost.toString() : '',
      a.warrantyExpiry ? formatDate(a.warrantyExpiry) : '',
      a.vendor?.name || '',
      a.warrantyExpiry ? Math.ceil((new Date(a.warrantyExpiry).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)).toString() : '',
    ].join(','))
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="warranties-expiring-${days}-days.csv"`,
    },
  });
}