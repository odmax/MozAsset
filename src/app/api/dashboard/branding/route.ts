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
    select: { logo: true, favicon: true, reportLogoUrl: true, primaryColor: true, secondaryColor: true, brandName: true },
  });

  return NextResponse.json({ branding: org || {} });
}

export async function PATCH(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }
  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { primaryColor, secondaryColor, brandName, reportLogoUrl } = await request.json();
  const data: any = {};
  if (primaryColor) data.primaryColor = primaryColor;
  if (secondaryColor) data.secondaryColor = secondaryColor;
  if (typeof brandName === 'string') data.brandName = brandName;
  if (typeof reportLogoUrl === 'string') data.reportLogoUrl = reportLogoUrl;

  const org = await prisma.organization.update({
    where: { id: orgId },
    data,
    select: { logo: true, favicon: true, reportLogoUrl: true, primaryColor: true, secondaryColor: true, brandName: true },
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE' as any,
      entityType: 'Organization',
      entityId: orgId,
      userId: session.userId,
      changes: data,
    },
  }).catch(() => {});

  return NextResponse.json({ branding: org });
}
