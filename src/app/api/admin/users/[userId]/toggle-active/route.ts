import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

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
  
  console.log('[toggle-active] Auth check:', { isPlatformAdmin, isInternalAdmin });
  
  if (!isPlatformAdmin && !isInternalAdmin) {
    console.log('[toggle-active] Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: { isActive: !targetUser.isActive },
    });

    return NextResponse.json({ success: true, isActive: updated.isActive });
  } catch (error) {
    console.error('[toggle-active] Error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}