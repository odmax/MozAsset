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
  const user = getSessionUser();
  const admin = getAdminSession();
  
  if (!user?.isPlatformAdmin && !admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const departments = await prisma.department.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        code: true,
        createdAt: true,
        manager: {
          select: {
            name: true,
            email: true,
            plan: true,
          },
        },
        _count: {
          select: {
            users: true,
            assets: true,
            locations: true,
          },
        },
      },
    });

    const formatted = departments.map(dept => ({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      createdAt: dept.createdAt,
      owner: dept.manager || { name: null, email: 'Unknown', plan: 'FREE' },
      _count: dept._count,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Admin organizations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}
