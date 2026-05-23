import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const context = await getCurrentUserContext();
    if (!context || !context.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ticketId } = await params;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.userId !== context.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const newMessages = since
      ? await prisma.supportMessage.findMany({
          where: { ticketId, senderType: 'ADMIN', createdAt: { gt: new Date(since) } },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const isTyping = ticket.adminTypingAt
      ? (Date.now() - ticket.adminTypingAt.getTime()) < 4000
      : false;

    const latestMsgAt = newMessages.length > 0
      ? newMessages[newMessages.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      newMessages: newMessages.map((m) => ({
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
      latestMessageAt: latestMsgAt,
      adminTyping: isTyping,
      ticketStatus: ticket.status,
    });
  } catch (error) {
    console.error('Poll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
