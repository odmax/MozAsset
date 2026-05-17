import { NextResponse } from 'next/server';
import { getSimpleAdminSession } from '@/lib/admin-session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const url = new URL(req.url);
    const search = url.searchParams.get('search');
    const plan = url.searchParams.get('plan');
    const status = url.searchParams.get('status');

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (plan) where.plan = plan;

    if (status === 'active') where.isActive = true;
    else if (status === 'inactive') where.isActive = false;
    else if (status === 'deactivated') {
      where.isDeactivated = true;
      where.isActive = true;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
        isDeactivated: true,
        deactivatedAt: true,
        scheduledDeletionAt: true,
        lastActiveAt: true,
        emailVerified: true,
        createdAt: true,
        organization: { select: { name: true } },
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('[admin-users] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}
