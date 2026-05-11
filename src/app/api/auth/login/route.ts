import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  console.log('LOGIN API CALLED');
  
  try {
    const { email, password } = await request.json();
    console.log('Login attempt:', { email, hasPassword: !!password });

    if (!email || !password) {
      console.log('ERROR: Missing email or password');
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Normalize email to lowercase for case-insensitive match
    const normalizedEmail = email.toLowerCase().trim();
    console.log('Normalized email:', normalizedEmail);

    // Check User table only (platform admins use /api/admin/login)
    console.log('Checking User table...');
    const user = await prisma.user.findFirst({
      where: { 
        email: { equals: normalizedEmail, mode: 'insensitive' }
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is inactive. Please contact support.' }, { status: 403 });
    }

    if (!user.password) {
      return NextResponse.json({ error: 'Please set your password first. Use forgot password.' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
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
    };

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      redirectUrl: '/dashboard',
    });

    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    
    if (message.includes('database') || message.includes('Prisma')) {
      return NextResponse.json({ error: 'Database connection failed. Please try again later.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Login failed. Please try again.' }, { status: 500 });
  }
}