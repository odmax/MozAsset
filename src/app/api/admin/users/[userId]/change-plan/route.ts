import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import type { Plan } from '@prisma/client';

export const dynamic = 'force-dynamic';

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

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const user = getSessionUser();
  
  console.log('[change-plan] Session user:', user?.email, 'isPlatformAdmin:', user?.isPlatformAdmin);
  
  if (!user || !user.isPlatformAdmin) {
    console.log('[change-plan] Unauthorized access');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { plan } = body;

    console.log('[change-plan] Request body:', body);
    console.log('[change-plan] Target user ID:', params.userId);

    if (!['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[change-plan] Current plan:', targetUser.plan, 'New plan:', plan);

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: { 
        plan: plan as Plan,
      },
    });

    console.log('[change-plan] Updated plan:', updated.plan);

    return NextResponse.json({ success: true, plan: updated.plan });
  } catch (error) {
    console.error('[change-plan] Error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}
