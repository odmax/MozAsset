import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendVerificationEmail, hashToken } from '@/lib/email';
import { getSimpleUserSession } from '@/lib/customer-session';

const MAX_RESEND_PER_HOUR = 3;

export const dynamic = 'force-dynamic';

export async function POST() {
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

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const recentCount = await prisma.auditLog.count({
      where: {
        userId: user.id,
        action: 'VERIFICATION_EMAIL_SENT' as any,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (recentCount >= MAX_RESEND_PER_HOUR) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);
    const now = new Date();

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: hashedToken as any,
        verificationTokenExpiry: new Date(now.getTime() + 24 * 60 * 60 * 1000) as any,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'VERIFICATION_EMAIL_SENT' as any,
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        createdAt: now,
      },
    });

    await sendVerificationEmail(user.email, user.name, rawToken);

    return NextResponse.json({
      message: 'Verification email sent',
      lastSentAt: now.toISOString(),
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    );
  }
}
