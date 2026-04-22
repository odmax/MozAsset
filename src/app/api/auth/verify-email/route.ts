import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendVerificationEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required', valid: false },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token as any,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid verification token', valid: false },
        { status: 400 }
      );
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ valid: true, alreadyVerified: true });
    }

    return NextResponse.json({ valid: true, alreadyVerified: false });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email', valid: false },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        emailVerificationToken: token as any,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid verification token' },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date() as any,
        emailVerificationToken: null as any,
      },
    });

    return NextResponse.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    );
  }
}