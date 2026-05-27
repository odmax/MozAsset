import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import type { Plan } from '@prisma/client';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function getAdminContext() {
  const cookieStore = cookies();

  const sessionCookie = cookieStore.get('session');
  const adminCookie = cookieStore.get('adminSession');

  let sessionUser: any = null;
  let adminUser: any = null;

  if (sessionCookie?.value) {
    try {
      sessionUser = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
    } catch {}
  }
  if (adminCookie?.value) {
    try {
      adminUser = JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch {}
  }

  return { sessionUser, adminUser };
}

const PLAN_HIERARCHY: Record<string, number> = { FREE: 0, PRO: 1, ENTERPRISE: 2 };

function isUpgrade(current: string, target: string): boolean {
  return (PLAN_HIERARCHY[target] || 0) > (PLAN_HIERARCHY[current] || 0);
}

function getPlanPrice(plan: string): number {
  return plan === 'PRO' ? 149 : plan === 'ENTERPRISE' ? 599 : 0;
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const { sessionUser, adminUser } = getAdminContext();

  const isPlatformAdmin = sessionUser?.isPlatformAdmin === true;
  const isInternalAdmin = adminUser?.isInternalAdmin === true || sessionUser?.isInternalAdmin === true;

  if (!isPlatformAdmin && !isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let dbAdmin: any = null;
  if (isInternalAdmin && adminUser) {
    dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: adminUser.id },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'users:edit')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const body = await request.json();
    const { plan: targetPlan, forceManually } = body;

    if (!targetPlan || !['FREE', 'PRO', 'ENTERPRISE'].includes(targetPlan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, plan: true, email: true, name: true, organizationId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentPlan = targetUser.plan as string;
    const upgrading = isUpgrade(currentPlan, targetPlan);
    const planPrice = getPlanPrice(targetPlan);

    if (upgrading && !forceManually) {
      const canForce = dbAdmin?.role === 'OWNER' || isPlatformAdmin;
      const canSendLink = dbAdmin && hasPermission(dbAdmin, 'plans:send_payment_link');

      if (!canSendLink) {
        return NextResponse.json({ error: 'Forbidden: cannot manage plan upgrades' }, { status: 403 });
      }

      return NextResponse.json({
        requiresPayment: true,
        currentPlan,
        targetPlan,
        amount: planPrice,
        canForceManually: canForce,
      });
    }

    if (upgrading && forceManually) {
      const canForce = dbAdmin?.role === 'OWNER' || isPlatformAdmin;
      if (!canForce) {
        return NextResponse.json({ error: 'Only the owner can force apply a plan without payment' }, { status: 403 });
      }
    }

    const { getPlanLimits } = await import('@/lib/billing');
    const limits = getPlanLimits(targetPlan as Plan);

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: {
        plan: targetPlan as Plan,
        ...(targetPlan !== 'FREE'
          ? {
              subscriptionStatus: 'ACTIVE' as any,
              billingPeriodStart: new Date(),
              billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              assetLimit: limits.assetLimit,
              departmentLimit: limits.departmentLimit,
              locationLimit: limits.locationLimit,
              userLimit: limits.userLimit,
            }
          : {}),
      },
      select: {
        id: true, name: true, email: true, role: true, plan: true,
        isActive: true, isDeactivated: true, deactivatedAt: true,
        scheduledDeletionAt: true, lastActiveAt: true, emailVerified: true,
        createdAt: true,
      },
    });

    if (targetUser.organizationId) {
      await prisma.organization.update({
        where: { id: targetUser.organizationId },
        data: {
          plan: targetPlan as Plan,
          subscriptionStatus: targetPlan !== 'FREE' ? ('ACTIVE' as any) : undefined,
        },
      }).catch(() => {});
    }

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE' as any,
        entityType: 'User',
        entityId: params.userId,
        userId: adminUser?.id || sessionUser?.id || params.userId,
        changes: {
          previousPlan: currentPlan,
          newPlan: targetPlan,
          changedBy: adminUser?.email || sessionUser?.email || 'system',
          method: forceManually ? 'manual_force' : 'direct',
        },
      },
    }).catch(() => {});

    createNotification({
      userId: params.userId,
      type: 'PLAN_UPGRADED',
      title: targetPlan === 'FREE' ? 'Plan Downgraded' : 'Plan Upgraded',
      message: targetPlan === 'FREE'
        ? 'Your plan has been changed to Free by an administrator'
        : `Your plan has been upgraded to ${targetPlan} by an administrator`,
      link: '/billing',
      actorId: sessionUser?.id || adminUser?.id,
    }).catch((err) => console.error('Failed to create notification:', err));

    revalidatePath('/admin/users');
    revalidatePath('/admin/subscriptions');

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('[change-plan] Error:', error);
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 });
  }
}
