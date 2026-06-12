import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

const TYPES = ['INACTIVE_7_DAYS', 'INACTIVE_14_DAYS', 'INACTIVE_30_DAYS', 'INACTIVE_60_DAYS', 'INACTIVE_90_DAYS'];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET() {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.adminId },
    select: { id: true, role: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'users:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stats = await Promise.all(
    [7, 14, 30, 60, 90].map(async (days) => {
      const count = await prisma.user.count({
        where: { isActive: true, isDeactivated: false, lastActiveAt: { lte: daysAgo(days) } },
      });
      return { type: `INACTIVE_${days}_DAYS`, label: `${days} Days`, count };
    })
  );

  return NextResponse.json({ stats });
}
