import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const [assets, entries] = await Promise.all([
    prisma.asset.findMany({
      where: { organizationId: orgId, purchaseCost: { not: null }, usefulLifeMonths: { gt: 0 } },
      select: {
        id: true, assetTag: true, name: true, purchaseCost: true, salvageValue: true,
        usefulLifeMonths: true, depreciationMethod: true, depreciationStartDate: true,
        currentBookValue: true, accumulatedDepreciation: true,
      },
      orderBy: { purchaseCost: 'desc' },
    }),
    prisma.depreciationRecord.findMany({
      where: { organizationId: orgId },
      orderBy: { periodDate: 'desc' },
      take: 50,
      select: {
        id: true, assetId: true, amount: true, bookValueBefore: true, bookValueAfter: true,
        accumulatedDep: true, periodDate: true, method: true,
        asset: { select: { name: true, assetTag: true } },
      },
    }),
  ]);

  const totalPurchase = assets.reduce((s, a) => s + (Number(a.purchaseCost) || 0), 0);
  const totalBookValue = assets.reduce((s, a) => s + (Number(a.currentBookValue) || Number(a.purchaseCost) || 0), 0);
  const totalDepreciated = assets.reduce((s, a) => s + (Number(a.accumulatedDepreciation) || 0), 0);

  return NextResponse.json({
    summary: { totalAssets: assets.length, totalPurchase, totalBookValue, totalDepreciated },
    assets,
    recentEntries: entries,
  });
}
