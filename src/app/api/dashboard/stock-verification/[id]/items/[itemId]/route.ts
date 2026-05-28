import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; itemId: string } }
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
    select: { organizationId: true, status: true },
  });
  if (!ver || ver.organizationId !== orgId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (ver.status !== 'DRAFT' && ver.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Session is not active' }, { status: 400 });
  }

  const { status, verifiedLocation, notes } = await request.json();
  if (!status || !['VERIFIED', 'MISSING', 'MOVED', 'DAMAGED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const item = await prisma.stockVerificationItem.update({
    where: { id: params.itemId },
    data: {
      status,
      verifiedLocation: verifiedLocation || null,
      notes: notes || null,
      verifiedAt: new Date(),
      verifiedById: session.userId,
    },
  });

  if (ver.status === 'DRAFT') {
    await prisma.stockVerificationSession.update({
      where: { id: params.id },
      data: { status: 'ACTIVE', startedAt: new Date() },
    });
  }

  return NextResponse.json({ item });
}
