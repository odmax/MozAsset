import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function DELETE(
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

  const existing = await prisma.apiKey.findUnique({
    where: { id: params.id },
    select: { organizationId: true },
  });

  if (!existing || existing.organizationId !== orgId) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  await prisma.apiKey.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE' as any,
      entityType: 'ApiKey',
      entityId: params.id,
      userId: session.userId,
      changes: { action: 'revoked' },
    },
  }).catch(() => {});

  return NextResponse.json({ success: true });
}
