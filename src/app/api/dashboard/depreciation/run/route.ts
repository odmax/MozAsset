import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
import { calculateDepreciation, getMonthsElapsed } from '@/lib/depreciation-engine';
import type { DepreciationMethod, Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const assets = await prisma.asset.findMany({
    where: {
      organizationId: orgId,
      purchaseCost: { not: null },
      usefulLifeMonths: { gt: 0 },
      depreciationStartDate: { not: null },
    },
    select: {
      id: true, purchaseCost: true, salvageValue: true, usefulLifeMonths: true,
      depreciationMethod: true, depreciationStartDate: true, currentBookValue: true,
      accumulatedDepreciation: true, organizationId: true,
    },
  });

  if (assets.length === 0) {
    return NextResponse.json({ message: 'No assets found with depreciation setup', processed: 0 });
  }

  const entries: Prisma.DepreciationRecordCreateManyInput[] = [];
  let processed = 0;

  for (const asset of assets) {
    const purchaseCost = Number(asset.purchaseCost);
    const salvageValue = Number(asset.salvageValue || 0);
    const startDate = asset.depreciationStartDate!;
    const monthsElapsed = getMonthsElapsed(startDate);

    if (monthsElapsed <= 0) continue;

    const result = calculateDepreciation({
      purchaseCost,
      salvageValue,
      usefulLifeMonths: asset.usefulLifeMonths,
      method: asset.depreciationMethod as DepreciationMethod,
      monthsElapsed,
    });

    const bookValueBefore = Number(asset.currentBookValue) || purchaseCost;
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const prevAccumulated = Number(asset.accumulatedDepreciation) || 0;
    const diffAccumulated = result.accumulatedDepreciation - prevAccumulated;

    if (diffAccumulated <= 0) continue;

    entries.push({
      assetId: asset.id,
      organizationId: asset.organizationId,
      method: asset.depreciationMethod as DepreciationMethod,
      amount: diffAccumulated,
      bookValueBefore,
      bookValueAfter: result.bookValue,
      accumulatedDep: result.accumulatedDepreciation,
      periodDate: currentMonth,
    });

    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        currentBookValue: result.bookValue,
        accumulatedDepreciation: result.accumulatedDepreciation,
      },
    });

    processed++;
  }

  if (entries.length > 0) {
    await prisma.depreciationRecord.createMany({ data: entries });
  }

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE' as any,
      entityType: 'Asset',
      entityId: orgId,
      userId: session.userId,
      changes: { action: 'depreciation_run', assetsProcessed: processed },
    },
  }).catch(() => {});

  return NextResponse.json({ message: 'Depreciation processed', processed, entriesCreated: entries.length });
}
