import { cookies } from 'next/headers';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Derive a CSRF token from the session value using HMAC-SHA256.
 * Uses Web Crypto API for Edge Runtime compatibility.
 */
async function deriveToken(sessionValue: string): Promise<string> {
  const secret = process.env.CSRF_SECRET || 'change-me-in-production';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(sessionValue);

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hex;
}

/**
 * Set the CSRF cookie (for use when setting session cookies after login).
 * The cookie is set as a non-httpOnly cookie so client-side JS can read it.
 */
export function getCsrfCookieOptions() {
  return {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  };
}

/**
 * Generate a CSRF token based on the current session cookie value.
 */
export async function generateCsrfToken(sessionValue: string): Promise<string> {
  return deriveToken(sessionValue);
}

/**
 * Verify that the CSRF token in the request header matches the session.
 * Call this on POST/PUT/DELETE endpoints.
 */
export async function validateCsrf(request: Request): Promise<boolean> {
  const method = request.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session')?.value;
  const simpleUserAuthCookie = cookieStore.get('simpleUserAuth')?.value;

  const sessionValue = sessionCookie || simpleUserAuthCookie;
  if (!sessionValue) {
    return false;
  }

  const expectedToken = await deriveToken(sessionValue);
  const providedToken = request.headers.get(CSRF_HEADER_NAME);

  if (!providedToken || expectedToken.length !== providedToken.length) {
    return false;
  }

  // Constant-time comparison
  const expectedBuf = new Uint8Array(expectedToken.length);
  const providedBuf = new Uint8Array(providedToken.length);
  for (let i = 0; i < expectedToken.length; i++) {
    expectedBuf[i] = expectedToken.charCodeAt(i);
    providedBuf[i] = providedToken.charCodeAt(i);
  }

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode('comparison-key'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const expectedSig = await crypto.subtle.sign('HMAC', key, expectedBuf);
    const providedSig = await crypto.subtle.sign('HMAC', key, providedBuf);
    if (expectedSig.byteLength !== providedSig.byteLength) return false;
    const expArr = new Uint8Array(expectedSig);
    const provArr = new Uint8Array(providedSig);
    return expArr.every((val, i) => val === provArr[i]);
  } catch {
    return expectedToken === providedToken;
  }
}

export { CSRF_COOKIE_NAME, CSRF_HEADER_NAME };
