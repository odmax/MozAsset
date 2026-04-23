import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

async function sendVerificationEmail(email: string, name: string | null, token: string) {
  console.log(`Verification email would be sent to ${email} with token ${token}`);
}

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
    const verificationToken = randomBytes(32).toString('hex');

    const user = await prisma.user.create({
      data: {
        name: name || organization,
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        plan: 'FREE',
        assetLimit: 50,
        onBoardingComplete: false,
        isActive: true,
        emailVerificationToken: verificationToken,
      },
    });

    await sendVerificationEmail(user.email, user.name, verificationToken);

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      needsVerification: true,
    });
  } catch (error) {
    console.error('Registration error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}