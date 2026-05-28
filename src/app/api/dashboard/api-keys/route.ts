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

export async function GET() {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }

  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const keys = await prisma.apiKey.findMany({
    where: { organizationId: orgId, isActive: true },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      expiresAt: true,
      permissions: true,
      usageCount: true,
      rateLimit: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const session = getSimpleUserSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!canAccessEnterpriseFeature(session.plan as any)) {
    return NextResponse.json({ error: 'Enterprise plan required', code: 'UPGRADE_REQUIRED' }, { status: 402 });
  }

  const orgId = session.organizationId;
  if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 400 });

  const { name, rateLimit } = await request.json();

  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Key name is required' }, { status: 400 });
  }

  const { raw, prefix, hashed } = generateKey();

  const key = await prisma.apiKey.create({
    data: {
      name: name.trim(),
      key: hashed,
      prefix,
      rateLimit: rateLimit || 100,
      organizationId: orgId,
      createdById: session.userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE' as any,
      entityType: 'ApiKey',
      entityId: key.id,
      userId: session.userId,
      changes: { name: key.name, prefix },
    },
  }).catch(() => {});

  return NextResponse.json({
    key: { id: key.id, name: key.name, prefix, rateLimit: key.rateLimit, createdAt: key.createdAt },
    rawKey: raw,
  });
}
