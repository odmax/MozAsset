import { NextResponse } from 'next/server';
import { getSimpleAdminSessionFromHeader } from '@/lib/admin-session';
import { getSimpleUserSessionFromHeader } from '@/lib/customer-session';
import { generateCsrfToken, getCsrfCookieOptions } from '@/lib/csrf';

const PAYFAST_LIVE = 'https://www.payfast.co.za';
const PAYFAST_SANDBOX = 'https://sandbox.payfast.co.za';
const PAYFAST_PAYMENT = 'https://payment.payfast.io';

const CSP_DIRECTIVES = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${PAYFAST_LIVE} ${PAYFAST_SANDBOX} https://js.sentry-cdn.com`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' https://fonts.gstatic.com",
  `connect-src 'self' ${PAYFAST_LIVE} ${PAYFAST_SANDBOX} https://sentry.io`,
  `frame-src 'self' ${PAYFAST_LIVE} ${PAYFAST_SANDBOX} ${PAYFAST_PAYMENT}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  `form-action 'self' ${PAYFAST_LIVE} ${PAYFAST_SANDBOX} ${PAYFAST_PAYMENT}`,
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

export async function middleware(request: Request) {
  const url = new URL(request.url);

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

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  const isProtected = url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/onboarding');
  if (isProtected) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
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
