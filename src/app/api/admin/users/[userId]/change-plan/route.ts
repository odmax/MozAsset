import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import type { Plan } from '@prisma/client';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  if (sessionCookie?.value) {
    try {
      return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

function getAdminSession() {
  const adminCookie = cookies().get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const sessionUser = getSessionUser();
  const adminUser = getAdminSession();
  
  // Check both session formats
  const isPlatformAdmin = sessionUser?.isPlatformAdmin === true;
  const isInternalAdmin = adminUser?.isInternalAdmin === true || sessionUser?.isInternalAdmin === true;
  
  if (!isPlatformAdmin && !isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { plan } = body;

    if (!plan || !['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: { 
        plan: plan as Plan,
      },
    });

    createNotification({
      userId: params.userId,
      type: 'PLAN_UPGRADED',
      title: plan === 'FREE' ? 'Plan Downgraded' : 'Plan Upgraded',
      message: plan === 'FREE'
        ? 'Your plan has been changed to Free by an administrator'
        : `Your plan has been upgraded to ${plan} by an administrator`,
      link: '/billing',
      actorId: sessionUser?.id || adminUser?.id,
    }).catch((err) => console.error('Failed to create notification:', err));

    return NextResponse.json({ success: true, plan: updated.plan });
  } catch (error) {
    console.error('[change-plan] Error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}