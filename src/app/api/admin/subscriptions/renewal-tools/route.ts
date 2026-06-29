import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import { createCheckoutPayload, getPayfastBaseUrl } from '@/lib/payfast';
import type { Plan } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({ where: { id: admin.adminId }, select: { id: true, role: true } });
  if (!dbAdmin || !hasPermission(dbAdmin, 'subscriptions:read')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [pastDue, gracePeriod, suspended, recentRenewals] = await Promise.all([
    prisma.user.findMany({ where: { subscriptionStatus: 'PAST_DUE' }, select: { id: true, name: true, email: true, plan: true, billingPeriodEnd: true, gracePeriodEnd: true, renewalReminderSentAt: true }, orderBy: { billingPeriodEnd: 'asc' } }),
    prisma.user.findMany({ where: { subscriptionStatus: 'GRACE_PERIOD' }, select: { id: true, name: true, email: true, plan: true, billingPeriodEnd: true, gracePeriodEnd: true }, orderBy: { billingPeriodEnd: 'asc' } }),
    prisma.user.findMany({ where: { subscriptionStatus: 'SUSPENDED' }, select: { id: true, name: true, email: true, plan: true }, orderBy: { billingPeriodEnd: 'asc' } }),
    prisma.payment.findMany({ where: { status: 'COMPLETED', createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, amount: true, plan: true, createdAt: true, user: { select: { name: true, email: true } } } }),
  ]);

  return NextResponse.json({ pastDue, gracePeriod, suspended, recentRenewals });
}

export async function POST(request: Request) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const dbAdmin = await prisma.internalAdmin.findUnique({ where: { id: admin.adminId }, select: { id: true, role: true } });
  if (!dbAdmin || !hasPermission(dbAdmin, 'subscriptions:modify')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action, userId } = await request.json();

  if (action === 'remind') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, plan: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    await prisma.user.update({ where: { id: userId }, data: { renewalReminderSentAt: new Date() } });
    return NextResponse.json({ success: true, message: `Reminder sent to ${user.email}` });
  }

  if (action === 'reactivate') {
    await prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: 'ACTIVE', billingPeriodStart: new Date(), billingPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), gracePeriodEnd: null } });
    return NextResponse.json({ success: true });
  }

  if (action === 'suspend') {
    await prisma.user.update({ where: { id: userId }, data: { subscriptionStatus: 'SUSPENDED' } });
    return NextResponse.json({ success: true });
  }

  if (action === 'generate-link') {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, name: true, plan: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    const payload = createCheckoutPayload(userId, user.email, user.name || 'Customer', user.plan as Plan);
    return NextResponse.json({ checkoutUrl: getPayfastBaseUrl() + '/eng/process', checkoutData: payload });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
