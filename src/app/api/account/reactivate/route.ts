import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { reactivateAccount } from '@/lib/inactivity-cleanup';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = getSimpleUserSession();
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, plan: true, isDeactivated: true },
  });

  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  if (!user.isDeactivated) return NextResponse.json({ success: false, error: 'Account is not deactivated' }, { status: 400 });
  if (user.plan !== 'FREE') return NextResponse.json({ success: false, error: 'Only FREE accounts can be reactivated' }, { status: 403 });

  const result = await reactivateAccount(session.userId);
  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error || 'Reactivation failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Account reactivated successfully' });
}
