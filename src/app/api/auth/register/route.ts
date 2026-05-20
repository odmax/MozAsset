import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendVerificationEmail, sendWelcomeEmail, hashToken } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { name, email, password, organization } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);
    const orgName = organization || name || 'My Organization';
    const hasOrgName = typeof organization === 'string' && organization.trim().length > 0;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name || orgName,
          email,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          plan: 'FREE',
          assetLimit: 50,
          onBoardingComplete: hasOrgName,
          isActive: true,
          emailVerificationToken: hashedToken,
          verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const org = await tx.organization.create({
        data: {
          name: orgName,
          ownerId: user.id,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { organizationId: org.id },
      });

      return { user, org };
    });

    // Send emails
    await sendVerificationEmail(result.user.email, result.user.name, rawToken);
    if (hasOrgName) {
      await sendWelcomeEmail(result.user.email, result.user.name);
    }

    const sessionData = {
      id: result.user.id,
      email: String(result.user.email),
      name: String(result.user.name || ''),
      role: 'SUPER_ADMIN',
      plan: 'FREE',
      assetLimit: 50,
      onBoardingComplete: hasOrgName,
      isPlatformAdmin: false,
      organizationId: result.org.id,
      emailVerified: false,
    };

    const redirectUrl = hasOrgName ? '/dashboard' : '/onboarding';

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString('base64');

    const response = NextResponse.json({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
      needsVerification: true,
      redirectUrl,
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
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
