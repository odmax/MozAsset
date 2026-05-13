import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export async function PUT() {
  const context = await getCurrentUserContext();
  if (!context?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.notification.updateMany({
    where: { userId: context.userId, isRead: false },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
