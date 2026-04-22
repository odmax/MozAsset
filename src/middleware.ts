import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return { ...JSON.parse(decoded), type: 'user' };
    } catch {
      return null;
    }
  }
  
  return null;
}

function getAdminSession() {
  const sessionCookie = cookies().get('adminSession');
  
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return { ...JSON.parse(decoded), type: 'admin' };
    } catch {
      return null;
    }
  }
  
  return null;
}

export async function middleware(request: Request) {
  const url = request.url;
  const user = getSessionUser();
  const admin = getAdminSession();

  const requestUrl = new URL(url);
  const isAdminRoute = requestUrl.pathname.startsWith('/admin');
  const isDashboardRoute = url.includes('/dashboard');
  const isOnboardingRoute = url.includes('/onboarding');

  if (isAdminRoute) {
    if (!admin || !admin.isInternalAdmin) {
      return NextResponse.redirect(new URL('/login', url));
    }
    return NextResponse.next();
  }

  if (isDashboardRoute || isOnboardingRoute) {
    if (!user && !admin) {
      return NextResponse.redirect(new URL('/login', url));
    }

    if (admin && admin.isInternalAdmin) {
      return NextResponse.redirect(new URL('/admin', url));
    }

    if (!user) {
      return NextResponse.redirect(new URL('/login', url));
    }

    if (user.isPlatformAdmin) {
      return NextResponse.redirect(new URL('/admin', url));
    }

    if (isOnboardingRoute && user.onBoardingComplete) {
      return NextResponse.redirect(new URL('/dashboard', url));
    }

    if (isDashboardRoute && !user.onBoardingComplete) {
      return NextResponse.redirect(new URL('/onboarding', url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/admin/:path*'],
};