import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';
const GRACE_DAYS = 3;

function daysAhead(d: number): Date { const n = new Date(); n.setDate(n.getDate() + d); n.setHours(0, 0, 0, 0); return n; }
function daysAgo(d: number): Date { const n = new Date(); n.setDate(n.getDate() - d); n.setHours(23, 59, 59, 999); return n; }

const REMINDERS = [
  { days: 7, field: 'renewalReminder7dAt' as const, subject: 'Your MozAssets subscription renews in 7 days', threshold: 7 },
  { days: 3, field: 'renewalReminder3dAt' as const, subject: 'Your subscription renewal is approaching', threshold: 3 },
  { days: 1, field: 'renewalReminder1dAt' as const, subject: 'Renew tomorrow to avoid interruption', threshold: 1 },
  { days: 0, field: 'renewalReminderDueAt' as const, subject: 'Subscription Renewal Due Today', threshold: 0 },
];

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET || 'mozassets-cron'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results = { reminders: 0, renewalsApplied: 0, pastDue: 0, graceStarted: 0, suspended: 0, recoveryEmails: 0 };

  const paidUsers = await prisma.user.findMany({
    where: { plan: { in: ['PRO', 'ENTERPRISE'] }, subscriptionStatus: { in: ['ACTIVE', 'PAST_DUE', 'GRACE_PERIOD'] }, billingPeriodEnd: { not: null }, isActive: true },
    select: { id: true, email: true, name: true, plan: true, subscriptionStatus: true, billingPeriodEnd: true, gracePeriodEnd: true, renewalReminder7dAt: true, renewalReminder3dAt: true, renewalReminder1dAt: true, renewalReminderDueAt: true, pastDueReminderAt: true, suspensionReminderAt: true, organizationId: true },
  });

  for (const user of paidUsers) {
    const billingEnd = user.billingPeriodEnd!;
    const daysUntilDue = Math.ceil((billingEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    if (user.subscriptionStatus === 'ACTIVE' && daysUntilDue >= 0) {
      const queuedRenewal = await prisma.subscriptionRenewal.findFirst({
        where: { userId: user.id, billingCycleStart: billingEnd, applied: false },
        orderBy: { createdAt: 'desc' },
      });

      if (queuedRenewal) {
        if (daysUntilDue <= 0) {
          await prisma.subscriptionRenewal.update({ where: { id: queuedRenewal.id }, data: { applied: true, appliedAt: new Date() } });
          await prisma.user.update({
            where: { id: user.id },
            data: { subscriptionStatus: 'ACTIVE', billingPeriodStart: billingEnd, billingPeriodEnd: queuedRenewal.billingCycleEnd, gracePeriodEnd: null, renewalReminder7dAt: null, renewalReminder3dAt: null, renewalReminder1dAt: null, renewalReminderDueAt: null, pastDueReminderAt: null, suspensionReminderAt: null },
          });
          if (user.organizationId) await prisma.organization.update({ where: { id: user.organizationId }, data: { subscriptionStatus: 'ACTIVE' } }).catch(() => {});
          results.renewalsApplied++;
          continue;
        }
      }

      for (const r of REMINDERS) {
        if ((user as any)[r.field]) continue;
        const daysToDue = Math.ceil((billingEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        if (daysToDue <= r.threshold && daysToDue >= r.threshold - 1) {
          await sendEmail({ to: user.email, subject: r.subject, html: buildReminderHtml(user.name, user.plan, billingEnd, daysToDue), type: `renewal_${r.threshold}d` }).catch(() => {});
          await createNotification({ userId: user.id, type: 'BILLING_SUCCESSFUL' as any, title: 'Subscription Renewal Reminder', message: `Your ${user.plan} plan ${daysToDue <= 0 ? 'renews today' : `renews in ${daysToDue} days`}.`, link: '/billing' }).catch(() => {});
          await prisma.user.update({ where: { id: user.id }, data: { [r.field]: new Date() } });
          results.reminders++;
          break;
        }
      }
    }

    const daysOverdue = Math.max(0, Math.floor((now.getTime() - billingEnd.getTime()) / (24 * 60 * 60 * 1000)));
    if (daysOverdue <= 0) continue;

    if (user.subscriptionStatus === 'ACTIVE') {
      if (daysOverdue >= GRACE_DAYS) {
        await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: 'SUSPENDED' } });
        if (user.organizationId) await prisma.organization.update({ where: { id: user.organizationId }, data: { subscriptionStatus: 'SUSPENDED' } }).catch(() => {});
        if (!user.suspensionReminderAt) {
          await sendEmail({ to: user.email, subject: 'Your MozAssets subscription has been suspended', html: `<p>Hi ${user.name || 'there'},</p><p>Your ${user.plan} plan has been suspended due to non-payment. <a href="${process.env.APP_URL || ''}/billing">Reactivate now</a>.</p>`, type: 'subscription_suspended' }).catch(() => {});
          await prisma.user.update({ where: { id: user.id }, data: { suspensionReminderAt: new Date() } });
        }
        results.suspended++;
      } else {
        const status = daysOverdue > 0 ? 'PAST_DUE' : 'GRACE_PERIOD';
        const data: any = { subscriptionStatus: status };
        if (!user.gracePeriodEnd) data.gracePeriodEnd = new Date(now.getTime() + (GRACE_DAYS - daysOverdue) * 24 * 60 * 60 * 1000);
        await prisma.user.update({ where: { id: user.id }, data });
        if (user.organizationId) await prisma.organization.update({ where: { id: user.organizationId }, data: { subscriptionStatus: status } }).catch(() => {});
        if (status === 'PAST_DUE' && !user.pastDueReminderAt) {
          await sendEmail({ to: user.email, subject: 'Your MozAssets subscription payment is overdue', html: `<p>Hi ${user.name || 'there'},</p><p>Your ${user.plan} plan payment is overdue. <a href="${process.env.APP_URL || ''}/billing">Complete payment</a>.</p>`, type: 'subscription_renewal' }).catch(() => {});
          await prisma.user.update({ where: { id: user.id }, data: { pastDueReminderAt: new Date() } });
        }
        if (status === 'PAST_DUE') results.pastDue++; else results.graceStarted++;
      }
    } else if (user.subscriptionStatus === 'PAST_DUE' || user.subscriptionStatus === 'GRACE_PERIOD') {
      if (daysOverdue >= GRACE_DAYS && user.subscriptionStatus === 'PAST_DUE') {
        await prisma.user.update({ where: { id: user.id }, data: { subscriptionStatus: 'SUSPENDED' } });
        results.suspended++;
      }
    }
  }

  // Invoice recovery
  const recoveryStages = [
    { field: 'recoveryStage1At' as const, days: 0, stage: 'due_today', subject: 'Payment Due Today: Your MozAssets Subscription' },
    { field: 'recoveryStage2At' as const, days: 1, stage: 'day1', subject: 'Payment Reminder: 1 Day Overdue' },
    { field: 'recoveryStage3At' as const, days: 3, stage: 'day3', subject: 'Final Notice: Payment 3 Days Overdue' },
    { field: 'recoverySuspendedAt' as const, days: 5, stage: 'suspended', subject: 'Your MozAssets Subscription Has Been Suspended' },
  ];

  const overdueInvoices = await prisma.subscriptionInvoice.findMany({
    where: { status: { in: ['ISSUED', 'PENDING_PAYMENT', 'OVERDUE'] }, dueDate: { lte: now } },
    include: { user: { select: { email: true, name: true, plan: true } } },
  });

  for (const inv of overdueInvoices) {
    const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (24 * 60 * 60 * 1000));

    if (daysOverdue >= 5 && inv.status !== 'OVERDUE') {
      await prisma.subscriptionInvoice.update({ where: { id: inv.id }, data: { status: 'OVERDUE' } });
    }

    for (const stage of recoveryStages) {
      if ((inv as any)[stage.field]) continue;
      if (daysOverdue < stage.days) continue;

      await sendEmail({
        to: inv.user.email,
        subject: stage.subject,
        html: `<p>Hi ${inv.user.name || 'there'},</p><p>Your invoice <strong>${inv.invoiceNumber}</strong> for R${Number(inv.total).toFixed(2)} is overdue.</p><p><a href="${process.env.APP_URL || ''}/billing">Pay Now</a> to keep your ${inv.user.plan} plan active.</p>`,
        type: `recovery_${stage.stage}`,
      }).catch(() => {});

      await prisma.subscriptionInvoice.update({ where: { id: inv.id }, data: {
        [stage.field]: new Date(),
        recoveryStage: stage.stage,
        recoveryEmailSentAt: new Date(),
        ...(stage.stage === 'suspended' ? { status: 'OVERDUE' } : {}),
      } });

      results.recoveryEmails++;
      break;
    }
  }

  return NextResponse.json({ success: true, results });
}

function buildReminderHtml(name: string | null, plan: string, billingEnd: Date, daysUntil: number): string {
  const firstName = name?.split(' ')[0] || 'there';
  const dateStr = billingEnd.toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  return `<p>Hi ${firstName},</p><p>Your <strong>${plan}</strong> plan renews on <strong>${dateStr}</strong>${daysUntil <= 0 ? ' today' : ` (${daysUntil} day${daysUntil !== 1 ? 's' : ''} from now)`}.</p><p><a href="${process.env.APP_URL || ''}/billing">Manage your subscription</a></p>`;
}
