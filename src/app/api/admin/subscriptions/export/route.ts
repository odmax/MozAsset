import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { getPlanPrice } from '@/lib/billing-analytics';

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
    const users = await prisma.user.findMany({
      select: {
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
      orderBy: { createdAt: 'desc' },
      take: 5000,
    });

    const headers = [
      'Name', 'Email', 'Organization', 'Plan', 'Status',
      'Amount', 'Billing Cycle', 'Start Date', 'Renewal Date',
      'Last Payment', 'Payment Method', 'Auto Renew', 'Canceled At',
    ].join(',');

    const rows = users.map((u) => {
      const price = getPlanPrice(u.plan);
      const escape = (v: string | null | undefined) => {
        if (!v) return '';
        const s = String(v).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
      };
      return [
        escape(u.name),
        escape(u.email),
        escape(u.organization?.name),
        u.plan,
        u.subscriptionStatus,
        price,
        price > 0 ? 'Monthly' : 'Free',
        u.billingPeriodStart ? u.billingPeriodStart.toISOString().slice(0, 10) : u.createdAt.toISOString().slice(0, 10),
        u.billingPeriodEnd ? u.billingPeriodEnd.toISOString().slice(0, 10) : '',
        u.lastPaymentAt ? u.lastPaymentAt.toISOString().slice(0, 10) : '',
        u.billingProvider === 'NONE' ? 'None' : u.billingProvider,
        u.subscriptionStatus === 'ACTIVE' && !u.canceledAt ? 'Yes' : 'No',
        u.canceledAt ? u.canceledAt.toISOString().slice(0, 10) : '',
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="subscriptions-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export subscriptions error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
