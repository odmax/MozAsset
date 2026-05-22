import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';
import { normalizeEmail } from '@/lib/email-normalize';

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ASSET_MANAGER'];

const SETTINGS_FIELDS = {
  // General
  name: true, description: true, industry: true, companySize: true,
  // Contact
  orgEmail: true, phone: true, alternatePhone: true, website: true,
  addressLine1: true, addressLine2: true, city: true, province: true,
  postalCode: true, country: true,
  // Branding
  logo: true, favicon: true, primaryColor: true, secondaryColor: true,
  // Preferences
  timezone: true, dateFormat: true, currency: true, defaultLanguage: true,
} as const;

function getSession() {
  const session = getSimpleUserSession();
  if (!session || !session.organizationId) return null;
  if (!ALLOWED_ROLES.includes(session.role)) return null;
  return session;
}

// GET /api/organization/settings
export async function GET() {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId! },
      select: SETTINGS_FIELDS,
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json(org);
  } catch (error) {
    console.error('Org settings GET error:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PUT /api/organization/settings
export async function PUT(request: Request) {
  try {
    const session = getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();

    const allowedKeys = Object.keys(SETTINGS_FIELDS);
    const updateData: Record<string, any> = {};
    for (const key of allowedKeys) {
      if (body[key] !== undefined) {
        updateData[key] = body[key] === '' ? null : body[key];
      }
    }
    if (updateData.orgEmail) updateData.orgEmail = normalizeEmail(updateData.orgEmail);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 });
    }

    const org = await prisma.organization.update({
      where: { id: session.organizationId! },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        action: 'UPDATE',
        entityType: 'Organization',
        entityId: org.id,
        userId: session.userId,
        changes: { updated: Object.keys(updateData) },
      },
    });

    const result: Record<string, any> = {};
    for (const key of allowedKeys) {
      result[key] = (org as any)[key];
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Org settings PUT error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
