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

export async function GET() {
  const user = getSessionUser();
  
  if (!user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        appearanceMode: true,
        themeColor: true,
      },
    });

    return NextResponse.json({
      theme: dbUser?.appearanceMode?.toLowerCase() || 'system',
      themeColor: dbUser?.themeColor || null,
    });
  } catch (error) {
    console.error('Theme GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}