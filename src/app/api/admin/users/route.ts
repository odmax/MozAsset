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

export async function GET() {
  const sessionUser = getSessionUser();
  const adminUser = getAdminSession();
  
  console.log('[admin-users] Session user:', sessionUser?.email, 'isPlatformAdmin:', sessionUser?.isPlatformAdmin);
  console.log('[admin-users] Admin user:', adminUser?.email, 'isInternalAdmin:', adminUser?.isInternalAdmin);
  
  if (!sessionUser?.isPlatformAdmin && !adminUser?.isInternalAdmin) {
    console.log('[admin-users] Unauthorized - no valid admin session');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    console.log('[admin-users] Fetching all users from database...');
    
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        department: { select: { name: true } },
      },
    });

    console.log('[admin-users] Found users:', users.length);
    console.log('[admin-users] First few emails:', users.slice(0, 3).map(u => u.email));

    return NextResponse.json(users);
  } catch (error) {
    console.error('[admin-users] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}
