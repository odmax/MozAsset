import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import { notifyTicketAssigned } from '@/lib/admin-notifications';

export async function POST(req: Request, { params }: { params: { ticketId: string } }) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.adminId },
    select: { id: true, role: true, name: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:transfer')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.ticketId } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
    return NextResponse.json({ error: 'Cannot transfer a resolved or closed ticket' }, { status: 400 });
  }

  const body = await req.json();
  const { targetAgentId, note } = body;

  if (!targetAgentId) {
    return NextResponse.json({ error: 'targetAgentId is required' }, { status: 400 });
  }

  const targetAgent = await prisma.internalAdmin.findUnique({ where: { id: targetAgentId } });
  if (!targetAgent || !targetAgent.isActive) {
    return NextResponse.json({ error: 'Target agent not found or inactive' }, { status: 404 });
  }

  const previousAdminId = ticket.assignedAdminId;

  await prisma.supportTicket.update({
    where: { id: params.ticketId },
    data: {
      assignedAdminId: targetAgentId,
      transferredFromId: previousAdminId,
      transferredAt: new Date(),
      transferredBy: dbAdmin.id,
      transferNote: note || null,
    },
  });

  if (previousAdminId) {
    await prisma.internalAdmin.update({
      where: { id: previousAdminId },
      data: { activeChatCount: { decrement: 1 } },
    });
  }

  await prisma.internalAdmin.update({
    where: { id: targetAgentId },
    data: { activeChatCount: { increment: 1 } },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TICKET_TRANSFERRED',
      entityType: 'SupportTicket',
      entityId: params.ticketId,
      userId: dbAdmin.id,
      metadata: { from: previousAdminId, to: targetAgentId, note },
    },
  });

  try {
    await notifyTicketAssigned(targetAgentId, ticket.subject, params.ticketId);
  } catch {}

  return NextResponse.json({ success: true, transferredTo: targetAgentId });
}
