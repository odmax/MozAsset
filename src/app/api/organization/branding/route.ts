import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
import { uploadFile, validateFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ASSET_MANAGER'];

// POST /api/organization/branding — upload logo or favicon
export async function POST(request: Request) {
  try {
    const session = getSimpleUserSession();
    if (!session || !session.organizationId || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!canAccessEnterpriseFeature(session.plan as any)) {
      return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

    if (!file || !type) {
      return NextResponse.json({ error: 'File and type are required' }, { status: 400 });
    }

    if (type !== 'logo' && type !== 'favicon') {
      return NextResponse.json({ error: 'Type must be logo or favicon' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    validateFile({ name: file.name, size: file.size, type: file.type }, true);

    const result = await uploadFile(buffer, file.name, file.type, {
      folder: `org-${session.organizationId}/branding`,
    });

    const org = await prisma.organization.update({
      where: { id: session.organizationId },
      data: { [type === 'logo' ? 'logo' : 'favicon']: result.url },
      select: { logo: true, favicon: true },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Organization',
        entityId: session.organizationId,
        userId: session.userId,
        changes: { [type]: 'uploaded' },
      },
    });

    return NextResponse.json({
      url: result.url,
      [type]: org[type === 'logo' ? 'logo' : 'favicon'],
    });
  } catch (error: any) {
    console.error('Branding upload error:', error);
    const message = error.message || 'Failed to upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/organization/branding — remove logo or favicon
export async function DELETE(request: Request) {
  try {
    const session = getSimpleUserSession();
    if (!session || !session.organizationId || !ALLOWED_ROLES.includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!canAccessEnterpriseFeature(session.plan as any)) {
      return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type || (type !== 'logo' && type !== 'favicon')) {
      return NextResponse.json({ error: 'Type must be logo or favicon' }, { status: 400 });
    }

    const field = type === 'logo' ? 'logo' : 'favicon';

    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
      select: { [field]: true },
    });

    if (!org || !(org as any)[field]) {
      return NextResponse.json({ error: `No ${type} to delete` }, { status: 404 });
    }

    await prisma.organization.update({
      where: { id: session.organizationId },
      data: { [field]: null },
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Organization',
        entityId: session.organizationId,
        userId: session.userId,
        changes: { [type]: 'removed' },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Branding delete error:', error);
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 });
  }
}
