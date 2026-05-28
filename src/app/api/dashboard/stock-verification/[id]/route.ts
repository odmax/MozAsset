import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';

export const dynamic = 'force-dynamic';

export async function GET(
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
    include: {
      items: {
        include: {
          asset: {
            select: { id: true, assetTag: true, name: true, status: true, category: { select: { name: true } } },
          },
          verifiedBy: { select: { name: true } },
        },
      },
      createdBy: { select: { name: true, email: true } },
    },
  });

  if (!ver || ver.organizationId !== orgId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ session: ver });
}
