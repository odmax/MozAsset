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
  console.log('URL:', url.pathname);
  console.log('isAdminRoute:', isAdminRoute);
  console.log('Cookie header length:', cookieHeader.length);
  
  const adminSession = getAdminSessionFromHeader(cookieHeader);
  console.log('Admin session found:', !!adminSession);
  if (adminSession) {
    console.log('Admin session valid:', { id: adminSession.id, email: adminSession.email, sessionType: adminSession.sessionType });
  }
  
  if (adminSession) {
    // Platform admin - only allow /admin routes
    if (isAdminRoute) return NextResponse.next();
    // If on login page, redirect to admin
    if (url.pathname === '/login' || url.pathname === '/admin-login') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Check for customer session
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const trimmed = cookie.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const name = trimmed.substring(0, eqIndex);
      const value = trimmed.substring(eqIndex + 1);
      cookies[name] = value;
    }
  });

  const sessionCookie = cookies['session'];
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
    // If this was an admin route, redirect to admin-login
    if (isAdminRoute) {
      return NextResponse.redirect(new URL('/admin-login', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Customer user - allow /dashboard and /onboarding
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/admin/:path*'],
};