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

  const [
    totalAssets,
    totalValue,
    valueByCategory,
    valueByDepartment,
    assetsByStatus,
    assetsByCondition,
    topValueAssets,
  ] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.aggregate({ _sum: { purchaseCost: true } }),
    prisma.asset.groupBy({
      by: ['categoryId'],
      _sum: { purchaseCost: true },
      where: { purchaseCost: { not: null } },
    }),
    prisma.asset.groupBy({
      by: ['departmentId'],
      _sum: { purchaseCost: true },
      where: { purchaseCost: { not: null } },
    }),
    prisma.asset.groupBy({ by: ['status'], _count: true }),
    prisma.asset.groupBy({ by: ['condition'], _count: true }),
    prisma.asset.findMany({
      where: { purchaseCost: { not: null } },
      orderBy: { purchaseCost: 'desc' },
      take: 10,
      include: { category: true },
    }),
  ]);

  const categories = await prisma.category.findMany({
    where: { id: { in: valueByCategory.map(c => c.categoryId).filter(Boolean) as string[] } },
    select: { id: true, name: true },
  });

  const departments = await prisma.department.findMany({
    where: { id: { in: valueByDepartment.map(d => d.departmentId).filter(Boolean) as string[] } },
    select: { id: true, name: true },
  });

  const categoryData = valueByCategory.map(c => ({
    name: categories.find(cat => cat.id === c.categoryId)?.name || 'Uncategorized',
    value: Number(c._sum.purchaseCost) || 0,
  }));

  const departmentData = valueByDepartment.map(d => ({
    name: departments.find(dept => dept.id === d.departmentId)?.name || 'Unassigned',
    value: Number(d._sum.purchaseCost) || 0,
  }));

  const statusData = assetsByStatus.map(s => ({
    name: s.status,
    value: s._count,
    color: s.status === 'AVAILABLE' ? '#22c55e' : s.status === 'ASSIGNED' ? '#3b82f6' : s.status === 'IN_REPAIR' ? '#f59e0b' : '#6b7280',
  }));

  const conditionData = assetsByCondition.map(c => ({
    name: c.condition,
    value: c._count,
  }));

  return NextResponse.json({
    totalAssets,
    totalValue: Number(totalValue._sum.purchaseCost) || 0,
    categoryData,
    departmentData,
    statusData,
    conditionData,
    topValueAssets,
  });
}