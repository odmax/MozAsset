import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
const GRACE_DAYS = 3;

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET || 'mozassets-cron'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results = { checked: 0, pastDue: 0, graceStarted: 0, suspended: 0, renewed: 0, remindersSent: 0 };

  const paidUsers = await prisma.user.findMany({
    where: {
      plan: { in: ['PRO', 'ENTERPRISE'] },
      subscriptionStatus: { in: ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'] },
      billingPeriodEnd: { lte: now },
      isActive: true,
    },
    select: { id: true, email: true, name: true, plan: true, subscriptionStatus: true, billingPeriodEnd: true, gracePeriodEnd: true, renewalReminderSentAt: true, organizationId: true },
  });

  results.checked = paidUsers.length;

  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

  for (const user of paidUsers) {
    const recentPayment = await prisma.payment.findFirst({
      where: { userId: user.id, status: 'COMPLETED', createdAt: { gte: tenDaysAgo } },
      orderBy: { createdAt: 'desc' },
    });

    if (recentPayment) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionStatus: 'ACTIVE',
          billingPeriodStart: new Date(),
          billingPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          gracePeriodEnd: null,
          renewalReminderSentAt: null,
        },
      });
      if (user.organizationId) {
        await prisma.organization.update({ where: { id: user.organizationId }, data: { subscriptionStatus: 'ACTIVE' } }).catch(() => {});
      }
      results.renewed++;
      continue;
    }

    const billingEnd = user.billingPeriodEnd!;
    const daysOverdue = Math.floor((now.getTime() - billingEnd.getTime()) / (24 * 60 * 60 * 1000));

    if (user.subscriptionStatus === 'ACTIVE' || user.subscriptionStatus === 'PAST_DUE') {
      if (daysOverdue >= GRACE_DAYS) {
        await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: 'SUSPENDED' } });
        if (user.organizationId) await prisma.organization.update({ where: { id: user.organizationId }, data: { subscriptionStatus: 'SUSPENDED' } }).catch(() => {});

        await sendEmail({
          to: user.email,
          subject: 'Your MozAssets subscription has been suspended',
          html: `<p>Hi ${user.name || 'there'},</p><p>Your ${user.plan} subscription payment for MozAssets is now ${daysOverdue} days overdue. Your account has been suspended.</p><p><a href="${process.env.APP_URL || ''}/billing">Complete payment to reactivate</a></p>`,
          type: 'subscription_suspended',
        }).catch(() => {});

        await createNotification({
          userId: user.id,
          type: 'SUBSCRIPTION_CANCELLED' as any,
          title: 'Subscription Suspended',
          message: `Your ${user.plan} plan has been suspended due to non-payment. Visit Billing to reactivate.`,
          link: '/billing',
        }).catch(() => {});

        results.suspended++;
      } else {
        const status = daysOverdue > 0 ? 'PAST_DUE' : 'GRACE_PERIOD';
        const data: any = { subscriptionStatus: status };
        if (!user.gracePeriodEnd && daysOverdue >= 0) {
          data.gracePeriodEnd = new Date(now.getTime() + (GRACE_DAYS - daysOverdue) * 24 * 60 * 60 * 1000);
        }
        await prisma.user.update({ where: { id: user.id }, data });
        if (user.organizationId) await prisma.organization.update({ where: { id: user.organizationId }, data: { subscriptionStatus: status } }).catch(() => {});

        if (status === 'PAST_DUE') results.pastDue++;
        else results.graceStarted++;
      }
    }

    const oneDay = 24 * 60 * 60 * 1000;
    if (!user.renewalReminderSentAt || (now.getTime() - new Date(user.renewalReminderSentAt).getTime()) > oneDay) {
      await sendEmail({
        to: user.email,
        subject: daysOverdue >= 0 ? 'Your MozAssets subscription payment is overdue' : 'Your MozAssets subscription renews soon',
        html: `<p>Hi ${user.name || 'there'},</p><p>Your ${user.plan} plan payment ${daysOverdue >= 0 ? `is ${daysOverdue} days overdue` : 'is due soon'}. <a href="${process.env.APP_URL || ''}/billing">Complete payment</a> to keep your subscription active.</p>`,
        type: 'subscription_renewal',
      }).catch(() => {});
      await prisma.user.update({ where: { id: user.id }, data: { renewalReminderSentAt: new Date() } });
      results.remindersSent++;
    }
  }

  return NextResponse.json({ success: true, results });
}
