import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { status, notes } = await request.json();
  if (!status || !['APPROVED', 'REJECTED', 'CANCELLED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const approval = await prisma.approvalRequest.findUnique({
    where: { id: params.id },
    include: { requestedBy: { select: { id: true, name: true } } },
  });

  if (!approval || approval.organizationId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (approval.status !== 'PENDING') {
    return NextResponse.json({ error: 'Already decided' }, { status: 400 });
  }

  const updated = await prisma.approvalRequest.update({
    where: { id: params.id },
    data: { status, approverId: session.userId, notes: notes || null, decidedAt: new Date() },
    include: {
      requestedBy: { select: { id: true, name: true } },
      approver: { select: { name: true } },
    },
  });

  const notifTitle = status === 'APPROVED' ? 'Request Approved' : 'Request Rejected';
  const notifMsg = `Your ${approval.type.toLowerCase()} request for ${approval.targetType} was ${status.toLowerCase()}`;

  createNotification({
    userId: approval.requestedBy.id,
    type: status === 'APPROVED' ? 'TICKET_RESOLVED' as any : 'TICKET_ESCALATED' as any,
    title: notifTitle,
    message: notifMsg,
    link: '/dashboard/approvals',
  }).catch(() => {});

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE' as any,
      entityType: 'ApprovalRequest',
      entityId: params.id,
      userId: session.userId,
      changes: { status, decidedBy: session.userId, previousStatus: 'PENDING' },
    },
  }).catch(() => {});

  return NextResponse.json({ approval: updated });
}
