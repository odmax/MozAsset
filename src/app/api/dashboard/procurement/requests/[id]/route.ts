import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const s = getSimpleUserSession();
  if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(s.plan as any)) return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  const orgId = s.organizationId; if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });
  const existing = await prisma.purchaseRequest.findUnique({ where: { id: params.id } });
  if (!existing || existing.organizationId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { status, rejectedReason } = await request.json();
  const data: any = {};
  if (status === 'APPROVED') { data.status = 'APPROVED'; data.approvedById = s.userId; data.approvedAt = new Date(); }
  else if (status === 'REJECTED') { data.status = 'REJECTED'; data.rejectedReason = rejectedReason; data.approvedById = s.userId; }
  else if (status === 'CANCELLED') data.status = 'CANCELLED';
  else return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  const req = await prisma.purchaseRequest.update({ where: { id: params.id }, data, include: { requestedBy: { select: { name: true } }, approvedBy: { select: { name: true } } } });
  return NextResponse.json({ request: req });
}
