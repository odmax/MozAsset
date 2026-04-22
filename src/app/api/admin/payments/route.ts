import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {};

    if (statusFilter) {
      where.status = statusFilter;
    }

    const [invoices, totalAll] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          user: {
            select: { 
              id: true, 
              email: true, 
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    let filteredInvoices = invoices;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredInvoices = invoices.filter(
        (i) =>
          i.user.email.toLowerCase().includes(searchLower) ||
          (i.user.name && i.user.name.toLowerCase().includes(searchLower))
      );
    }

    const totalAmount = filteredInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
    const successfulInvoices = filteredInvoices.filter((i) => i.status === 'COMPLETED');
    const successfulAmount = successfulInvoices.reduce((sum, i) => sum + Number(i.amount), 0);
    const failedInvoices = filteredInvoices.filter((i) => i.status === 'FAILED');
    const failedAmount = failedInvoices.reduce((sum, i) => sum + Number(i.amount), 0);

    return NextResponse.json({
      payments: filteredInvoices.map((i) => ({
        id: i.id,
        amount: i.amount,
        currency: i.currency,
        status: i.status,
        provider: i.provider,
        providerPaymentId: i.providerPaymentId,
        userEmail: i.user.email,
        userName: i.user.name,
        organizationName: null,
        plan: null,
        billingPeriodStart: i.periodStart ? i.periodStart.toISOString() : null,
        billingPeriodEnd: i.periodEnd ? i.periodEnd.toISOString() : null,
        paidAt: i.paidAt ? i.paidAt.toISOString() : null,
        createdAt: i.createdAt.toISOString(),
      })),
      total: totalAll,
      page,
      limit,
      totalPages: Math.ceil(totalAll / limit),
      totalAmount,
      successfulAmount,
      failedAmount,
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}