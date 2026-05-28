import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { orgId: string } }
) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.adminId },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'subscriptions:modify')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { accountManagerId, slaEnabled, slaFirstResponseMin, slaResolutionHours } = await request.json();
  const data: any = {};
  if (typeof accountManagerId !== 'undefined') data.accountManagerId = accountManagerId;
  if (typeof slaEnabled === 'boolean') data.slaEnabled = slaEnabled;
  if (slaFirstResponseMin) data.slaFirstResponseMin = Number(slaFirstResponseMin);
  if (slaResolutionHours) data.slaResolutionHours = Number(slaResolutionHours);

  const org = await prisma.organization.update({
    where: { id: params.orgId },
    data,
    select: {
      id: true, name: true, accountManagerId: true, slaEnabled: true, slaFirstResponseMin: true, slaResolutionHours: true,
      accountManager: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({ success: true, org });
}

export async function GET(
  _request: Request,
  { params }: { params: { orgId: string } }
) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.adminId },
    select: { id: true, role: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'billing:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: params.orgId },
    select: {
      id: true, name: true, plan: true, accountManagerId: true, slaEnabled: true,
      slaFirstResponseMin: true, slaResolutionHours: true,
      accountManager: { select: { id: true, name: true, email: true } },
    },
  });

  const accountManagers = await prisma.internalAdmin.findMany({
    where: { isActive: true, role: 'ACCOUNT_MANAGER' },
    select: { id: true, name: true, email: true },
  });

  const slaStats = await prisma.supportTicket.count({
    where: { organizationId: params.orgId },
  });

  const breached = await prisma.supportTicket.count({
    where: { organizationId: params.orgId, slaStatus: 'BREACHED' },
  });
  const resolvedInSla = await prisma.supportTicket.count({
    where: { organizationId: params.orgId, status: 'RESOLVED', slaStatus: { not: 'BREACHED' } },
  });

  return NextResponse.json({
    org: org || { id: params.orgId, name: '', plan: 'FREE', accountManagerId: null, slaEnabled: false, slaFirstResponseMin: 60, slaResolutionHours: 24, accountManager: null },
    accountManagers,
    slaStats: { totalTickets: slaStats, breached, resolvedInSla },
  });
}
