import { NextResponse } from 'next/server';
import { getSimpleAdminSessionFromHeader } from '@/lib/admin-session';
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

const UNVERIFIED_ALLOWED = [
  '/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/verify-email',
  '/api/auth/logout',
  '/logout',
];

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const method = request.method;

  let response: NextResponse;

  if (url.pathname === '/login' || url.pathname === '/admin-login' || url.pathname.startsWith('/api/')) {
    response = NextResponse.next();
  } else {
    const isAdminRoute = url.pathname.startsWith('/admin');

    if (!isAdminRoute && !url.pathname.startsWith('/dashboard') && !url.pathname.startsWith('/onboarding')) {
      response = NextResponse.next();
    } else {
      if (isAdminRoute) {
        const cookieHeader = request.headers.get('cookie') || '';
        const adminSession = getSimpleAdminSessionFromHeader(cookieHeader);

        if (adminSession) {
          response = NextResponse.next();
        } else {
          response = NextResponse.redirect(new URL('/admin-login', request.url));
        }
      } else {
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

  if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/onboarding')) {
    const cookieHeader = request.headers.get('cookie') || '';
    const userSession = getSimpleUserSessionFromHeader(cookieHeader);

    if (userSession && userSession.emailVerified === false) {
      const allowed = UNVERIFIED_ALLOWED.some((p) => url.pathname.startsWith(p));
      if (!allowed) {
        const verifyUrl = new URL('/verify-email/pending', request.url);
        response = NextResponse.redirect(verifyUrl);
        return response;
      }
    }
  }

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  if (!url.pathname.startsWith('/api/')) {
    const cookieHeader = request.headers.get('cookie') || '';
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|favicon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
