import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const existing = await prisma.maintenance.findUnique({ where: { id: params.id }, include: { asset: { select: { organizationId: true } } } });
  if (!existing || existing.asset.organizationId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { status, completedDate, scheduledDate, type, description, cost, vendorId, recurrence, notes } = await request.json();
  const data: any = {};
  if (status) data.status = status;
  if (completedDate) data.completedDate = new Date(completedDate);
  if (scheduledDate) data.scheduledDate = new Date(scheduledDate);
  if (type) data.type = type;
  if (description) data.description = description;
  if (cost !== undefined) data.cost = cost;
  if (vendorId !== undefined) data.vendorId = vendorId;
  if (recurrence) data.recurrence = recurrence;
  if (notes !== undefined) data.notes = notes;
  if (status === 'COMPLETED') data.completedDate = new Date();
  if (status === 'COMPLETED' && !data.performedBy) data.performedBy = session.userId;

  const record = await prisma.maintenance.update({ where: { id: params.id }, data, include: { asset: { select: { name: true, assetTag: true } } } });

  await prisma.auditLog.create({
    data: { action: 'UPDATE' as any, entityType: 'Maintenance', entityId: params.id, userId: session.userId, changes: { action: status === 'COMPLETED' ? 'completed' : 'updated' } },
  }).catch(() => {});

  return NextResponse.json({ record });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const existing = await prisma.maintenance.findUnique({ where: { id: params.id }, include: { asset: { select: { organizationId: true } } } });
  if (!existing || existing.asset.organizationId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await prisma.maintenance.delete({ where: { id: params.id } });

  await prisma.auditLog.create({
    data: { action: 'DELETE' as any, entityType: 'Maintenance', entityId: params.id, userId: session.userId },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
