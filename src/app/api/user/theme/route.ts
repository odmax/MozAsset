import { NextResponse } from 'next/server';
import { getCurrentUserContext } from '@/lib/user-context';

export const dynamic = 'force-dynamic';

const DEFAULT_THEME = { theme: 'system', themeColor: null };

export async function GET() {
  const user = await getCurrentUserContext();

  if (!user?.userId) {
    // Return safe default instead of 401 - don't crash the dashboard
    return NextResponse.json(DEFAULT_THEME);
  }

  try {
    const { prisma } = await import('@/lib/prisma');

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: {
        appearanceMode: true,
        themeColor: true,
      },
    });

    return NextResponse.json({
      theme: dbUser?.appearanceMode?.toLowerCase() || 'system',
      themeColor: dbUser?.themeColor || null,
    });
  } catch (error) {
    console.error('Theme GET error:', error);
    // Return safe default on error
    return NextResponse.json(DEFAULT_THEME);
  }
}