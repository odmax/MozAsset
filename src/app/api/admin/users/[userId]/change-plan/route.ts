import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import type { Plan } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const user = getSessionUser();
  
  if (!user || !user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { plan } = await request.json();

    if (!['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
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
        subscriptionStatus: plan === 'FREE' ? 'ACTIVE' as any : 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, plan: updated.plan });
  } catch (error) {
    console.error('Change user plan error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}

function getSessionUser() {
  const sessionCookie = cookies().get('session');
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
