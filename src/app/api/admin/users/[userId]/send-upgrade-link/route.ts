import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { createCheckoutPayload, getPayfastBaseUrl } from '@/lib/payfast';
import type { Plan } from '@prisma/client';
import { sendEmail } from '@/lib/email';

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

    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL || '';
    const payLink = `${appUrl}/checkout/payfast?data=${Buffer.from(JSON.stringify(checkoutPayload)).toString('base64')}&url=${encodeURIComponent(payfastUrl)}`;

    sendEmail({
      to: targetUser.email,
      subject: 'Complete your MozAssets plan upgrade',
      html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:20px">
        <h2 style="color:#1e293b">Upgrade to ${targetPlan} Plan</h2>
        <p>An administrator has initiated a plan upgrade for your account.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Current plan:</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${currentPlan}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Target plan:</strong></td><td style="padding:8px;border:1px solid #e2e8f0">${targetPlan}</td></tr>
          <tr><td style="padding:8px;border:1px solid #e2e8f0;background:#f8fafc"><strong>Amount:</strong></td><td style="padding:8px;border:1px solid #e2e8f0">R${planPrice}/month</td></tr>
        </table>
        <p>Complete your payment to activate the upgrade:</p>
        <a href="${payLink}" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Pay Now</a>
        <p style="color:#94a3b8;font-size:13px">This link expires on ${expiresAt.toLocaleDateString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
      </div>`,
      type: 'upgrade_payment',
    }).catch((err) => console.error('Failed to send upgrade email:', err));

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
        expiresAt: upgradeRequest.expiresAt,
      },
    });
  } catch (error) {
    console.error('[send-upgrade-link] Error:', error);
    return NextResponse.json({ error: 'Failed to send upgrade link' }, { status: 500 });
  }
}
