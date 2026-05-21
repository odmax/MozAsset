import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getPlanPrice, getMonthRange, type RevenueKPIs, type RevenueChartData, type TransactionRow } from '@/lib/billing-analytics';

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
  if (!dbAdmin || !hasPermission(dbAdmin, 'billing:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';
    const planFilter = searchParams.get('plan') || '';
    const providerFilter = searchParams.get('provider') || '';
    const dateFrom = searchParams.get('dateFrom') || '';
    const dateTo = searchParams.get('dateTo') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const fetchKPIs = searchParams.get('kpis') !== 'false';
    const fetchCharts = searchParams.get('charts') !== 'false';

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Transaction query
    const paymentWhere: any = {};
    if (statusFilter) paymentWhere.status = statusFilter;
    if (planFilter) paymentWhere.plan = planFilter;
    if (providerFilter) paymentWhere.provider = providerFilter;
    if (dateFrom || dateTo) {
      if (dateFrom) paymentWhere.createdAt = { ...paymentWhere.createdAt, gte: new Date(dateFrom) };
      if (dateTo) paymentWhere.createdAt = { ...paymentWhere.createdAt, lte: new Date(dateTo) };
    }

    const [payments, totalPayments] = await Promise.all([
      prisma.payment.findMany({
        where: paymentWhere,
        include: {
          user: {
            select: { id: true, email: true, name: true, organization: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where: paymentWhere }),
    ]);

    let transactions = payments.map((p) => {
      const amount = Number(p.amount);
      const vat = amount > 0 ? Math.round((amount - amount / 1.15) * 100) / 100 : 0;
      return {
        id: p.id,
        transactionId: p.id.slice(0, 8).toUpperCase(),
        customer: p.user.name || p.user.email,
        email: p.user.email,
        organization: p.user.organization?.name || null,
        plan: p.plan,
        amount,
        vat,
        netAmount: amount - vat,
        status: p.status,
        provider: p.provider,
        date: p.createdAt.toISOString(),
        reference: p.providerPaymentId,
        userId: p.user.id,
      } satisfies TransactionRow;
    });

    // Apply client-side search
    if (search) {
      const lower = search.toLowerCase();
      transactions = transactions.filter(
        (t) =>
          t.customer.toLowerCase().includes(lower) ||
          t.email.toLowerCase().includes(lower) ||
          (t.organization && t.organization.toLowerCase().includes(lower))
      );
    }

    let kpis: RevenueKPIs | null = null;
    if (fetchKPIs) {
      const [allPayments, monthPayments, todayPayments, users] = await Promise.all([
        prisma.payment.findMany({ select: { amount: true, status: true, createdAt: true } }),
        prisma.payment.findMany({ where: { createdAt: { gte: startOfMonth } }, select: { amount: true, status: true } }),
        prisma.payment.findMany({ where: { createdAt: { gte: startOfToday } }, select: { amount: true, status: true } }),
        prisma.user.count(),
      ]);

      const totalRevenue = allPayments.filter((p) => p.status === 'COMPLETED').reduce((s, p) => s + Number(p.amount), 0);
      const revenueThisMonth = monthPayments.filter((p) => p.status === 'COMPLETED').reduce((s, p) => s + Number(p.amount), 0);
      const revenueToday = todayPayments.filter((p) => p.status === 'COMPLETED').reduce((s, p) => s + Number(p.amount), 0);
      const failedPayments = allPayments.filter((p) => p.status === 'FAILED').reduce((s, p) => s + Number(p.amount), 0);
      const refunds = allPayments.filter((p) => p.status === 'REFUNDED').reduce((s, p) => s + Number(p.amount), 0);
      const netRevenue = totalRevenue - refunds;

      const outstandingPayments = allPayments.filter((p) => p.status === 'PENDING').reduce((s, p) => s + Number(p.amount), 0);

      kpis = {
        totalRevenue,
        revenueThisMonth,
        revenueToday,
        arpu: users > 0 ? Math.round((totalRevenue / users) * 100) / 100 : 0,
        failedPayments,
        refunds,
        netRevenue,
        outstandingRevenue: outstandingPayments,
      };
    }

    let charts: RevenueChartData | null = null;
    if (fetchCharts) {
      const completedPayments = await prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        select: { amount: true, plan: true, createdAt: true, provider: true },
        orderBy: { createdAt: 'asc' },
      });

      // Daily revenue (last 30 days)
      const dailyMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dailyMap.set(key, 0);
      }
      for (const p of completedPayments) {
        const key = p.createdAt.toISOString().slice(0, 10);
        if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) || 0) + Number(p.amount));
      }
      const dailyRevenue = Array.from(dailyMap.entries()).map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
      }));

      // Monthly revenue (last 12 months)
      const monthlyMap = new Map<string, number>();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(key, 0);
      }
      for (const p of completedPayments) {
        const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap.has(key)) monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(p.amount));
      }
      const monthlyRevenue = Array.from(monthlyMap.entries()).map(([month, revenue]) => ({
        month,
        revenue: Math.round(revenue * 100) / 100,
      }));

      // Yearly growth
      const yearlyMap = new Map<string, number>();
      for (const p of completedPayments) {
        const key = `${p.createdAt.getFullYear()}`;
        yearlyMap.set(key, (yearlyMap.get(key) || 0) + Number(p.amount));
      }
      const yearlyGrowth = Array.from(yearlyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, revenue]) => ({ year, revenue: Math.round(revenue * 100) / 100 }));

      // Payment success vs failed
      const allPaymentsForChart = await prisma.payment.findMany({
        select: { amount: true, status: true },
      });
      const statusAgg = new Map<string, { count: number; amount: number }>();
      for (const p of allPaymentsForChart) {
        const s = statusAgg.get(p.status) || { count: 0, amount: 0 };
        s.count++;
        s.amount += Number(p.amount);
        statusAgg.set(p.status, s);
      }
      const paymentSuccessVsFailed = Array.from(statusAgg.entries()).map(([status, data]) => ({
        status,
        count: data.count,
        amount: Math.round(data.amount * 100) / 100,
      }));

      // Revenue by plan
      const planAgg = new Map<string, { revenue: number; count: number }>();
      for (const p of completedPayments) {
        const plan = p.plan || 'UNKNOWN';
        const s = planAgg.get(plan) || { revenue: 0, count: 0 };
        s.revenue += Number(p.amount);
        s.count++;
        planAgg.set(plan, s);
      }
      const revenueByPlan = Array.from(planAgg.entries()).map(([plan, data]) => ({
        plan,
        revenue: Math.round(data.revenue * 100) / 100,
        count: data.count,
      }));

      charts = {
        dailyRevenue,
        monthlyRevenue,
        yearlyGrowth,
        paymentSuccessVsFailed,
        revenueByPlan,
      };
    }

    return NextResponse.json({
      kpis,
      charts,
      transactions,
      total: totalPayments,
      page,
      limit,
      totalPages: Math.ceil(totalPayments / limit),
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
