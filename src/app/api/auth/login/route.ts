import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const admin = await prisma.internalAdmin.findUnique({
      where: { email },
    });

    if (admin && admin.isActive) {
      const isValid = await bcrypt.compare(password, admin.password);

      if (isValid) {
        await prisma.internalAdmin.update({
          where: { id: admin.id },
          data: { lastLogin: new Date() },
        });

        const sessionData = {
          id: admin.id,
          email: String(admin.email),
          name: String(admin.name || ''),
          role: String(admin.role),
          isInternalAdmin: true,
        };

        const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

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

        return response;
      }
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password || !user.isActive) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
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
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
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
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 500 });
  }
}