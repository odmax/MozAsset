import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

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

export async function GET() {
  const user = getSessionUser();
  
  if (!user || !user.isPlatformAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const organizations = await prisma.department.findMany({
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

    const formatted = organizations.map(org => ({
      id: org.id,
      name: org.name,
      code: org.code,
      createdAt: org.createdAt,
      owner: org.manager || { name: null, email: 'Unknown', plan: 'FREE' },
      _count: org._count,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Admin organizations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
  }
}
