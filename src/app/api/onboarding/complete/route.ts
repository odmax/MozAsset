import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

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

export async function POST(request: Request) {
  try {
    const user = getSessionUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user to check if they have an organization
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true },
    });

    // If user has no organization, they still need setup (but mark onboarding as complete)
    // The dashboard will show a "repair setup" message
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { onBoardingComplete: true },
      select: { id: true, email: true, name: true, role: true, plan: true, assetLimit: true, onBoardingComplete: true, organizationId: true },
    });

    // Build new session with updated data from DB (including organizationId)
    const newSessionData = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name || '',
      role: String(updatedUser.role),
      plan: String(updatedUser.plan),
      assetLimit: updatedUser.assetLimit,
      onBoardingComplete: true,
      isPlatformAdmin: false,
      organizationId: updatedUser.organizationId,
    };

    const newSessionToken = Buffer.from(JSON.stringify(newSessionData)).toString('base64');

    const response = NextResponse.json({ success: true, redirect: '/dashboard' });

    response.cookies.set('session', newSessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Onboarding complete error:', error);
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 });
  }
}