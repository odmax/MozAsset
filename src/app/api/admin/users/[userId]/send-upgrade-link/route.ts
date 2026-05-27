import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { createCheckoutPayload, getPayfastBaseUrl } from '@/lib/payfast';
import type { Plan } from '@prisma/client';
import { sendUpgradePaymentEmail, getBaseUrl } from '@/lib/email';

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

function getPlanPrice(plan: string): number {
  return plan === 'PRO' ? 149 : plan === 'ENTERPRISE' ? 599 : 0;
}

export async function POST(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const admin = getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  let dbAdmin: any = null;
  if (admin.isInternalAdmin) {
    dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.id },
      select: { id: true, role: true, email: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'plans:send_payment_link')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const body = await request.json();
    const { targetPlan } = body;

    if (!targetPlan || !['PRO', 'ENTERPRISE'].includes(targetPlan)) {
      return NextResponse.json({ error: 'Target plan must be PRO or ENTERPRISE' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, email: true, name: true, plan: true, organizationId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const currentPlan = targetUser.plan as string;
    const planPrice = getPlanPrice(targetPlan);

    const existingPending = await prisma.upgradeRequest.findFirst({
      where: { userId: params.userId, status: 'PENDING_PAYMENT' },
      orderBy: { createdAt: 'desc' },
    });

    if (existingPending && existingPending.expiresAt > new Date()) {
      return NextResponse.json({
        success: true,
        upgradeRequest: {
          id: existingPending.id,
          checkoutUrl: existingPending.checkoutUrl,
          expiresAt: existingPending.expiresAt,
        },
      });
    }

    const paymentReference = `${params.userId}_upgrade_${targetPlan}_${Date.now()}`;

    const checkoutPayload = createCheckoutPayload(
      params.userId,
      targetUser.email,
      targetUser.name || 'Customer',
      targetPlan as Plan
    );

    checkoutPayload.m_payment_id = paymentReference;
    const { generateSignature, getPayfastConfig } = await import('@/lib/payfast');
    const config = getPayfastConfig();
    checkoutPayload.merchant_id = config.merchantId;
    checkoutPayload.merchant_key = config.merchantKey;
    checkoutPayload.return_url = `${config.returnUrl}?userId=${params.userId}&plan=${targetPlan}`;
    checkoutPayload.cancel_url = `${config.cancelUrl}?userId=${params.userId}`;
    checkoutPayload.notify_url = `${config.itnUrl}?userId=${params.userId}`;
    checkoutPayload.signature = generateSignature(checkoutPayload as any);

    const payfastUrl = `${getPayfastBaseUrl()}/eng/process`;

    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    const upgradeRequest = await prisma.upgradeRequest.create({
      data: {
        userId: params.userId,
        organizationId: targetUser.organizationId,
        currentPlan,
        targetPlan,
        amount: planPrice,
        status: 'PENDING_PAYMENT',
        paymentReference,
        checkoutUrl: payfastUrl,
        requestedByAdminId: dbAdmin?.id || admin.id,
        expiresAt,
      },
    });

    const baseUrl = getBaseUrl();
    const payLink = `${baseUrl}/checkout/payfast?data=${Buffer.from(JSON.stringify(checkoutPayload)).toString('base64')}&url=${encodeURIComponent(payfastUrl)}`;

    const emailResult = await sendUpgradePaymentEmail(
      targetUser.email,
      targetUser.name,
      currentPlan,
      targetPlan,
      planPrice,
      payLink,
      expiresAt
    );

    if (!emailResult.success) {
      console.error('[send-upgrade-link] Email failed:', emailResult.error);
      return NextResponse.json({
        success: true,
        warning: 'Payment link created but email failed to send. Use the link below.',
        upgradeRequest: {
          id: upgradeRequest.id,
          checkoutUrl: payfastUrl,
          checkoutData: checkoutPayload,
          payLink,
          expiresAt: upgradeRequest.expiresAt,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE' as any,
        entityType: 'User',
        entityId: params.userId,
        userId: admin.id,
        changes: {
          action: 'upgrade_payment_link_sent',
          currentPlan,
          targetPlan,
          amount: planPrice,
          sentBy: dbAdmin?.email || admin.email,
        },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      upgradeRequest: {
        id: upgradeRequest.id,
        checkoutUrl: payfastUrl,
        checkoutData: checkoutPayload,
        payLink,
        expiresAt: upgradeRequest.expiresAt,
      },
    });
  } catch (error) {
    console.error('[send-upgrade-link] Error:', error);
    return NextResponse.json({ error: 'Failed to send upgrade link' }, { status: 500 });
  }
}
