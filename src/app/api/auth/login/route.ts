import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { loginLimiter, bruteForceLimiter } from '@/lib/rate-limiter';
import { generateCsrfToken, getCsrfCookieOptions } from '@/lib/csrf';
import { normalizeEmail } from '@/lib/email-normalize';

export const dynamic = 'force-dynamic';

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

async function logFailedAttempt(email: string, ip: string, userAgent: string, reason: string, userId?: string) {
  try {
    const metadata: Record<string, unknown> = { email, ip, userAgent, reason };
    const data: Record<string, unknown> = {
      action: 'LOGIN_FAILED',
      entityType: 'User',
      entityId: userId || email,
      userId: userId || 'unknown',
      metadata,
      ipAddress: ip,
      userAgent,
    };
    await prisma.auditLog.create({ data: data as any });
  } catch (err) {
    console.error('Failed to log login attempt:', err);
  }
}

async function logSuccessfulLogin(userId: string, email: string, ip: string, userAgent: string) {
  try {
    await prisma.auditLog.create({
      data: {
        action: 'LOGIN_SUCCESS',
        entityType: 'User',
        entityId: userId,
        userId,
        metadata: { email, ip, userAgent },
        ipAddress: ip,
        userAgent,
      } as any,
    });
  } catch (err) {
    console.error('Failed to log successful login:', err);
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const ip = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Apply brute force check by IP
    const bruteCheck = bruteForceLimiter.check(`ip:${ip}`);
    if (!bruteCheck.allowed) {
      const msg = 'Too many login attempts. Please try again later.';
      await logFailedAttempt('unknown', ip, userAgent, 'brute_force_ip_blocked');
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg, retryAfter: bruteCheck.retryAfter }, { status: 429 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    // Apply per-email rate limiting (token bucket)
    let email: string, password: string;

    if (contentType.includes('application/json')) {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } else {
      const formData = await request.formData();
      email = formData.get('email') as string;
      password = formData.get('password') as string;
    }

    if (!email || !password) {
      const msg = 'Email and password required';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    const normalizedEmail = normalizeEmail(email);
    console.log('[LOGIN] normalizedEmail:', normalizedEmail);
    const loginCheck = loginLimiter.check(`email:${normalizedEmail}`);
    if (!loginCheck.allowed) {
      const msg = 'Too many login attempts. Please try again later.';
      console.log('[LOGIN] rate_limited for:', normalizedEmail);
      await logFailedAttempt(normalizedEmail, ip, userAgent, 'rate_limited');
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg, retryAfter: loginCheck.retryAfter }, { status: 429 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        plan: true,
        assetLimit: true,
        onBoardingComplete: true,
        organizationId: true,
        isActive: true,
        isPlatformAdmin: true,
      },
    });
    console.log('[LOGIN] userFound:', !!user);

    if (!user) {
      console.log('[LOGIN] user_not_found for:', normalizedEmail);
      await logFailedAttempt(normalizedEmail, ip, userAgent, 'user_not_found');
      const msg = 'Invalid email or password';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    console.log('[LOGIN] isActive:', user.isActive, 'hasPassword:', !!user.password, 'role:', user.role, 'plan:', user.plan);

    if (!user.isActive) {
      console.log('[LOGIN] account_inactive for:', normalizedEmail);
      await logFailedAttempt(normalizedEmail, ip, userAgent, 'account_inactive', user.id);
      const msg = 'Account is inactive. Please contact support.';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 403 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    if (!user.password) {
      console.log('[LOGIN] no_password_set for:', normalizedEmail);
      await logFailedAttempt(normalizedEmail, ip, userAgent, 'no_password_set', user.id);
      const msg = 'Please set your password first. Use forgot password.';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    let isValid = false;
    try {
      isValid = await bcrypt.compare(password, user.password);
      console.log('[LOGIN] passwordValid:', isValid);
    } catch (compareErr: any) {
      console.error('[LOGIN] bcrypt.compare threw:', compareErr.message);
      throw compareErr;
    }

    if (!isValid) {
      console.log('[LOGIN] invalid_password for:', normalizedEmail);
      await logFailedAttempt(normalizedEmail, ip, userAgent, 'invalid_password', user.id);
      const msg = 'Invalid email or password';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    console.log('[LOGIN] password OK, setting cookies and redirecting to dashboard');
    // Successful login — reset rate limiter for this email
    loginLimiter.reset(`email:${normalizedEmail}`);
    bruteForceLimiter.reset(`ip:${ip}`);

    await logSuccessfulLogin(user.id, normalizedEmail, ip, userAgent);

    // Send login alert (non-blocking)
    try {
      const { sendLoginAlertEmail } = await import('@/lib/email');
      const now = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
      sendLoginAlertEmail(user.email, user.name, ip, now);
    } catch (alertErr: any) {
      console.error('[LOGIN] login alert email failed (non-blocking):', alertErr.message);
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
        select: { id: true },
      });
      console.log('[LOGIN] lastActiveAt updated');
    } catch (updateErr: any) {
      console.error('[LOGIN] lastActiveAt update failed (non-blocking):', updateErr.message);
    }

    const sessionData = {
      id: user.id,
      email: String(user.email),
      name: String(user.name || ''),
      role: String(user.role),
      plan: String(user.plan),
      assetLimit: Number(user.assetLimit),
      onBoardingComplete: Boolean(user.onBoardingComplete),
      organizationId: user.organizationId,
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
    };

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const simpleUserData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      organizationId: user.organizationId,
      isUser: true,
    };

    const simpleUserToken = Buffer.from(JSON.stringify(simpleUserData)).toString('base64');

    let csrfToken = '';
    try {
      csrfToken = await generateCsrfToken(simpleUserToken);
      console.log('[LOGIN] csrfToken generated, length:', csrfToken.length);
    } catch (csrfErr: any) {
      console.error('[LOGIN] generateCsrfToken threw:', csrfErr.message);
      throw csrfErr;
    }

    const setCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    };

    const csrfCookieOptions = getCsrfCookieOptions();

    if (contentType.includes('application/json')) {
      console.log('[LOGIN] returning JSON success');
      const response = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
        redirectUrl: '/dashboard',
      });
      response.cookies.set('simpleUserAuth', simpleUserToken, setCookieOptions);
      response.cookies.set('session', sessionToken, setCookieOptions);
      response.cookies.set('csrf-token', csrfToken, csrfCookieOptions);
      console.log('[LOGIN] cookies set on JSON response: simpleUserAuth, session, csrf-token');
      return response;
    }

    console.log('[LOGIN] returning redirect to /dashboard');
    const dashboardUrl = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(dashboardUrl);
    response.cookies.set('simpleUserAuth', simpleUserToken, setCookieOptions);
    response.cookies.set('session', sessionToken, setCookieOptions);
    response.cookies.set('csrf-token', csrfToken, csrfCookieOptions);
    console.log('[LOGIN] cookies set on redirect: simpleUserAuth, session, csrf-token');
    return response;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('[LOGIN] CAUGHT ERROR:', errorName, errorMessage, error instanceof Error ? error.stack : '');
    const msg = 'Something went wrong on our end. Please try again. If the problem persists, contact support.';
    if (request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('error', msg);
    return NextResponse.redirect(redirectUrl, 303);
  }
}
