import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || '';
  const assetId = url.searchParams.get('assetId') || '';

  const where: any = { asset: { organizationId: orgId } };
  if (status) where.status = status;
  if (assetId) where.assetId = assetId;

  const records = await prisma.maintenance.findMany({
    where,
    orderBy: { scheduledDate: 'asc' },
    include: { asset: { select: { id: true, name: true, assetTag: true } }, performedByUser: { select: { name: true } } },
  });

  return NextResponse.json({ records });
}

export async function POST(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { assetId, type, description, scheduledDate, cost, vendorId, recurrence, notes } = await request.json();
  if (!assetId || !type || !description) return NextResponse.json({ error: 'assetId, type, and description are required' }, { status: 400 });

  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { organizationId: true } });
  if (!asset || asset.organizationId !== orgId) return NextResponse.json({ error: 'Asset not found' }, { status: 404 });

  const record = await prisma.maintenance.create({
    data: {
      assetId, type, description, scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      cost: cost || null, vendorId: vendorId || null, recurrence: recurrence || 'none',
      status: 'SCHEDULED', notes: notes || null, performedBy: session.userId,
    },
    include: { asset: { select: { name: true, assetTag: true } } },
  });

  await prisma.auditLog.create({
    data: { action: 'MAINTENANCE' as any, entityType: 'Maintenance', entityId: record.id, userId: session.userId, changes: { action: 'scheduled', assetId, type } },
  }).catch(() => {});

  return NextResponse.json({ record });
}
