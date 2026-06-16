import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const s = getSimpleUserSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(s.plan as any)) return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  const orgId = s.organizationId; if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });
  const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id }, include: { vendor: { select: { name: true } }, createdBy: { select: { name: true } }, items: true } });
  if (!po || po.organizationId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ order: po });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const s = getSimpleUserSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(s.plan as any)) return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  const orgId = s.organizationId; if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });
  const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id } });
  if (!po || po.organizationId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { status } = await request.json();
  const data: any = { status };
  if (status === 'APPROVED') { data.approvedById = s.userId; data.approvedAt = new Date(); }
  if (status === 'SENT' && !po.orderDate) data.orderDate = new Date();

  const updated = await prisma.purchaseOrder.update({ where: { id: params.id }, data, include: { vendor: { select: { name: true } }, items: true } });
  return NextResponse.json({ order: updated });
}
