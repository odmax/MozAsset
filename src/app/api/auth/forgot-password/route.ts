import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendPasswordResetEmail, hashToken } from '@/lib/email';
import { normalizeEmail } from '@/lib/email-normalize';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email: rawEmail } = await request.json();
    const email = normalizeEmail(rawEmail);

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No account found with this email' },
        { status: 400 }
      );
    }

    const rawToken = randomBytes(32).toString('hex');
    const hashedToken = hashToken(rawToken);
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken as any,
        resetTokenExpiry: tokenExpiry as any,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RESET_REQUEST' as any,
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
      },
    });

    const emailResult = await sendPasswordResetEmail(email, rawToken);

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error);
    }

    return NextResponse.json({
      message: 'Password reset link sent',
      resetToken: process.env.NODE_ENV === 'development' ? rawToken : undefined,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
