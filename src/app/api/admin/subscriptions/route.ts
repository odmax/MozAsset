import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getPlanPrice, type SubscriptionRow, type SubscriptionKPIs, type SubscriptionChartData } from '@/lib/billing-analytics';

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

export async function GET(request: Request) {
  const admin = getAdminSession();
  if (!admin || !admin.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.id },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'subscriptions:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const planFilter = searchParams.get('plan') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const fetchKPIs = searchParams.get('kpis') !== 'false';
    const fetchCharts = searchParams.get('charts') !== 'false';

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const where: any = {};

    if (status) {
      where.subscriptionStatus = status;
    }

    if (planFilter) {
      where.plan = planFilter;
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { organization: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (dateFrom || dateTo) {
      const createdAtFilter: Record<string, Date> = {};
      if (dateFrom) createdAtFilter.gte = new Date(dateFrom);
      if (dateTo) createdAtFilter.lte = new Date(dateTo);
      where.createdAt = createdAtFilter;
    }

    const orderBy: any = {};
    const validSortFields = ['createdAt', 'plan', 'subscriptionStatus', 'email', 'lastPaymentAt', 'billingPeriodEnd'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    orderBy[sortField] = sortOrder === 'asc' ? 'asc' : 'desc';

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          plan: true,
          subscriptionStatus: true,
          billingProvider: true,
          billingPeriodStart: true,
          billingPeriodEnd: true,
          lastPaymentAt: true,
          canceledAt: true,
          createdAt: true,
          organization: { select: { name: true } },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const subscriptions: SubscriptionRow[] = users.map((u) => {
      const planPrice = getPlanPrice(u.plan);
      return {
        id: u.id,
        userId: u.id,
        name: u.name,
        email: u.email,
        organization: u.organization?.name || null,
        plan: u.plan,
        status: u.subscriptionStatus,
        billingCycle: planPrice > 0 ? 'Monthly' : 'Free',
        amount: planPrice,
        startDate: u.billingPeriodStart ? u.billingPeriodStart.toISOString() : u.createdAt.toISOString(),
        renewalDate: u.billingPeriodEnd ? u.billingPeriodEnd.toISOString() : null,
        lastPayment: u.lastPaymentAt ? u.lastPaymentAt.toISOString() : null,
        autoRenew: u.subscriptionStatus === 'ACTIVE' && !u.canceledAt,
        paymentMethod: u.billingProvider === 'NONE' ? 'None' : u.billingProvider,
        canceledAt: u.canceledAt ? u.canceledAt.toISOString() : null,
      };
    });

    let kpis: SubscriptionKPIs | null = null;
    if (fetchKPIs) {
      const allUsers = await prisma.user.findMany({
        select: {
          plan: true,
          subscriptionStatus: true,
          canceledAt: true,
          billingPeriodEnd: true,
          createdAt: true,
        },
      });

      const activeSubscriptions = allUsers.filter(
        (u) => u.plan !== 'FREE' && u.subscriptionStatus === 'ACTIVE'
      ).length;
      const trialAccounts = allUsers.filter(
        (u) => u.subscriptionStatus === 'TRIALING'
      ).length;
      const cancelledSubscriptions = allUsers.filter(
        (u) => u.subscriptionStatus === 'CANCELED' || u.canceledAt
      ).length;
      const expiringSoon = allUsers.filter(
        (u) =>
          u.billingPeriodEnd &&
          u.billingPeriodEnd > now &&
          u.billingPeriodEnd < thirtyDaysFromNow
      ).length;

      const paidUsers = allUsers.filter((u) => u.plan !== 'FREE' && u.subscriptionStatus === 'ACTIVE');
      const mrr = paidUsers.reduce((sum, u) => sum + getPlanPrice(u.plan), 0);
      const arr = mrr * 12;

      const totalUsers = allUsers.length;
      const payingUsers = paidUsers.length;
      const conversionRate = totalUsers > 0 ? (payingUsers / totalUsers) * 100 : 0;

      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const activeAtStart = allUsers.filter(
        (u) => u.createdAt < thirtyDaysAgo && u.subscriptionStatus !== 'CANCELED'
      ).length;
      const cancelledLastMonth = allUsers.filter(
        (u) => u.canceledAt && u.canceledAt >= thirtyDaysAgo
      ).length;
      const churnRate = (activeAtStart + cancelledLastMonth) > 0
        ? (cancelledLastMonth / (activeAtStart + cancelledLastMonth)) * 100
        : 0;

      kpis = {
        activeSubscriptions,
        trialAccounts,
        cancelledSubscriptions,
        expiringSoon,
        mrr,
        arr,
        conversionRate: Math.round(conversionRate * 10) / 10,
        churnRate: Math.round(churnRate * 10) / 10,
      };
    }

    let charts: SubscriptionChartData | null = null;
    if (fetchCharts) {
      const allUsers = await prisma.user.findMany({
        select: { plan: true, subscriptionStatus: true, canceledAt: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      const monthMap = new Map<string, { total: number; cancelled: number; new: number }>();
      for (const u of allUsers) {
        const createdKey = `${u.createdAt.getFullYear()}-${String(u.createdAt.getMonth() + 1).padStart(2, '0')}`;
        let entry = monthMap.get(createdKey);
        if (!entry) { entry = { total: 0, cancelled: 0, new: 0 }; monthMap.set(createdKey, entry); }
        entry.total++;
        entry.new++;

        if (u.canceledAt) {
          const cancelKey = `${u.canceledAt.getFullYear()}-${String(u.canceledAt.getMonth() + 1).padStart(2, '0')}`;
          let cancelEntry = monthMap.get(cancelKey);
          if (!cancelEntry) { cancelEntry = { total: 0, cancelled: 0, new: 0 }; monthMap.set(cancelKey, cancelEntry); }
          cancelEntry.cancelled++;
        }
      }

      let runningTotal = 0;
      const subscriptionGrowth: { month: string; count: number }[] = [];
      const churnTrend: { month: string; cancelled: number; new: number }[] = [];
      const sortedMonths = Array.from(monthMap.entries()).sort(([a], [b]) => a.localeCompare(b));
      for (const [month, data] of sortedMonths) {
        runningTotal += data.new - data.cancelled;
        subscriptionGrowth.push({ month, count: runningTotal });
        churnTrend.push({ month, cancelled: data.cancelled, new: data.new });
      }

      const totalPlanUsers = allUsers.length;
      const planDistMap = new Map<string, number>();
      for (const u of allUsers) {
        planDistMap.set(u.plan, (planDistMap.get(u.plan) || 0) + 1);
      }
      const planDistribution = Array.from(planDistMap.entries()).map(([plan, count]) => ({
        plan,
        count,
        percentage: totalPlanUsers > 0 ? Math.round((count / totalPlanUsers) * 1000) / 10 : 0,
      }));

      charts = {
        subscriptionGrowth,
        planDistribution,
        churnTrend,
        conversionFunnel: [
          { stage: 'Signed Up', count: allUsers.length },
          { stage: 'Active (non-trial)', count: allUsers.filter((u) => u.subscriptionStatus !== 'CANCELED').length },
          { stage: 'Paid Plan', count: allUsers.filter((u) => u.plan !== 'FREE').length },
          { stage: 'Active Paid', count: allUsers.filter((u) => u.plan !== 'FREE' && u.subscriptionStatus === 'ACTIVE').length },
        ],
      };
    }

    return NextResponse.json({
      subscriptions,
      kpis,
      charts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
