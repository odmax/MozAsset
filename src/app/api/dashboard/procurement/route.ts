import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
export const dynamic = 'force-dynamic';

export async function GET() {
  const s = getSimpleUserSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(s.plan as any)) return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  const orgId = s.organizationId; if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const [reqs, orders, vendorSpend] = await Promise.all([
    prisma.purchaseRequest.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 20, include: { requestedBy: { select: { name: true, email: true } }, approvedBy: { select: { name: true } } } }),
    prisma.purchaseOrder.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' }, take: 20, include: { vendor: { select: { name: true } }, createdBy: { select: { name: true, email: true } }, items: true } }),
    prisma.purchaseOrder.groupBy({ by: ['vendorId'], where: { organizationId: orgId, status: 'RECEIVED' }, _sum: { total: true } }),
  ]);

  const openReqs = reqs.filter(r => r.status === 'SUBMITTED').length;
  const pendingApproval = reqs.filter(r => r.status === 'SUBMITTED').length + orders.filter(o => o.status === 'PENDING_APPROVAL').length;
  const activeOrders = orders.filter(o => !['RECEIVED', 'CANCELLED'].includes(o.status)).length;
  const outstandingValue = orders.reduce((sum, o) => !['RECEIVED', 'CANCELLED'].includes(o.status) ? sum + (Number(o.total) || 0) : sum, 0);

  const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const receivedThisMonth = orders.filter(o => o.status === 'RECEIVED' && o.receivedDate && new Date(o.receivedDate) >= monthStart).reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return NextResponse.json({ overview: { openReqs, pendingApproval, activeOrders, outstandingValue, receivedThisMonth }, requests: reqs, orders, vendorSpend });
}

export async function POST(request: Request) {
  const s = getSimpleUserSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(s.plan as any)) return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  const orgId = s.organizationId; if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { type, ...body } = await request.json();
  if (type === 'request') {
    const { title, justification } = body;
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });
    const req = await prisma.purchaseRequest.create({ data: { organizationId: orgId, requestedById: s.userId, title, justification, status: 'SUBMITTED' }, include: { requestedBy: { select: { name: true } } } });
    return NextResponse.json({ request: req });
  }
  if (type === 'order') {
    const { vendorId, items, notes } = body;
    if (!items?.length) return NextResponse.json({ error: 'Items required' }, { status: 400 });
    const poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
    const subtotal = items.reduce((sum: number, i: any) => sum + ((i.quantity || 1) * (Number(i.unitPrice) || 0)), 0);
    const tax = subtotal * 0.15;
    const total = subtotal + tax;
    const order = await prisma.purchaseOrder.create({
      data: { poNumber, organizationId: orgId, vendorId: vendorId || null, status: 'DRAFT', createdById: s.userId, subtotal, tax, total, notes, items: { create: items.map((i: any) => ({ description: i.description || '', quantity: i.quantity || 1, unitPrice: i.unitPrice || 0, totalPrice: (i.quantity || 1) * (Number(i.unitPrice) || 0) })) } },
      include: { vendor: { select: { name: true } }, items: true },
    });
    return NextResponse.json({ order });
  }
  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
