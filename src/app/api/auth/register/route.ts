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
    const orgName = organization || name || 'My Organization';

    // Create user and organization in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user first
      const user = await tx.user.create({
        data: {
          name: name || orgName,
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

      // Create the organization with user as owner
      const org = await tx.organization.create({
        data: {
          name: orgName,
          ownerId: user.id,
        },
      });

      // Link user to organization
      await tx.user.update({
        where: { id: user.id },
        data: { organizationId: org.id },
      });

      return { user, org };
    });

    await sendVerificationEmail(result.user.email, result.user.name, verificationToken);

    return NextResponse.json({
      id: result.user.id,
      name: result.user.name,
      email: result.user.email,
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