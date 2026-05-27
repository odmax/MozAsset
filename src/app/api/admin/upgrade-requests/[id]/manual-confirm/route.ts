import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import type { Plan } from '@prisma/client';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

function getAdminFromCookies() {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch {}
  }
  const sessionCookie = cookieStore.get('session');
  if (sessionCookie?.value) {
    try {
      const sess = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
      if (sess?.isPlatformAdmin || sess?.isInternalAdmin) return sess;
    } catch {}
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.id },
    select: { id: true, role: true, email: true, permissions: true },
  });

  if (!dbAdmin || !hasPermission(dbAdmin, 'plans:manual_confirm')) {
    return NextResponse.json({ error: 'Forbidden: cannot manually confirm payments' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { paymentReference, notes } = body;

    const upgradeRequest = await prisma.upgradeRequest.findUnique({
      where: { id: params.id },
      include: { user: { select: { id: true, plan: true, organizationId: true } } },
    });

    if (!upgradeRequest) {
      return NextResponse.json({ error: 'Upgrade request not found' }, { status: 404 });
    }

    if (upgradeRequest.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: `Upgrade request is already ${upgradeRequest.status}` }, { status: 400 });
    }

    const { getPlanLimits } = await import('@/lib/billing');
    const limits = getPlanLimits(upgradeRequest.targetPlan as Plan);

    await prisma.user.update({
      where: { id: upgradeRequest.userId },
      data: {
        plan: upgradeRequest.targetPlan as Plan,
        subscriptionStatus: 'ACTIVE' as any,
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        assetLimit: limits.assetLimit,
        departmentLimit: limits.departmentLimit,
        locationLimit: limits.locationLimit,
        userLimit: limits.userLimit,
      },
    });

    if (upgradeRequest.user?.organizationId) {
      await prisma.organization.update({
        where: { id: upgradeRequest.user.organizationId },
        data: {
          plan: upgradeRequest.targetPlan as Plan,
          subscriptionStatus: 'ACTIVE' as any,
        },
      }).catch(() => {});
    }

    await prisma.upgradeRequest.update({
      where: { id: params.id },
      data: {
        status: 'MANUALLY_CONFIRMED',
        confirmedByAdminId: dbAdmin.id,
        paymentReference: paymentReference || upgradeRequest.paymentReference,
        notes: notes || 'Manually confirmed by admin',
        paidAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE' as any,
        entityType: 'User',
        entityId: upgradeRequest.userId,
        userId: admin.id,
        changes: {
          action: 'manual_upgrade_confirmed',
          upgradeRequestId: params.id,
          previousPlan: upgradeRequest.currentPlan,
          newPlan: upgradeRequest.targetPlan,
          confirmedBy: dbAdmin.email,
          paymentReference: paymentReference || 'none',
          notes: notes || '',
        },
      },
    }).catch(() => {});

    createNotification({
      userId: upgradeRequest.userId,
      type: 'PLAN_UPGRADED',
      title: 'Plan Upgraded',
      message: `Your plan has been upgraded to ${upgradeRequest.targetPlan}`,
      link: '/billing',
    }).catch(() => {});

    return NextResponse.json({ success: true, status: 'MANUALLY_CONFIRMED' });
  } catch (error) {
    console.error('[manual-confirm] Error:', error);
    return NextResponse.json({ error: 'Failed to confirm upgrade' }, { status: 500 });
  }
}
