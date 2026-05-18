import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/email';
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

export async function GET(
  request: Request,
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
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        category: ticket.category,
        status: ticket.status,
        priority: ticket.priority,
      },
      messages: ticket.messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
      })),
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
    const { ticketId } = await params;
    const { message } = await request.json();
    const admin = getAdminSession();
    if (!admin || !admin.isInternalAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.id },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:reply')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketMessage = await prisma.supportMessage.create({
      data: {
        ticketId,
        senderType: 'ADMIN',
        senderAdminId: admin.id,
        message,
      },
    });

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'PENDING',
        assignedAdminId: admin.id,
        updatedAt: new Date(),
      },
    });

    // Send email and in-app notification to customer
    sendEmail({
      to: ticket.user.email,
      subject: `Re: ${ticket.subject} — Support Update`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #333;">Support Update</h2>
          <p>Hi ${ticket.user.name || 'there'},</p>
          <p>Your support ticket <strong>"${ticket.subject}"</strong> has received a reply:</p>
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 0; white-space: pre-wrap;">${message}</p>
          </div>
          <p>Reply in-app or create a new ticket for further assistance.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #888; font-size: 12px;">MozAsset Support Team</p>
        </div>
      `,
    }).catch((err) => console.error('Failed to send support email:', err));

    createNotification({
      userId: ticket.user.id,
      type: 'SUPPORT_REPLY',
      title: 'Support Ticket Update',
      message: `Admin replied to "${ticket.subject}"`,
      link: `/dashboard/support?ticket=${ticketId}`,
      actorId: admin.id,
    }).catch((err) => console.error('Failed to create notification:', err));

    return NextResponse.json({
      ...ticketMessage,
      ticketSubject: ticket.subject,
      ticketStatus: 'PENDING',
    });
  } catch (error) {
    console.error('Reply error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}