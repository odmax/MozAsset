import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

function getAdminSession() {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = getAdminSession();
  if (!admin || !admin.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [totalSize, totalFiles, uploadsToday, recentUploads, orgStorage, typeDistribution] = await Promise.all([
    prisma.file.aggregate({ _sum: { size: true } }),
    prisma.file.count(),
    prisma.file.count({
      where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    }),
    prisma.file.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, originalName: true, size: true, type: true, createdAt: true },
    }),
    prisma.file.groupBy({
      by: ['organizationId'],
      _sum: { size: true },
      _count: true,
      orderBy: { _sum: { size: 'desc' } },
      take: 10,
    }),
    prisma.file.groupBy({
      by: ['type'],
      _count: true,
      _sum: { size: true },
    }),
  ]);

  const orgIds = orgStorage.map((o) => o.organizationId).filter(Boolean) as string[];
  const orgs = orgIds.length > 0
    ? await prisma.organization.findMany({ where: { id: { in: orgIds } }, select: { id: true, name: true } })
    : [];
  const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

  return NextResponse.json({
    totalSize: totalSize._sum.size || 0,
    totalFiles,
    uploadsToday,
    recentUploads,
    topOrganizations: orgStorage.map((o) => ({
      organizationId: o.organizationId,
      organizationName: orgMap.get(o.organizationId || '') || 'Unknown',
      size: o._sum.size || 0,
      count: o._count,
    })),
    byType: typeDistribution.map((t) => ({
      type: t.type,
      count: t._count,
      size: t._sum.size || 0,
    })),
  });
}
