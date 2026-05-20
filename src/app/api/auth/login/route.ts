import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { loginLimiter, bruteForceLimiter } from '@/lib/rate-limiter';
import { generateCsrfToken, getCsrfCookieOptions } from '@/lib/csrf';

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

    const normalizedEmail = email.toLowerCase().trim();
    const loginCheck = loginLimiter.check(`email:${normalizedEmail}`);
    if (!loginCheck.allowed) {
      const msg = 'Too many login attempts. Please try again later.';
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
    });

    if (!user) {
      await logFailedAttempt(normalizedEmail, ip, userAgent, 'user_not_found');
      const msg = 'Invalid email or password';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    if (!user.isActive) {
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
      await logFailedAttempt(normalizedEmail, ip, userAgent, 'no_password_set', user.id);
      const msg = 'Please set your password first. Use forgot password.';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      await logFailedAttempt(normalizedEmail, ip, userAgent, 'invalid_password', user.id);
      const msg = 'Invalid email or password';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    // Successful login — reset rate limiter for this email
    loginLimiter.reset(`email:${normalizedEmail}`);
    bruteForceLimiter.reset(`ip:${ip}`);

    await logSuccessfulLogin(user.id, normalizedEmail, ip, userAgent);

    // Send login alert (non-blocking)
    try {
      const { sendLoginAlertEmail } = await import('@/lib/email');
      const now = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });
      sendLoginAlertEmail(user.email, user.name, ip, now);
    } catch {}

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
      select: { id: true },
    });

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

    const csrfToken = await generateCsrfToken(simpleUserToken);

    const setCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    };

    const csrfCookieOptions = getCsrfCookieOptions();

    if (contentType.includes('application/json')) {
      const response = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
        redirectUrl: '/dashboard',
      });
      response.cookies.set('simpleUserAuth', simpleUserToken, setCookieOptions);
      response.cookies.set('session', sessionToken, setCookieOptions);
      response.cookies.set('csrf-token', csrfToken, csrfCookieOptions);
      return response;
    }

    const dashboardUrl = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(dashboardUrl);
    response.cookies.set('simpleUserAuth', simpleUserToken, setCookieOptions);
    response.cookies.set('session', sessionToken, setCookieOptions);
    response.cookies.set('csrf-token', csrfToken, csrfCookieOptions);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    if (request.headers.get('content-type')?.includes('application/json')) {
      return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
    }
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('error', 'Login failed. Please try again.');
    return NextResponse.redirect(redirectUrl, 303);
  }
}
