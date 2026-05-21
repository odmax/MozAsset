import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getAdminSession() {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const admin = getAdminSession();
  if (!admin || !admin.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.id },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'subscriptions:modify')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true, name: true, plan: true, subscriptionStatus: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: params.userId },
        data: {
          subscriptionStatus: 'CANCELED',
          canceledAt: new Date(),
          plan: 'FREE',
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'Subscription',
          entityId: params.userId,
          userId: admin.id,
          metadata: {
            action: 'cancel_subscription',
            previousPlan: user.plan,
            previousStatus: user.subscriptionStatus,
            canceledBy: admin.email,
          },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        } as any,
      }),
      prisma.notification.create({
        data: {
          userId: params.userId,
          type: 'SUBSCRIPTION_CANCELLED',
          title: 'Subscription Cancelled',
          message: `Your ${user.plan} subscription has been cancelled by an administrator.`,
        } as any,
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
  }
}
