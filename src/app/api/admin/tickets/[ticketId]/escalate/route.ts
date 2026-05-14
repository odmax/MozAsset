import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import { notifyTicketEscalated } from '@/lib/admin-notifications';

export async function POST(req: Request, { params }: { params: { ticketId: string } }) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.adminId },
    select: { id: true, role: true, name: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:escalate')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: params.ticketId } });
  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

  if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
    return NextResponse.json({ error: 'Cannot escalate a resolved or closed ticket' }, { status: 400 });
  }

  const body = await req.json();
  const { escalateToAdminId, reason } = body;

  if (!escalateToAdminId) {
    return NextResponse.json({ error: 'escalateToAdminId is required' }, { status: 400 });
  }

  const targetAdmin = await prisma.internalAdmin.findUnique({ where: { id: escalateToAdminId }, select: { id: true, isActive: true, role: true } });
  if (!targetAdmin || !targetAdmin.isActive) {
    return NextResponse.json({ error: 'Target admin not found or inactive' }, { status: 404 });
  }

  if (!['SUPER_ADMIN', 'OWNER', 'SUPPORT_MANAGER'].includes(targetAdmin.role)) {
    return NextResponse.json({ error: 'Can only escalate to a manager or above' }, { status: 400 });
  }

  await prisma.supportTicket.update({
    where: { id: params.ticketId },
    data: {
      escalatedToId: escalateToAdminId,
      escalatedAt: new Date(),
      escalatedBy: dbAdmin.id,
      escalationReason: reason || null,
      priority: ticket.priority === 'LOW' ? 'MEDIUM' : ticket.priority === 'MEDIUM' ? 'HIGH' : 'URGENT',
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TICKET_ESCALATED',
      entityType: 'SupportTicket',
      entityId: params.ticketId,
      userId: dbAdmin.id,
      metadata: { escalatedTo: escalateToAdminId, reason },
    },
  });

  try {
    const fromName = dbAdmin.name || dbAdmin.id;
    await notifyTicketEscalated(escalateToAdminId, fromName, ticket.subject, params.ticketId);
  } catch {}

  return NextResponse.json({
    success: true,
    escalatedTo: escalateToAdminId,
    escalatedAt: new Date().toISOString(),
  });
}
