import { NextResponse } from 'next/server';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.adminId },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'analytics:read')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();

    const [
      totalFree,
      inactive60,
      deactivated,
      pendingDeletion,
    ] = await Promise.all([
      prisma.user.count({ where: { plan: 'FREE', isActive: true, isPlatformAdmin: false } }),
      prisma.user.count({
        where: {
          plan: 'FREE',
          isActive: true,
          isPlatformAdmin: false,
          isDeactivated: false,
          lastActiveAt: { lte: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.user.count({
        where: {
          plan: 'FREE',
          isActive: true,
          isPlatformAdmin: false,
          isDeactivated: true,
        },
      }),
      prisma.user.count({
        where: {
          plan: 'FREE',
          isActive: true,
          isPlatformAdmin: false,
          isDeactivated: true,
          scheduledDeletionAt: { not: null, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalFree,
        inactive60Days: inactive60,
        deactivated,
        pendingDeletion,
      },
    });
  } catch (error) {
    console.error('[lifecycle-stats] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch stats' }, { status: 500 });
  }
}
