import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const adminCookie = cookies().get('adminSession');
    if (!adminCookie?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let admin;
    try { admin = JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8')); }
    catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    if (!admin.isInternalAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.id },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticketId } = await params;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get('since');

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    const newMessages = since
      ? await prisma.supportMessage.findMany({
          where: { ticketId, senderType: 'USER', createdAt: { gt: new Date(since) } },
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const isTyping = ticket.userTypingAt
      ? (Date.now() - ticket.userTypingAt.getTime()) < 4000
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
      userTyping: isTyping,
      ticketStatus: ticket.status,
    });
  } catch (error) {
    console.error('Admin poll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
