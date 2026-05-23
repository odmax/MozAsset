import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function getAdminSession() {
  const sessionCookie = cookies().get('adminSession');
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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const { ticketId } = await params;
    const admin = getAdminSession();
    if (!admin || !admin.isInternalAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.id },
      select: { id: true, email: true, role: true, permissions: true, name: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:resolve')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        assignedAdmin: { select: { id: true, activeChatCount: true, maxConcurrentChats: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (dbAdmin.role === 'SUPPORT_AGENT' && ticket.assignedAdminId !== dbAdmin.id) {
      return NextResponse.json({ error: 'You can only resolve tickets assigned to you' }, { status: 403 });
    }

    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return NextResponse.json({ error: 'Ticket is already resolved or closed' }, { status: 400 });
    }

    const now = new Date();

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'RESOLVED',
        resolvedAt: now,
        updatedAt: now,
      },
    });

    if (ticket.assignedAdmin && ticket.assignedAdmin.id) {
      const agent = ticket.assignedAdmin;
      const willRemainBusy = agent.activeChatCount - 1 >= agent.maxConcurrentChats;

      await prisma.internalAdmin.update({
        where: { id: agent.id },
        data: {
          activeChatCount: { decrement: 1 },
          status: (!willRemainBusy && agent.activeChatCount >= agent.maxConcurrentChats) ? 'ONLINE' : undefined,
          isBusy: willRemainBusy,
        },
      });
    }

    try {
      await prisma.auditLog.create({
        data: {
          action: 'TICKET_RESOLVED',
          entityType: 'SupportTicket',
          entityId: ticketId,
          userId: dbAdmin.id,
          metadata: {
            resolvedBy: dbAdmin.id,
            resolvedByName: dbAdmin.name,
            previousStatus: ticket.status,
          },
        },
      });
    } catch (err) {
      console.error('Failed to log resolution:', err);
    }

    try {
      await createNotification({
        userId: ticket.user.id,
        type: 'SUPPORT_REPLY',
        title: 'Ticket Resolved',
        message: `Your ticket "${ticket.subject}" has been marked as resolved`,
        link: `/dashboard/support?ticket=${ticketId}`,
        actorId: dbAdmin.id,
      });
    } catch (err) {
      console.error('Failed to notify customer:', err);
    }

    revalidatePath('/admin/support-tickets');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resolve error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
