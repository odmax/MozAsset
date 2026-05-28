import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const ver = await prisma.stockVerificationSession.findUnique({
    where: { id: params.id },
    select: { organizationId: true, status: true, items: { select: { status: true } } },
  });
  if (!ver || ver.organizationId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (ver.status === 'COMPLETED' || ver.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Session is already finished' }, { status: 400 });
  }

  const pending = ver.items.filter(i => i.status === 'PENDING');
  if (pending.length > 0) {
    return NextResponse.json({ error: `${pending.length} items still pending verification` }, { status: 400 });
  }

  await prisma.stockVerificationSession.update({
    where: { id: params.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE' as any,
      entityType: 'StockVerificationSession',
      entityId: params.id,
      userId: session.userId,
      changes: { action: 'completed', totalItems: ver.items.length },
    },
  }).catch(() => {});

  return NextResponse.json({ success: true, status: 'COMPLETED' });
}
