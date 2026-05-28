import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
import { calculateDepreciation, getMonthsElapsed } from '@/lib/depreciation-engine';
import type { DepreciationMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const asset = await prisma.asset.findUnique({
    where: { id: params.id, organizationId: orgId },
    select: {
      id: true, assetTag: true, name: true, purchaseCost: true, salvageValue: true,
      usefulLifeMonths: true, depreciationMethod: true, depreciationStartDate: true,
      depreciationEndDate: true, currentBookValue: true, accumulatedDepreciation: true,
    },
  });

  if (!asset) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  let calculation = null;
  if (asset.purchaseCost && asset.depreciationStartDate && asset.usefulLifeMonths > 0) {
    const monthsElapsed = getMonthsElapsed(asset.depreciationStartDate);
    calculation = calculateDepreciation({
      purchaseCost: Number(asset.purchaseCost),
      salvageValue: Number(asset.salvageValue || 0),
      usefulLifeMonths: asset.usefulLifeMonths,
      method: asset.depreciationMethod as DepreciationMethod,
      monthsElapsed,
    });
  }

  const entries = await prisma.depreciationRecord.findMany({
    where: { assetId: params.id },
    orderBy: { periodDate: 'desc' },
    take: 24,
    select: { id: true, amount: true, bookValueBefore: true, bookValueAfter: true, accumulatedDep: true, periodDate: true, method: true },
  });

  return NextResponse.json({ asset, calculation, entries });
}
