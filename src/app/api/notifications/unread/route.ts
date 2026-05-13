import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export async function GET() {
  const context = await getCurrentUserContext();
  if (!context?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const count = await prisma.notification.count({
    where: { userId: context.userId, isRead: false },
  });

  return NextResponse.json({ count });
}
