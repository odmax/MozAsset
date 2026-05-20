import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendVerificationEmail, hashToken } from '@/lib/email';
import { getSimpleUserSession } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = getSimpleUserSession();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json({ message: 'Email already verified' });
    }

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedToken as any,
        verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) as any,
      },
    });

    await sendVerificationEmail(user.email, user.name, rawToken);

    return NextResponse.json({ message: 'Verification email sent' });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
