import { NextResponse } from 'next/server';
import type { Role, Plan } from '@prisma/client';

interface UserSession {
  userId: string;
  name: string | null;
  email: string;
  organizationId: string | null;
  role: Role;
  plan: Plan;
  isPlatformAdmin: boolean;
  isInternalAdmin: boolean;
}

function parseSessionCookie(cookieValue: string): UserSession | null {
  try {
    const session = JSON.parse(Buffer.from(cookieValue, 'base64').toString('utf-8'));
    if (session?.id) {
      return {
        userId: session.id,
        name: session.name || null,
        email: session.email || '',
        organizationId: session.organizationId || null,
        role: session.role || 'EMPLOYEE',
        plan: session.plan || 'FREE',
        isPlatformAdmin: session.isPlatformAdmin || false,
        isInternalAdmin: session.isInternalAdmin || false,
      };
    }
  } catch {}
  return null;
}

export async function middleware(request: Request) {
  const url = new URL(request.url);

  const isAdminRoute = url.pathname.startsWith('/admin');
  const isDashboardRoute = url.pathname.startsWith('/dashboard');
  const isOnboardingRoute = url.pathname.startsWith('/onboarding');

  // Allow public routes
  if (!isAdminRoute && !isDashboardRoute && !isOnboardingRoute) {
    return NextResponse.next();
  }

  // Get session from cookie (middleware uses request.cookies, not next/headers)
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name && value) cookies[name] = value;
  });

  const sessionCookie = cookies['session'];
  const adminCookie = cookies['adminSession'];

  let user: UserSession | null = null;

  if (sessionCookie) {
    user = parseSessionCookie(sessionCookie);
  }

  if (!user && adminCookie) {
    user = parseSessionCookie(adminCookie);
    if (user) {
      user.isInternalAdmin = true;
      user.role = 'SUPER_ADMIN' as Role;
      user.plan = 'ENTERPRISE' as Plan;
    }
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user.isInternalAdmin) {
    if (isAdminRoute) return NextResponse.next();
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (user.isPlatformAdmin) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // For regular users, check onboarding status from session
  // The session cookie already contains onBoardingComplete
  const sessionData = sessionCookie ? JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8')) : null;
  const onBoardingComplete = sessionData?.onBoardingComplete || false;

  if (isOnboardingRoute && onBoardingComplete) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isDashboardRoute && !onBoardingComplete) {
    return NextResponse.redirect(new URL('/onboarding', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/admin/:path*'],
};