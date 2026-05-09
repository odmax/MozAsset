import { NextResponse } from 'next/server';
import { getAdminSessionFromHeader } from '@/lib/admin-session';

interface UserSession {
  userId: string;
  name: string | null;
  email: string;
  organizationId: string | null;
  role: string;
  plan: string;
  isInternalAdmin: boolean;
}

export async function middleware(request: Request) {
  const url = new URL(request.url);
  
  // Skip middleware for login pages and API routes to prevent loops
  if (url.pathname === '/login' || url.pathname === '/admin-login' || url.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const isAdminRoute = url.pathname.startsWith('/admin');
  const isDashboardRoute = url.pathname.startsWith('/dashboard');
  const isOnboardingRoute = url.pathname.startsWith('/onboarding');

  // Allow public routes
  if (!isAdminRoute && !isDashboardRoute && !isOnboardingRoute) {
    return NextResponse.next();
  }

  // Check for admin session first (platform admins)
  const cookieHeader = request.headers.get('cookie') || '';
  console.log('=== MIDDLEWARE ===');
  console.log('1. URL:', url.pathname);
  console.log('2. isAdminRoute:', isAdminRoute);
  console.log('3. Cookie header:', cookieHeader ? cookieHeader.substring(0, 200) + '...' : '(empty)');
  
  // Extract cookie names for debugging
  const rawCookies: Record<string, string> = {};
  cookieHeader.split(';').forEach((c: string) => {
    const trimmed = c.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      rawCookies[trimmed.substring(0, eqIndex)] = trimmed.substring(eqIndex + 1);
    }
  });
  console.log('4. Cookie names found:', Object.keys(rawCookies));
  console.log('5. Has adminSession cookie:', 'adminSession' in rawCookies);
  
  const adminSession = getAdminSessionFromHeader(cookieHeader);
  console.log('6. getAdminSessionFromHeader() found:', !!adminSession);
  if (adminSession) {
    console.log('7. Admin session:', { id: adminSession.id?.substring(0, 8) + '...', email: adminSession.email, sessionType: adminSession.sessionType });
  }
  
  if (adminSession) {
    // Platform admin - only allow /admin routes
    if (isAdminRoute) {
      console.log('8. ALLOW: admin session valid for admin route');
      return NextResponse.next();
    }
    // If on login page, redirect to admin
    console.log('8. REDIRECT: admin on non-admin page → /admin');
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Check for customer session
  const sessionCookie = rawCookies['session'];
  let user: UserSession | null = null;

  if (sessionCookie) {
    try {
      const session = JSON.parse(Buffer.from(sessionCookie, 'base64').toString('utf-8'));
      if (session?.id) {
        user = {
          userId: session.id,
          name: session.name || null,
          email: session.email || '',
          organizationId: session.organizationId || null,
          role: session.role || 'EMPLOYEE',
          plan: session.plan || 'FREE',
          isInternalAdmin: false,
        };
      }
    } catch {}
  }

  if (!user) {
    if (isAdminRoute) {
      console.log('9. REDIRECT: no admin session + no customer session → /admin-login');
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
    console.log('9. REDIRECT: no session → /login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Customer user - allow /dashboard and /onboarding
  console.log('10. ALLOW: customer session for non-admin route');
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/admin/:path*'],
};