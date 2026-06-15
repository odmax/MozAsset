import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessFeature } from '@/lib/billing';
import QRCode from 'qrcode';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const hasExportAccess = canAccessFeature(session.plan as any, 'exports');
  if (!hasExportAccess) {
    return NextResponse.json({ error: 'PRO or ENTERPRISE plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }

  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const asset = await prisma.asset.findUnique({
    where: { id: params.id },
    select: {
      id: true, assetTag: true, name: true, serialNumber: true, model: true,
      department: { select: { name: true } }, location: { select: { name: true } },
      organizationId: true,
    },
  });

  if (!asset || asset.organizationId !== orgId) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { logo: true, brandName: true, primaryColor: true, secondaryColor: true, plan: true },
  });

  const isEnterprise = org?.plan === 'ENTERPRISE';
  const isPro = org?.plan === 'PRO';

  const qrData = JSON.stringify({ id: asset.id, tag: asset.assetTag, org: orgId });
  const qrSvg = await QRCode.toString(qrData, { type: 'svg', width: 200, margin: 1, color: { dark: '#000', light: '#fff' } });

  return NextResponse.json({
    asset: {
      id: asset.id,
      assetTag: asset.assetTag,
      name: asset.name,
      serialNumber: asset.serialNumber,
      model: asset.model,
      department: asset.department?.name,
      location: asset.location?.name,
    },
    branding: {
      logo: isEnterprise ? org?.logo : null,
      brandName: isEnterprise ? (org?.brandName || null) : null,
      primaryColor: isEnterprise ? (org?.primaryColor || '#3b82f6') : '#3b82f6',
      secondaryColor: isEnterprise ? (org?.secondaryColor || '#6366f1') : '#6366f1',
      isEnterprise,
    },
    qrCode: qrSvg,
  });
}
