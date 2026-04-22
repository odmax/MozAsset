import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

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

export async function GET() {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const canAccess = ['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role);
  if (!canAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const [
      totalAssets,
      totalValue,
      assetsByStatus,
      assetsByCondition,
      assetsByCategory,
      assetsByDepartment,
      assetsByLocation,
      recentAssets,
    ] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.aggregate({ _sum: { purchaseCost: true } }),
      prisma.asset.groupBy({
        by: ['status'],
        _count: true,
      }),
      prisma.asset.groupBy({
        by: ['condition'],
        _count: true,
      }),
      prisma.asset.groupBy({
        by: ['categoryId'],
        _count: true,
      }),
      prisma.asset.groupBy({
        by: ['departmentId'],
        _count: true,
      }),
      prisma.asset.groupBy({
        by: ['locationId'],
        _count: true,
      }),
      prisma.asset.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          name: true,
          assetTag: true,
          createdAt: true,
          status: true,
        },
      }),
    ]);

    const statusColors: Record<string, string> = {
      AVAILABLE: '#22c55e',
      ASSIGNED: '#3b82f6',
      IN_REPAIR: '#f59e0b',
      RETIRED: '#6b7280',
      DISPOSED: '#ef4444',
      LOST: '#dc2626',
    };

    const conditionColors: Record<string, string> = {
      NEW: '#22c55e',
      GOOD: '#3b82f6',
      FAIR: '#f59e0b',
      POOR: '#ef4444',
      CONDEMNED: '#dc2626',
    };

    const categories = await prisma.category.findMany({
      where: {
        id: { in: assetsByCategory.map(a => a.categoryId).filter(Boolean) as string[] },
      },
      select: { id: true, name: true },
    });
    const categoryMap = new Map(categories.map(c => [c.id, c.name]));

    const departments = await prisma.department.findMany({
      where: {
        id: { in: assetsByDepartment.map(a => a.departmentId).filter(Boolean) as string[] },
      },
      select: { id: true, name: true },
    });
    const departmentMap = new Map(departments.map(d => [d.id, d.name]));

    const locations = await prisma.location.findMany({
      where: {
        id: { in: assetsByLocation.map(a => a.locationId).filter(Boolean) as string[] },
      },
      select: { id: true, name: true },
    });
    const locationMap = new Map(locations.map(l => [l.id, l.name]));

    return NextResponse.json({
      totalAssets,
      totalValue: totalValue._sum.purchaseCost || 0,
      assetsByStatus: assetsByStatus.map(s => ({
        name: s.status,
        value: s._count,
        color: statusColors[s.status] || '#6b7280',
      })),
      assetsByCondition: assetsByCondition.map(c => ({
        name: c.condition,
        value: c._count,
        color: conditionColors[c.condition] || '#6b7280',
      })),
      assetsByCategory: assetsByCategory.map(c => ({
        name: categoryMap.get(c.categoryId ?? '') || 'Unassigned',
        value: c._count,
      })),
      assetsByDepartment: assetsByDepartment.map(d => ({
        name: departmentMap.get(d.departmentId ?? '') || 'Unassigned',
        value: d._count,
      })),
      assetsByLocation: assetsByLocation.map(l => ({
        name: locationMap.get(l.locationId ?? '') || 'Unassigned',
        value: l._count,
      })),
      recentActivity: [],
    });
  } catch (error) {
    console.error('Overview API error:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}