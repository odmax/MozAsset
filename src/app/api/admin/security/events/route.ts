import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import type { AuditAction } from '@prisma/client';

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

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
  const action = searchParams.get('action');

  const securityActions: AuditAction[] = [
    'LOGIN_FAILED', 'LOGIN_SUCCESS', 'SECURITY_ALERT',
    'CSRF_VIOLATION', 'RATE_LIMIT_HIT', 'UNAUTHORIZED_ACCESS',
  ];

  const where: Record<string, unknown> = {
    action: action ? { equals: action } : { in: securityActions },
  };

  const [events, total, actionCounts] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        userId: true,
        metadata: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({
      by: ['action'],
      where: { action: { in: securityActions } },
      _count: true,
      orderBy: { _count: { action: 'desc' } },
    }),
  ]);

  return NextResponse.json({
    events,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    actionCounts,
  });
}
