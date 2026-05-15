import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import { findBestAgent, autoAssignTicket } from '@/lib/ticket-assignment';

export const dynamic = 'force-dynamic';

export async function POST() {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.adminId },
    select: { id: true, role: true, permissions: true },
  });

  if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:assign')) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const unassigned = await prisma.supportTicket.findMany({
    where: {
      assignedAdminId: null,
      status: { notIn: ['CLOSED', 'RESOLVED'] },
    },
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'asc' },
    ],
    take: 10,
    select: { id: true, priority: true },
  });

  let assigned = 0;
  for (const ticket of unassigned) {
    const success = await autoAssignTicket(ticket.id);
    if (success) assigned++;
  }

  return NextResponse.json({
    success: true,
    assigned,
    total: unassigned.length,
  });
}
