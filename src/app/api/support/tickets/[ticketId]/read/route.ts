import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export const dynamic = 'force-dynamic';

export async function POST(
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
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (ticket.userId !== context.userId && !context.isInternalAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const whereSenderType = context.isInternalAdmin ? 'USER' : 'ADMIN';

    const now = new Date();

    await prisma.supportMessage.updateMany({
      where: {
        ticketId,
        senderType: whereSenderType,
        readAt: null,
      },
      data: { readAt: now, seenAt: now, status: 'SEEN' },
    });

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: context.isInternalAdmin ? { adminLastSeenAt: now } : { userLastSeenAt: now },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
