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

    // 1. Check InternalAdmin table first (platform admins)
    console.log('Checking InternalAdmin table...');
    const admin = await prisma.internalAdmin.findFirst({
      where: { 
        email: { equals: normalizedEmail, mode: 'insensitive' }
      },
    });
    console.log('Admin found:', !!admin, admin?.email);

    if (admin && admin.isActive) {
      console.log('Admin found, checking password...');
      const isValid = await bcrypt.compare(password, admin.password);
      console.log('Password valid:', isValid);

      if (isValid) {
        console.log('Password valid, creating session...');
        await prisma.internalAdmin.update({
          where: { id: admin.id },
          data: { lastLogin: new Date() },
        });

        const sessionData = {
          id: admin.id,
          email: String(admin.email),
          name: String(admin.name || ''),
          role: String(admin.role),
          sessionType: 'admin',
          isInternalAdmin: true,
        };

        const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');
        console.log('Session token created, setting cookie...');
        console.log('Session token (first 50 chars):', sessionToken.substring(0, 50) + '...');
        
        const response = NextResponse.json({
          success: true,
          user: {
            id: admin.id,
            email: admin.email,
            name: admin.name,
          },
          redirectUrl: '/admin',
        });
        
        response.cookies.set('adminSession', sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
          path: '/',
        });
        
        console.log('Cookie set, response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
        console.log('Login successful, returning response with adminSession cookie');
        return response;
      } else {
        console.log('Password invalid');
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
      }
    }

    if (admin && !admin.isActive) {
      return NextResponse.json({ error: 'Account is inactive. Please contact support.' }, { status: 403 });
    }

    // 2. Check User table (customers)
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
      // Note: isPlatformAdmin deprecated - platform admins now use InternalAdmin table
    };

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      redirectUrl: user.isPlatformAdmin ? '/admin' : '/dashboard',
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