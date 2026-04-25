import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import type { Plan } from '@prisma/client';

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
  
  console.log('[change-plan] Auth check:', { isPlatformAdmin, isInternalAdmin });
  
  if (!isPlatformAdmin && !isInternalAdmin) {
    console.log('[change-plan] Unauthorized access');
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

    console.log('[change-plan] Updated plan:', updated.plan);

    return NextResponse.json({ success: true, plan: updated.plan });
  } catch (error) {
    console.error('[change-plan] Error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}