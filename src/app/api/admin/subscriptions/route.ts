import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = {
      plan: { not: 'FREE' },
    };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.subscriptionStatus = status;
    }

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
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const subscriptions = users.map((u) => ({
      id: u.id,
      userId: u.id,
      email: u.email,
      name: u.name,
      plan: u.plan,
      billingProvider: u.billingProvider,
      subscriptionStatus: u.subscriptionStatus,
      billingPeriodStart: u.billingPeriodStart,
      billingPeriodEnd: u.billingPeriodEnd,
      lastPaymentAt: u.lastPaymentAt,
      canceledAt: u.canceledAt,
    }));

    return NextResponse.json({
      subscriptions,
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