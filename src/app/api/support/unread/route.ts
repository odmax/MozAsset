import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export async function GET() {
  try {
    const context = await getCurrentUserContext();
    if (!context || !context.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unreadCount = await prisma.supportMessage.count({
      where: {
        ticket: {
          userId: context.userId,
          organizationId: context.isInternalAdmin ? undefined : (context.organizationId || 'never-match'),
        },
        senderType: 'ADMIN',
        readAt: null,
      },
    });

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error('Unread count error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
