import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const sessions = await prisma.stockVerificationSession.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { select: { status: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({ sessions });
}

export async function POST(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { name, branchId, departmentId, locationId } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: 'Session name is required' }, { status: 400 });

  const verSession = await prisma.stockVerificationSession.create({
    data: {
      name: name.trim(),
      organizationId: orgId,
      branchId: branchId || null,
      departmentId: departmentId || null,
      locationId: locationId || null,
      status: 'DRAFT',
      createdById: session.userId,
    },
  });

  const assetWhere: any = { organizationId: orgId };
  if (branchId) assetWhere.branchId = branchId;
  if (departmentId) assetWhere.departmentId = departmentId;
  if (locationId) assetWhere.locationId = locationId;

  const assets = await prisma.asset.findMany({
    where: assetWhere,
    select: {
      id: true,
      locationId: true,
      assignedToId: true,
      assignedTo: { select: { name: true } },
      location: { select: { name: true } },
    },
  });

  if (assets.length > 0) {
    await prisma.stockVerificationItem.createMany({
      data: assets.map(a => ({
        sessionId: verSession.id,
        assetId: a.id,
        expectedLocation: a.location?.name || null,
        expectedUser: a.assignedTo?.name || null,
        status: 'PENDING',
      })),
    });
  }

  await prisma.auditLog.create({
    data: {
      action: 'CREATE' as any,
      entityType: 'StockVerificationSession',
      entityId: verSession.id,
      userId: session.userId,
      changes: { name, itemCount: assets.length },
    },
  }).catch(() => {});

  return NextResponse.json({ session: verSession, itemCount: assets.length });
}
