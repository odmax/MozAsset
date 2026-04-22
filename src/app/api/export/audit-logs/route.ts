import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { canAccessFeature } from '@/lib/billing';
import type { Plan } from '@prisma/client';
import { formatDateTime } from '@/lib/utils';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(request: Request) {
  const user = getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canAccessFeature((user.plan || 'FREE') as Plan, 'exports')) {
    return NextResponse.json(
      { error: 'PLAN_LIMIT_EXCEEDED', feature: 'exports' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') || '';
  const action = searchParams.get('action') || '';
  const entityType = searchParams.get('entityType') || '';

  const where: any = {};
  if (search) {
    where.OR = [
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { asset: { assetTag: { contains: search, mode: 'insensitive' } } },
      { asset: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;

  const logs = await prisma.auditLog.findMany({
    where,
    include: {
      user: { select: { name: true, email: true } },
      asset: { select: { assetTag: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 1000,
  });

  const csv = [
    'Timestamp,User,Email,Action,EntityType,EntityId,AssetTag,AssetName,Changes,Metadata',
    ...logs.map(log => [
      formatDateTime(log.createdAt).replace(/,/g, ';'),
      `"${(log.user.name || '').replace(/"/g, '""')}"`,
      log.user.email,
      log.action,
      log.entityType,
      log.entityId,
      log.asset?.assetTag || '',
      `"${(log.asset?.name || '').replace(/"/g, '""')}"`,
      log.changes ? `"${JSON.stringify(log.changes).replace(/"/g, '""')}"` : '',
      log.metadata ? `"${JSON.stringify(log.metadata).replace(/"/g, '""')}"` : '',
    ].join(','))
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="audit-logs.csv"',
    },
  });
}