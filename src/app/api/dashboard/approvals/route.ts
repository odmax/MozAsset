import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const url = new URL(request.url);
  const tab = url.searchParams.get('tab') || 'pending';

  const where: any = { organizationId: orgId };
  if (tab === 'pending') where.status = 'PENDING';
  else if (tab === 'my') where.requestedById = session.userId;

  const [approvals, org] = await Promise.all([
    prisma.approvalRequest.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        requestedBy: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { approvalEnabled: true, approvalRequiredActions: true, approvalDefaultApprovers: true },
    }),
  ]);

  return NextResponse.json({ approvals, settings: org });
}

export async function POST(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { type, targetType, targetId, reason } = await request.json();
  if (!type || !targetType || !targetId) {
    return NextResponse.json({ error: 'type, targetType, and targetId are required' }, { status: 400 });
  }

  const approval = await prisma.approvalRequest.create({
    data: { organizationId: orgId, requestedById: session.userId, type, targetType, targetId, reason: reason || null, status: 'PENDING' },
    include: { requestedBy: { select: { name: true } } },
  });

  return NextResponse.json({ approval });
}
