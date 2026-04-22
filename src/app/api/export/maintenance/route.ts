import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { canAccessFeature } from '@/lib/billing';
import type { Plan } from '@prisma/client';
import { formatDate } from '@/lib/utils';

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
  const type = searchParams.get('type') || '';

  const where: any = {};
  if (type) where.type = type;

  const maintenances = await prisma.maintenance.findMany({
    where,
    include: {
      asset: { select: { assetTag: true, name: true } },
      performedByUser: { select: { name: true, email: true } },
    },
    orderBy: { performedAt: 'desc' },
    take: 5000,
  });

  const csv = [
    'Date,AssetTag,AssetName,Type,Description,Cost,PerformedBy,NextDueDate,Notes',
    ...maintenances.map(m => [
      formatDate(m.performedAt),
      m.asset?.assetTag || '',
      `"${(m.asset?.name || '').replace(/"/g, '""')}"`,
      m.type,
      `"${(m.description || '').replace(/"/g, '""')}"`,
      m.cost ? m.cost.toString() : '',
      m.performedByUser?.name || '',
      m.nextDueDate ? formatDate(m.nextDueDate) : '',
      `"${(m.notes || '').replace(/"/g, '""')}"`,
    ].join(','))
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="maintenance.csv"',
    },
  });
}