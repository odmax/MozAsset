import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({ where: { id: admin.adminId }, select: { id: true, role: true } });
  if (!dbAdmin || !hasPermission(dbAdmin, 'analytics:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yesterday = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);

  const [
    totalUsers, activeUsers, verifiedUsers,
    totalOrgs, orgsByPlan,
    paymentsThisMonth, failedPayments, paymentTotal,
    pendingUpgradeReqs, manualConfirmations,
    emailsToday, failedEmails,
    verificationSent, resetSent, reengagementSent,
    openTickets, breachedTickets, atRiskTickets,
    onlineAgents, busyAgents,
    lastMaintenanceCron, lastReengagementCron,
    usersInactive30d, pendingPaymentsOld,
    pastDueSubs, graceSubs, suspendedSubs,
    queuedRenewals, appliedRenewals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { emailVerified: { not: null } } }),
    prisma.organization.count(),
    prisma.organization.groupBy({ by: ['plan'], _count: true }),
    prisma.payment.count({ where: { status: 'COMPLETED', createdAt: { gte: monthStart } } }),
    prisma.payment.count({ where: { status: 'FAILED' } }),
    prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.upgradeRequest.count({ where: { status: 'PENDING_PAYMENT' } }),
    prisma.upgradeRequest.count({ where: { status: 'MANUALLY_CONFIRMED' } }),
    prisma.emailLog.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.emailLog.count({ where: { status: 'failed' } }),
    prisma.emailLog.count({ where: { type: 'email_verification' } }),
    prisma.emailLog.count({ where: { type: 'password_reset' } }),
    prisma.emailLog.count({ where: { type: 'INACTIVE_7_DAYS' } }),
    prisma.supportTicket.count({ where: { status: { not: 'RESOLVED' } } }),
    prisma.supportTicket.count({ where: { slaStatus: 'BREACHED' } }),
    prisma.supportTicket.count({ where: { slaStatus: 'AT_RISK' } }),
    prisma.internalAdmin.count({ where: { isActive: true, isOnline: true } }),
    prisma.internalAdmin.count({ where: { isActive: true, isBusy: true } }),
    prisma.userEngagementEmail.findFirst({ where: { emailType: 'INACTIVE_7_DAYS' }, orderBy: { sentAt: 'desc' }, select: { sentAt: true } }),
    prisma.userEngagementEmail.findFirst({ where: { emailType: 'INACTIVE_90_DAYS' }, orderBy: { sentAt: 'desc' }, select: { sentAt: true } }),
    prisma.user.count({ where: { isActive: true, lastActiveAt: { lte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } } }),
    prisma.payment.count({ where: { status: 'PENDING', createdAt: { lte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
    prisma.user.count({ where: { subscriptionStatus: 'PAST_DUE' } }),
    prisma.user.count({ where: { subscriptionStatus: 'GRACE_PERIOD' } }),
    prisma.user.count({ where: { subscriptionStatus: 'SUSPENDED' } }),
    prisma.subscriptionRenewal.count({ where: { applied: false } }),
    prisma.subscriptionRenewal.count({ where: { applied: true, appliedAt: { gte: monthStart } } }),
  ]);

  const warnings = [];
  if (failedPayments > 0) warnings.push({ type: 'payments', message: `${failedPayments} failed payments`, severity: 'high' });
  if (failedEmails > 0) warnings.push({ type: 'emails', message: `${failedEmails} failed emails`, severity: 'medium' });
  if (breachedTickets > 0) warnings.push({ type: 'sla', message: `${breachedTickets} SLA breached tickets`, severity: 'high' });
  if (pendingPaymentsOld > 0) warnings.push({ type: 'payments', message: `${pendingPaymentsOld} pending payments > 24h`, severity: 'medium' });
  if (usersInactive30d > 0) warnings.push({ type: 'users', message: `${usersInactive30d} users inactive 30+ days`, severity: 'low' });
  if (!lastMaintenanceCron || new Date(lastMaintenanceCron.sentAt).getTime() < yesterday.getTime()) {
    warnings.push({ type: 'cron', message: 'Maintenance cron may not have run in 24h', severity: 'low' });
  }
  if (pastDueSubs > 0) warnings.push({ type: 'billing', message: `${pastDueSubs} subscriptions past due`, severity: 'high' });
  if (suspendedSubs > 0) warnings.push({ type: 'billing', message: `${suspendedSubs} subscriptions suspended`, severity: 'high' });

  return NextResponse.json({
    updatedAt: now.toISOString(),
    users: { total: totalUsers, active: activeUsers, inactive: totalUsers - activeUsers, verified: verifiedUsers, unverified: totalUsers - verifiedUsers, inactive30d: usersInactive30d },
    organizations: { total: totalOrgs, byPlan: orgsByPlan.map(p => ({ plan: p.plan, count: p._count })) },
    billing: {
      mrr: Number(paymentTotal._sum.amount || 0),
      paymentsThisMonth,
      failedPayments,
      pendingUpgradeRequests: pendingUpgradeReqs,
      manualConfirmations,
      pendingPaymentsOld,
      pastDueSubscriptions: pastDueSubs,
      graceSubscriptions: graceSubs,
      suspendedSubscriptions: suspendedSubs,
      queuedRenewals,
      appliedRenewalsThisMonth: appliedRenewals,
    },
    emails: { sentToday: emailsToday, failed: failedEmails, verificationSent, resetSent, reengagementSent },
    cron: { lastMaintenanceCron: lastMaintenanceCron?.sentAt || null, lastReengagementCron: lastReengagementCron?.sentAt || null },
    support: { openTickets, breachedTickets, atRiskTickets, onlineAgents, busyAgents },
    warnings,
  });
}
