import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { sendVerificationEmail } from '@/lib/email';

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
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}