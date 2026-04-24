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

    if (!plan || !['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
      console.log('[change-plan] Invalid plan:', plan);
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Find target user first
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!targetUser) {
      console.log('[change-plan] User not found:', params.userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[change-plan] Current plan:', targetUser.plan, '-> New plan:', plan);

    // Update user plan
    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: { 
        plan: plan as Plan,
        subscriptionStatus: plan === 'FREE' ? 'ACTIVE' : 'ACTIVE',
      },
    });

    console.log('[change-plan] Successfully updated to:', updated.plan);

    return NextResponse.json({ success: true, plan: updated.plan });
  } catch (error) {
    console.error('[change-plan] Error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}
