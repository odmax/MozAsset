import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const dbAdmin = await prisma.internalAdmin.findUnique({ where: { id: admin.adminId }, select: { id: true, role: true } });
  if (!dbAdmin || !hasPermission(dbAdmin, 'billing:read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    totalInvoices, paidInvoices, overdueInvoices, pendingInvoices,
    mrr, arr,
    renewalsDueToday, renewalsDueWeek,
    queuedRenewals, appliedRenewals,
    failedPayments, manualConfirms,
    recentInvoices,
  ] = await Promise.all([
    prisma.subscriptionInvoice.count(),
    prisma.subscriptionInvoice.count({ where: { status: 'PAID' } }),
    prisma.subscriptionInvoice.count({ where: { status: 'OVERDUE' } }),
    prisma.subscriptionInvoice.count({ where: { status: { in: ['ISSUED', 'PENDING_PAYMENT'] } } }),
    prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: monthStart } }, _sum: { amount: true } }),
    prisma.payment.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: new Date(now.getFullYear() - 1, now.getMonth(), 1) } }, _sum: { amount: true } }),
    prisma.subscriptionRenewal.count({ where: { applied: false, billingCycleEnd: { gte: now, lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) } } }),
    prisma.subscriptionRenewal.count({ where: { applied: false, billingCycleEnd: { gte: now, lte: weekEnd } } }),
    prisma.subscriptionRenewal.count({ where: { applied: false } }),
    prisma.subscriptionRenewal.count({ where: { applied: true } }),
    prisma.payment.count({ where: { status: 'FAILED' } }),
    prisma.upgradeRequest.count({ where: { status: 'MANUALLY_CONFIRMED' } }),
    prisma.subscriptionInvoice.findMany({ orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { name: true, email: true } } } }),
  ]);

  return NextResponse.json({
    invoices: { total: totalInvoices, paid: paidInvoices, overdue: overdueInvoices, pending: pendingInvoices },
    revenue: { mrr: Number(mrr._sum.amount || 0), arr: Number(arr._sum.amount || 0) },
    renewals: { dueToday: renewalsDueToday, dueThisWeek: renewalsDueWeek, queued: queuedRenewals, applied: appliedRenewals },
    payments: { failed: failedPayments, manualConfirmations: manualConfirms },
    recentInvoices,
  });
}
