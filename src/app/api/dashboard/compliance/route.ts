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

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalAuditLogs,
    recentAuditLogs,
    pendingApprovals,
    approvalStats,
    activeVerifications,
    verificationStats,
    breachedTickets,
    slaStats,
    securityEvents,
  ] = await Promise.all([
    prisma.auditLog.count({ where: { createdAt: { gte: thirtyDaysAgo }, user: { organizationId: orgId } } }),
    prisma.auditLog.findMany({ where: { user: { organizationId: orgId } }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, action: true, entityType: true, userId: true, createdAt: true } }),
    prisma.approvalRequest.count({ where: { organizationId: orgId, status: 'PENDING' } }),
    prisma.approvalRequest.groupBy({ by: ['status'], where: { organizationId: orgId, decidedAt: { gte: thirtyDaysAgo } }, _count: true }),
    prisma.stockVerificationSession.count({ where: { organizationId: orgId, status: { in: ['DRAFT', 'ACTIVE'] } } }),
    prisma.stockVerificationItem.groupBy({ by: ['status'], where: { session: { organizationId: orgId } }, _count: true }),
    prisma.supportTicket.count({ where: { organizationId: orgId, slaStatus: 'BREACHED' } }),
    prisma.supportTicket.findMany({ where: { organizationId: orgId, slaStatus: { not: null } }, orderBy: { createdAt: 'desc' }, take: 5, select: { id: true, subject: true, slaStatus: true, createdAt: true } }),
    prisma.auditLog.count({ where: { createdAt: { gte: thirtyDaysAgo }, action: { in: ['LOGIN_FAILED', 'SECURITY_ALERT', 'CSRF_VIOLATION', 'RATE_LIMIT_HIT', 'UNAUTHORIZED_ACCESS'] }, user: { organizationId: orgId } } }),
  ]);

  const approvedToday = approvalStats.find(a => a.status === 'APPROVED')?._count || 0;
  const rejectedToday = approvalStats.find(a => a.status === 'REJECTED')?._count || 0;
  const totalVerItems = verificationStats.reduce((s, i) => s + i._count, 0);
  const missingItems = verificationStats.find(i => i.status === 'MISSING')?._count || 0;
  const damagedItems = verificationStats.find(i => i.status === 'DAMAGED')?._count || 0;

  const score = Math.min(100, Math.max(0, 100
    - (pendingApprovals * 5)
    - (breachedTickets * 10)
    - (securityEvents * 2)
    - (missingItems * 3)
    - (damagedItems * 2)
  ));

  return NextResponse.json({
    kpis: {
      totalAuditLogs, pendingApprovals, activeVerifications, securityEvents, breachedTickets,
      missingItems, damagedItems, approvedToday, rejectedToday, score,
    },
    recentAuditLogs,
    approvalStats: { pending: pendingApprovals, approved: approvedToday, rejected: rejectedToday },
    verificationStats: { active: activeVerifications, missing: missingItems, damaged: damagedItems, total: totalVerItems },
    slaStats,
  });
}
