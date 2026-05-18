import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

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

export async function GET() {
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
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [allInvoices, monthlyInvoices, yearlyInvoices] = await Promise.all([
      prisma.payment.findMany({
        where: { status: 'COMPLETED' },
        select: { amount: true, plan: true, createdAt: true },
      }),
      prisma.payment.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } },
        select: { amount: true },
      }),
      prisma.payment.findMany({
        where: { status: 'COMPLETED', createdAt: { gte: startOfYear } },
        select: { amount: true },
      }),
    ]);

    const totalRevenue = allInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
    const monthlyRevenue = monthlyInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
    const yearlyRevenue = yearlyInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

    const revenueByPlan: Record<string, number> = {};
    allInvoices.forEach((i) => {
      const plan = i.plan || 'UNKNOWN';
      revenueByPlan[plan] = (revenueByPlan[plan] || 0) + Number(i.amount);
    });

    const planDistribution: Record<string, number> = {};
    const allUsers = await prisma.user.findMany({
      select: { plan: true },
    });
    allUsers.forEach((u) => {
      planDistribution[u.plan] = (planDistribution[u.plan] || 0) + 1;
    });

    const revenueOverTime: Array<{ month: string; revenue: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      
      const monthInvoices = allInvoices.filter(
        (inv) => inv.createdAt >= monthStart && inv.createdAt <= monthEnd
      );
      const revenue = monthInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
      
      revenueOverTime.push({
        month: d.toLocaleDateString('en-ZA', { month: 'short' }),
        revenue,
      });
    }

    const mrr = monthlyRevenue;
    const arr = monthlyRevenue * 12;

    return NextResponse.json({
      totalRevenue,
      monthlyRevenue,
      yearlyRevenue,
      mrr,
      arr,
      revenueByPlan: Object.entries(revenueByPlan).map(([plan, revenue]) => ({
        plan,
        revenue,
      })),
      planDistribution: Object.entries(planDistribution).map(([plan, count]) => ({
        plan,
        count,
      })),
      revenueOverTime,
    });
  } catch (error) {
    console.error('Get revenue error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}