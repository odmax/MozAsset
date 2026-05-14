import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext();
    if (!context || !context.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subject, category, message } = await request.json();

    if (!subject || !message) {
      return NextResponse.json({ error: 'Subject and message required' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: context.userId,
        organizationId: context.isInternalAdmin ? null : context.organizationId,
        subject,
        category,
        status: 'OPEN',
        priority: 'MEDIUM',
        messages: {
          create: {
            senderType: 'USER',
            senderUserId: context.userId,
            message,
          },
        },
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const context = await getCurrentUserContext();
    if (!context || !context.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where: any = { userId: context.userId };
    if (!context.isInternalAdmin) {
      where.organizationId = context.organizationId || 'never-match';
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            messages: {
              where: {
                senderType: 'ADMIN',
                readAt: null,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      category: t.category,
      status: t.status,
      priority: t.priority,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      lastMessage: t.messages[0] ? {
        message: t.messages[0].message,
        senderType: t.messages[0].senderType,
        createdAt: t.messages[0].createdAt.toISOString(),
      } : null,
      unreadCount: t._count.messages,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
