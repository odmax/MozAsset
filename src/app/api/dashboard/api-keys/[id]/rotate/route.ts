import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { canAccessEnterpriseFeature } from '@/lib/billing';
import { createHash, randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

function generateKey(): { raw: string; prefix: string; hashed: string } {
  const raw = `moz_${randomBytes(24).toString('hex')}`;
  const prefix = raw.slice(0, 11);
  const hashed = hashKey(raw);
  return { raw, prefix, hashed };
}

export async function POST(
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
    select: { id: true, name: true, organizationId: true, isActive: true },
  });

  if (!existing || existing.organizationId !== orgId) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  if (!existing.isActive) {
    return NextResponse.json({ error: 'Cannot rotate a revoked key' }, { status: 400 });
  }

  const { raw, prefix, hashed } = generateKey();

  await prisma.apiKey.update({
    where: { id: params.id },
    data: {
      key: hashed,
      prefix,
      lastUsedAt: null,
      usageCount: 0,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE' as any,
      entityType: 'ApiKey',
      entityId: params.id,
      userId: session.userId,
      changes: { action: 'rotated', newPrefix: prefix },
    },
  }).catch(() => {});

  return NextResponse.json({
    key: { id: existing.id, name: existing.name, prefix },
    rawKey: raw,
  });
}
