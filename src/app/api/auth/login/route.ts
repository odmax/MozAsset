import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';

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

    const user = await prisma.user.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: 'insensitive' },
      },
    });

    if (!user) {
      const msg = 'Invalid email or password';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    if (!user.isActive) {
      const msg = 'Account is inactive. Please contact support.';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 403 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
    }

    if (!user.password) {
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
      const msg = 'Invalid email or password';
      if (contentType.includes('application/json')) {
        return NextResponse.json({ error: msg }, { status: 401 });
      }
      const redirectUrl = new URL('/login', request.url);
      redirectUrl.searchParams.set('error', msg);
      return NextResponse.redirect(redirectUrl, 303);
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

    // TEMP_USER_AUTH: simple user auth cookie
    const simpleUserData = {
      userId: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan,
      organizationId: user.organizationId,
      isUser: true,
    };

    const simpleUserToken = Buffer.from(JSON.stringify(simpleUserData)).toString('base64');

    const setCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    };

    if (contentType.includes('application/json')) {
      const response = NextResponse.json({
        success: true,
        user: { id: user.id, email: user.email, name: user.name },
        redirectUrl: '/dashboard',
      });
      response.cookies.set('simpleUserAuth', simpleUserToken, setCookieOptions);
      response.cookies.set('session', sessionToken, setCookieOptions);
      return response;
    }

    const dashboardUrl = new URL('/dashboard', request.url);
    const response = NextResponse.redirect(dashboardUrl);
    response.cookies.set('simpleUserAuth', simpleUserToken, setCookieOptions);
    response.cookies.set('session', sessionToken, setCookieOptions);
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
