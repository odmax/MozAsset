import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import { autoAssignTicket } from '@/lib/ticket-assignment';
import { notifyTicketAssigned } from '@/lib/admin-notifications';

export async function POST(req: Request, { params }: { params: { ticketId: string } }) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.adminId },
    select: { id: true, role: true, name: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:assign')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.ticketId } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
  if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
    return NextResponse.json({ error: 'Cannot assign a resolved or closed ticket' }, { status: 400 });
  }

  const body = await req.json();
  const { agentId } = body;

  let assignedToId: string;

  if (agentId) {
    const agent = await prisma.internalAdmin.findUnique({ where: { id: agentId } });
    if (!agent || !agent.isActive) {
      return NextResponse.json({ error: 'Agent not found or inactive' }, { status: 404 });
    }
    assignedToId = agentId;
  } else {
    const autoId = await autoAssignTicket(params.ticketId);
    if (!autoId) {
      return NextResponse.json({ error: 'No available agents to assign' }, { status: 409 });
    }
    assignedToId = autoId;
  }

  const previousAdminId = ticket.assignedAdminId;

  if (previousAdminId && previousAdminId !== assignedToId) {
    await prisma.internalAdmin.update({
      where: { id: previousAdminId },
      data: { activeChatCount: { decrement: 1 } },
    });
  }

  if (!previousAdminId || previousAdminId !== assignedToId) {
    await prisma.internalAdmin.update({
      where: { id: assignedToId },
      data: { activeChatCount: { increment: 1 } },
    });
  }

  await prisma.supportTicket.update({
    where: { id: params.ticketId },
    data: { assignedAdminId: assignedToId },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TICKET_ASSIGNED',
      entityType: 'SupportTicket',
      entityId: params.ticketId,
      userId: dbAdmin.id,
      metadata: { assignedTo: assignedToId, manual: !!agentId },
    },
  });

  try {
    await notifyTicketAssigned(assignedToId, ticket.subject, params.ticketId);
  } catch {}

  return NextResponse.json({ success: true, assignedTo: assignedToId });
}
