import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUserContext } from '@/lib/user-context';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = await getCurrentUserContext();
  if (!context?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const notification = await prisma.notification.findFirst({
    where: { id, userId: context.userId },
  });

  if (!notification) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await prisma.notification.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
