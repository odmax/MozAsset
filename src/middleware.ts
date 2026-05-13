import { NextResponse } from 'next/server';
// TEMP_ADMIN_AUTH: simple admin auth until full platform auth is rebuilt.
import { getSimpleAdminSessionFromHeader } from '@/lib/admin-session';
// TEMP_USER_AUTH: simple customer auth until full auth is rebuilt.
import { getSimpleUserSessionFromHeader } from '@/lib/customer-session';
import { generateCsrfToken, getCsrfCookieOptions } from '@/lib/csrf';

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.payfast.co.za https://js.sentry-cdn.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://*.payfast.co.za https://sentry.io",
  "frame-src 'self' https://*.payfast.co.za",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '0',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': CSP_DIRECTIVES,
};

function isMutationMethod(method: string): boolean {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
}

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const method = request.method;

  // Build response
  let response: NextResponse;

  // Skip middleware for login pages and API routes
  if (url.pathname === '/login' || url.pathname === '/admin-login' || url.pathname.startsWith('/api/')) {
    response = NextResponse.next();
  } else {
    const isAdminRoute = url.pathname.startsWith('/admin');

    // Allow non-admin, non-protected routes
    if (!isAdminRoute && !url.pathname.startsWith('/dashboard') && !url.pathname.startsWith('/onboarding')) {
      response = NextResponse.next();
    } else {
      // TEMP_ADMIN_AUTH: check simpleAdminAuth cookie for /admin routes only
      if (isAdminRoute) {
        const cookieHeader = request.headers.get('cookie') || '';
        const adminSession = getSimpleAdminSessionFromHeader(cookieHeader);

        if (adminSession) {
          response = NextResponse.next();
        } else {
          response = NextResponse.redirect(new URL('/admin-login', request.url));
        }
      } else {
        // TEMP_USER_AUTH: check simpleUserAuth cookie for /dashboard and /onboarding
        const cookieHeader = request.headers.get('cookie') || '';
        const userSession = getSimpleUserSessionFromHeader(cookieHeader);

        if (!userSession) {
          response = NextResponse.redirect(new URL('/login', request.url));
        } else {
          response = NextResponse.next();
        }
      }
    }
  }

  // Add security headers to all responses
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Add CSRF token cookie if user has a session (for client-side JS to read)
  // Only set the CSRF cookie on non-API page responses
  if (!url.pathname.startsWith('/api/')) {
    const cookieHeader = request.headers.get('cookie') || '';
    const userSession = getSimpleUserSessionFromHeader(cookieHeader);
    const adminSession = getSimpleAdminSessionFromHeader(cookieHeader);

    const sessionValue =
      parseCookie(cookieHeader, 'session') ||
      parseCookie(cookieHeader, 'simpleUserAuth') ||
      parseCookie(cookieHeader, 'simpleAdminAuth');

    if (sessionValue) {
      const csrfToken = await generateCsrfToken(sessionValue);
      const csrfOptions = getCsrfCookieOptions();
      response.cookies.set('csrf-token', csrfToken, csrfOptions);
    }
  }

  return response;
}

function parseCookie(cookieHeader: string, name: string): string | null {
  const parsed: Record<string, string> = {};
  cookieHeader.split(';').forEach((c) => {
    const trimmed = c.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      parsed[trimmed.substring(0, eqIndex)] = trimmed.substring(eqIndex + 1);
    }
  });
  return parsed[name] || null;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
