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
    const body = await request.json();
    const { plan } = body;

    if (!plan || !['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true, name: true, plan: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const previousPlan = user.plan;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: params.userId },
        data: {
          plan,
          subscriptionStatus: plan === 'FREE' ? 'CANCELED' : 'ACTIVE',
          ...(plan !== 'FREE' ? { canceledAt: null } : { canceledAt: new Date() }),
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'Subscription',
          entityId: params.userId,
          userId: admin.id,
          metadata: {
            action: 'change_plan',
            previousPlan,
            newPlan: plan,
            changedBy: admin.email,
          },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        } as any,
      }),
      prisma.notification.create({
        data: {
          userId: params.userId,
          type: 'PLAN_UPGRADED',
          title: 'Plan Changed',
          message: `Your plan has been changed from ${previousPlan} to ${plan} by an administrator.`,
        } as any,
      }),
    ]);

    return NextResponse.json({ success: true, previousPlan, newPlan: plan });
  } catch (error) {
    console.error('Change plan error:', error);
    return NextResponse.json({ error: 'Failed to change plan' }, { status: 500 });
  }
}
