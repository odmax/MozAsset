import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const url = new URL(request.url);
  const deptFilter = url.searchParams.get('departmentId') || undefined;
  const catFilter = url.searchParams.get('categoryId') || undefined;
  const locFilter = url.searchParams.get('locationId') || undefined;
  const months = parseInt(url.searchParams.get('months') || '') || 12;

  const since = new Date();
  since.setMonth(since.getMonth() - months);

  const baseWhere: any = { organizationId: orgId };
  if (deptFilter) baseWhere.departmentId = deptFilter;
  if (catFilter) baseWhere.categoryId = catFilter;
  if (locFilter) baseWhere.locationId = locFilter;

  const [
    assetStats, categoryValues, departmentValues, locationValues,
    statusCounts, maintenanceStats, maintenanceTrend,
    stockVerStats, stockVerTrend,
    allAssets, expiryAlerts,
  ] = await Promise.all([

    prisma.asset.aggregate({
      where: baseWhere,
      _sum: { purchaseCost: true, currentBookValue: true, accumulatedDepreciation: true },
      _count: true,
    }),

    prisma.asset.groupBy({
      by: ['categoryId'],
      where: baseWhere,
      _sum: { purchaseCost: true, currentBookValue: true },
      _count: true,
    }),

    prisma.asset.groupBy({
      by: ['departmentId'],
      where: baseWhere,
      _sum: { purchaseCost: true, currentBookValue: true },
      _count: true,
    }),

    prisma.asset.groupBy({
      by: ['locationId'],
      where: baseWhere,
      _sum: { purchaseCost: true },
      _count: true,
    }),

    prisma.asset.groupBy({
      by: ['status'],
      where: baseWhere,
      _count: true,
    }),

    prisma.maintenance.aggregate({
      where: { asset: { organizationId: orgId }, createdAt: { gte: since } },
      _sum: { cost: true },
      _count: true,
    }),

    prisma.maintenance.groupBy({
      by: ['status'],
      where: { asset: { organizationId: orgId }, createdAt: { gte: since } },
      _count: true,
    }),

    prisma.stockVerificationSession.aggregate({
      where: { organizationId: orgId },
      _count: true,
    }),

    prisma.stockVerificationItem.groupBy({
      by: ['status'],
      where: { session: { organizationId: orgId } },
      _count: true,
    }),

    prisma.asset.findMany({
      where: { ...baseWhere, warrantyExpiry: { not: null } },
      select: { id: true, name: true, assetTag: true, status: true, purchaseDate: true, warrantyExpiry: true, purchaseCost: true, currentBookValue: true, category: { select: { name: true } } },
      orderBy: { purchaseCost: 'desc' },
      take: 5,
    }),

    prisma.asset.findMany({
      where: { ...baseWhere, warrantyExpiry: { not: null, lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) } },
      select: { id: true, name: true, assetTag: true, warrantyExpiry: true },
      orderBy: { warrantyExpiry: 'asc' },
      take: 10,
    }),
  ]);

  const catIds = categoryValues.map(c => c.categoryId).filter((id): id is string => id !== null && id !== undefined);
  const deptIds = departmentValues.map(d => d.departmentId).filter((id): id is string => id !== null && id !== undefined);
  const locIds = locationValues.map(l => l.locationId).filter((id): id is string => id !== null && id !== undefined);

  const [categories, departments, locations, svItemsDiscrepancy] = await Promise.all([
    catIds.length > 0 ? prisma.category.findMany({ where: { id: { in: catIds as string[] } }, select: { id: true, name: true } }) : [],
    deptIds.length > 0 ? prisma.department.findMany({ where: { id: { in: deptIds as string[] } }, select: { id: true, name: true } }) : [],
    locIds.length > 0 ? prisma.location.findMany({ where: { id: { in: locIds as string[] } }, select: { id: true, name: true } }) : [],
    prisma.stockVerificationItem.groupBy({
      by: ['status'],
      where: { session: { organizationId: orgId } },
      _count: true,
    }),
  ]);

  const catMap = new Map(categories.map(c => [c.id, c.name]));
  const deptMap = new Map(departments.map(d => [d.id, d.name]));
  const locMap = new Map(locations.map(l => [l.id, l.name]));

  const assignedCount = statusCounts.find(s => s.status === 'ASSIGNED')?._count || 0;
  const availableCount = statusCounts.find(s => s.status === 'AVAILABLE')?._count || 0;
  const maintenanceCount = statusCounts.find(s => s.status === 'IN_REPAIR')?._count || 0;
  const retiredCount = statusCounts.find(s => s.status === 'RETIRED')?._count || 0;
  const totalStatus = statusCounts.reduce((s, x) => s + x._count, 0);

  const deprecatedMsgs = allAssets
    .filter(a => a.purchaseCost && a.currentBookValue &&
      Number(a.currentBookValue) <= Number(a.purchaseCost) * 0.2 && Number(a.currentBookValue) > 0)
    .slice(0, 5)
    .map(a => ({ id: a.id, name: a.name, assetTag: a.assetTag, bookValue: Number(a.currentBookValue), originalCost: Number(a.purchaseCost) }));

  return NextResponse.json({
    summary: {
      totalAssets: assetStats._count,
      totalPurchaseValue: Number(assetStats._sum.purchaseCost || 0),
      totalBookValue: Number(assetStats._sum.currentBookValue || 0),
      totalDepreciated: Number(assetStats._sum.accumulatedDepreciation || 0),
      assignedCount,
      availableCount,
      maintenanceCount,
      retiredCount,
    },
    valueByCategory: categoryValues.map(c => ({
      category: catMap.get(c.categoryId || '') || 'Uncategorized',
      count: c._count,
      purchaseValue: Number(c._sum.purchaseCost || 0),
      bookValue: Number(c._sum.currentBookValue || 0),
    })),
    valueByDepartment: departmentValues.map(d => ({
      department: deptMap.get(d.departmentId || '') || 'Unassigned',
      count: d._count,
      purchaseValue: Number(d._sum.purchaseCost || 0),
      bookValue: Number(d._sum.currentBookValue || 0),
    })),
    valueByLocation: locationValues.map(l => ({
      location: locMap.get(l.locationId || '') || 'Unassigned',
      count: l._count,
      purchaseValue: Number(l._sum.purchaseCost || 0),
    })),
    lifecycle: {
      assigned: assignedCount,
      available: availableCount,
      maintenance: maintenanceCount,
      retired: retiredCount,
      pctAssigned: totalStatus > 0 ? Math.round((assignedCount / totalStatus) * 100) : 0,
      pctAvailable: totalStatus > 0 ? Math.round((availableCount / totalStatus) * 100) : 0,
    },
    maintenance: {
      totalCost: Number(maintenanceStats._sum.cost || 0),
      totalCount: maintenanceStats._count,
      byStatus: maintenanceTrend.map(m => ({ status: m.status, count: m._count })),
    },
    stockVerification: {
      totalSessions: stockVerStats._count,
      items: svItemsDiscrepancy.map(i => ({ status: i.status, count: i._count })),
      totalItems: svItemsDiscrepancy.reduce((s, i) => s + i._count, 0),
    },
    topAssets: allAssets.map(a => ({
      id: a.id, name: a.name, assetTag: a.assetTag, status: a.status,
      purchaseCost: Number(a.purchaseCost || 0), bookValue: Number(a.currentBookValue || 0),
      category: a.category?.name || '',
      purchaseDate: a.purchaseDate,
      warrantyExpiry: a.warrantyExpiry,
    })),
    upcomingExpiries: expiryAlerts.map(e => ({
      id: e.id, name: e.name, assetTag: e.assetTag,
      warrantyExpiry: e.warrantyExpiry,
    })),
    replacementSuggestions: deprecatedMsgs,
  });
}
