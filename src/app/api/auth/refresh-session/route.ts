import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, plan: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const simpleUserData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      organizationId: user.organizationId,
      isUser: true,
    };

    const simpleUserToken = Buffer.from(JSON.stringify(simpleUserData)).toString('base64');

    const response = NextResponse.json({ success: true, plan: user.plan });

    response.cookies.set('simpleUserAuth', simpleUserToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Refresh session error:', error);
    return NextResponse.json({ error: 'Failed to refresh session' }, { status: 500 });
  }
}
