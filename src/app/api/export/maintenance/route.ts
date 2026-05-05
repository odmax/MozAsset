import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { canAccessFeature } from '@/lib/billing';
import type { Plan } from '@prisma/client';
import { formatDate } from '@/lib/utils';
import { getCurrentUserContext } from '@/lib/user-context';

export async function GET(request: Request) {
  const context = await getCurrentUserContext();
  if (!context) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!canAccessFeature((context.plan || 'FREE') as Plan, 'exports')) {
    return NextResponse.json(
      { error: 'PLAN_LIMIT_EXCEEDED', feature: 'exports' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || '';

  const where: any = {};
  if (!context.isInternalAdmin) {
    where.organizationId = context.organizationId || 'never-match';
  }
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