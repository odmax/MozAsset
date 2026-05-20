import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = getSimpleUserSession();

    if (!session?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        emailVerifiedAt: true,
        emailVerificationToken: true,
        verificationTokenExpiry: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      verified: !!user.emailVerifiedAt,
      pending: !!user.emailVerificationToken && !user.emailVerifiedAt,
      lastSentAt: user.verificationTokenExpiry?.toISOString() || null,
    });
  } catch (error) {
    console.error('Verification status error:', error);
    return NextResponse.json({ error: 'Failed to check verification status' }, { status: 500 });
  }
}
