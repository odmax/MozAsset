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
    const payments = await prisma.payment.findMany({
      include: {
        user: {
          select: { email: true, name: true, organization: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    const headers = [
      'Transaction ID', 'Customer', 'Email', 'Organization', 'Plan',
      'Amount', 'Net Amount', 'VAT', 'Currency', 'Status', 'Provider', 'Reference',
      'Date', 'Period Start', 'Period End',
    ].join(',');

    const rows = payments.map((p) => {
      const amount = Number(p.amount);
      const vatRate = 0.15;
      const vat = amount > 0 ? Math.round((amount - amount / (1 + vatRate)) * 100) / 100 : 0;
      const netAmount = amount - vat;
      const escape = (v: string | null | undefined) => {
        if (!v) return '';
        const s = String(v).replace(/"/g, '""');
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
      };
      return [
        p.id.slice(0, 8).toUpperCase(),
        escape(p.user.name || p.user.email),
        p.user.email,
        escape(p.user.organization?.name),
        p.plan || '',
        amount.toFixed(2),
        netAmount.toFixed(2),
        vat.toFixed(2),
        p.currency,
        p.status,
        p.provider,
        p.providerPaymentId || '',
        p.createdAt.toISOString().slice(0, 10),
        p.periodStart ? p.periodStart.toISOString().slice(0, 10) : '',
        p.periodEnd ? p.periodEnd.toISOString().slice(0, 10) : '',
      ].join(',');
    });

    const csv = [headers, ...rows].join('\n');

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="revenue-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export revenue error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
