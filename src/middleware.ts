import { NextResponse } from 'next/server';
// TEMP_ADMIN_AUTH: simple admin auth until full platform auth is rebuilt.
import { getSimpleAdminSessionFromHeader } from '@/lib/admin-session';

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
      console.log('MIDDLEWARE: simpleAdminAuth VALID, allowing /admin');
      return NextResponse.next();
    }

    console.log('MIDDLEWARE: no simpleAdminAuth, redirecting to /admin-login');
    return NextResponse.redirect(new URL('/admin-login', request.url));
  }

  // For /dashboard and /onboarding: check customer session
  const cookieHeader = request.headers.get('cookie') || '';
  const parsed: Record<string, string> = {};
  cookieHeader.split(';').forEach(c => {
    const trimmed = c.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      parsed[trimmed.substring(0, eqIndex)] = trimmed.substring(eqIndex + 1);
    }
  });

  const sessionCookie = parsed['session'];
  let valid = false;

  if (sessionCookie) {
    try {
      const session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
      if (session?.id) valid = true;
    } catch {}
  }

  if (!valid) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/admin/:path*'],
};
