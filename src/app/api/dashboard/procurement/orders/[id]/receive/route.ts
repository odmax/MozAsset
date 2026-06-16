import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const s = getSimpleUserSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(s.plan as any)) return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  const orgId = s.organizationId; if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const po = await prisma.purchaseOrder.findUnique({ where: { id: params.id }, include: { items: true } });
  if (!po || po.organizationId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (po.status === 'RECEIVED') return NextResponse.json({ error: 'Already fully received' }, { status: 400 });

  const { items } = await request.json();
  let allReceived = true;
  for (const item of items) {
    await prisma.purchaseOrderItem.update({ where: { id: item.id }, data: { receivedQuantity: { increment: item.qty || 0 } } });
    const updated = await prisma.purchaseOrderItem.findUnique({ where: { id: item.id }, select: { quantity: true, receivedQuantity: true } });
    if (updated && updated.receivedQuantity < updated.quantity) allReceived = false;
  }

  const status = allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
  const data: any = { status };
  if (allReceived) data.receivedDate = new Date();

  const updated = await prisma.purchaseOrder.update({ where: { id: params.id }, data, include: { items: true } });
  return NextResponse.json({ order: updated });
}
