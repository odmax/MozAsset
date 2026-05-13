import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

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

    await prisma.supportMessage.updateMany({
      where: {
        ticketId,
        senderType: whereSenderType,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark read error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
