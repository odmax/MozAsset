import { NextResponse } from 'next/server';
// TEMP_ADMIN_AUTH: simple admin auth until full platform auth is rebuilt.
import { getSimpleAdminSessionFromHeader } from '@/lib/admin-session';
// TEMP_USER_AUTH: simple customer auth until full auth is rebuilt.
import { getSimpleUserSessionFromHeader } from '@/lib/customer-session';

export async function middleware(request: Request) {
  const url = new URL(request.url);

  // Skip middleware for login pages and API routes
  if (url.pathname === '/login' || url.pathname === '/admin-login' || url.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const isAdminRoute = url.pathname.startsWith('/admin');

  // Allow non-admin, non-protected routes
  if (!isAdminRoute && !url.pathname.startsWith('/dashboard') && !url.pathname.startsWith('/onboarding')) {
    return NextResponse.next();
  }

  // TEMP_ADMIN_AUTH: check simpleAdminAuth cookie for /admin routes only
  if (isAdminRoute) {
    const cookieHeader = request.headers.get('cookie') || '';
    const adminSession = getSimpleAdminSessionFromHeader(cookieHeader);

    if (adminSession) {
      return NextResponse.next();
    }

    return NextResponse.redirect(new URL('/admin-login', request.url));
  }

  // TEMP_USER_AUTH: check simpleUserAuth cookie for /dashboard and /onboarding
  const cookieHeader = request.headers.get('cookie') || '';
  const userSession = getSimpleUserSessionFromHeader(cookieHeader);

  if (!userSession) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/admin/:path*'],
};
