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

  const [org, ticketCount, breached, resolvedInSla, openTickets] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { slaEnabled: true, slaFirstResponseMin: true, slaResolutionHours: true, accountManager: { select: { id: true, name: true, email: true } } },
    }),
    prisma.supportTicket.count({ where: { organizationId: orgId } }),
    prisma.supportTicket.count({ where: { organizationId: orgId, slaStatus: 'BREACHED' } }),
    prisma.supportTicket.count({ where: { organizationId: orgId, status: 'RESOLVED', slaStatus: { not: 'BREACHED' } } }),
    prisma.supportTicket.findMany({
      where: { organizationId: orgId, status: { not: 'RESOLVED' } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, subject: true, priority: true, status: true, slaStatus: true, slaDeadline: true, createdAt: true },
    }),
  ]);

  return NextResponse.json({
    enabled: org?.slaEnabled || false,
    firstResponseMin: org?.slaFirstResponseMin || 60,
    resolutionHours: org?.slaResolutionHours || 24,
    accountManager: org?.accountManager || null,
    totalTickets: ticketCount,
    breached,
    resolvedInSla,
    openTickets,
  });
}
