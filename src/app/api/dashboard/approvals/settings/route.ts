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

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { approvalEnabled: true, approvalRequiredActions: true, approvalDefaultApprovers: true },
  });

  return NextResponse.json({ settings: org });
}

export async function PATCH(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { enabled, actions, defaultApprovers } = await request.json();

  const data: any = {};
  if (typeof enabled === 'boolean') data.approvalEnabled = enabled;
  if (actions) data.approvalRequiredActions = actions;
  if (defaultApprovers) data.approvalDefaultApprovers = defaultApprovers;

  const org = await prisma.organization.update({
    where: { id: orgId },
    data,
    select: { approvalEnabled: true, approvalRequiredActions: true, approvalDefaultApprovers: true },
  });

  return NextResponse.json({ settings: org });
}
