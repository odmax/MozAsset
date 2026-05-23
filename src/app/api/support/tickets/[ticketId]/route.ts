import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const context = await getCurrentUserContext();
    if (!context || !context.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = await params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.userId !== context.userId && !context.isInternalAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminTyping = ticket.adminTypingAt
      ? (Date.now() - ticket.adminTypingAt.getTime()) < 4000
      : false;

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      },
      messages: ticket.messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
        status: m.status,
        deliveredAt: m.deliveredAt?.toISOString() || null,
        seenAt: m.seenAt?.toISOString() || null,
        readAt: m.readAt?.toISOString() || null,
        clientMessageId: m.clientMessageId,
      })),
      adminTyping,
    });
  } catch (error) {
    console.error('Get ticket error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const context = await getCurrentUserContext();
    if (!context || !context.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = await params;
    const { message, clientMessageId } = await request.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    if (clientMessageId) {
      const existing = await prisma.supportMessage.findUnique({
        where: { clientMessageId },
      });
      if (existing) {
        return NextResponse.json({
          id: existing.id,
          senderType: existing.senderType,
          message: existing.message,
          createdAt: existing.createdAt.toISOString(),
          status: existing.status,
          clientMessageId: existing.clientMessageId,
        });
      }
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.userId !== context.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
      return NextResponse.json({ error: 'Ticket is closed' }, { status: 400 });
    }

    const msg = await prisma.supportMessage.create({
      data: {
        ticketId,
        senderType: 'USER',
        senderUserId: context.userId,
        message,
        clientMessageId: clientMessageId || undefined,
      },
    });

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status: 'OPEN', updatedAt: new Date() },
    });

    return NextResponse.json({
      id: msg.id,
      senderType: msg.senderType,
      message: msg.message,
      createdAt: msg.createdAt.toISOString(),
      status: msg.status,
      clientMessageId: msg.clientMessageId,
    });
  } catch (error) {
    console.error('Reply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
