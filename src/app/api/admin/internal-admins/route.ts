import { NextResponse } from 'next/server';
import { hasPermission, requirePermission, CREATABLE_ROLES, canManageAgent } from '@/lib/admin-permissions';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { InternalRole } from '@prisma/client';

function getAdminSession() {
  const adminCookie = cookies().get('adminSession');
  if (adminCookie?.value) {
    try {
      const decoded = Buffer.from(adminCookie.value, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch { return null; }
  }
  return null;
}

export const dynamic = 'force-dynamic';

// GET - List all platform admins
export async function GET() {
  const admin = getAdminSession();
  if (!admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.id },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'agents:read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const admins = await prisma.internalAdmin.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLogin: true,
        createdAt: true,
      },
    });
    return NextResponse.json(admins);
  } catch (error) {
    console.error('[platform-admins] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 });
  }
}

// POST - Create new platform admin
export async function POST(request: Request) {
  const admin = getAdminSession();
  if (!admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.id },
    select: { id: true, role: true, permissions: true },
  });
  if (!dbAdmin || !hasPermission(dbAdmin, 'admins:manage')) {
    return NextResponse.json({ error: 'Only admins with admin management permission can create admins' }, { status: 403 });
  }

  try {
    const { name, email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (role && !CREATABLE_ROLES.includes(role as InternalRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Only OWNER can create PLATFORM_ADMIN
    if (role === 'PLATFORM_ADMIN' && dbAdmin.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owner can create Platform Admin accounts' }, { status: 403 });
    }

    // SUPPORT_MANAGER can only create SUPPORT_AGENT and VIEWER
    if (dbAdmin.role === 'SUPPORT_MANAGER' && !['SUPPORT_AGENT', 'VIEWER'].includes(role)) {
      return NextResponse.json({ error: 'Support Managers can only create Support Agents and Viewers' }, { status: 403 });
    }

    const existing = await prisma.internalAdmin.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newAdmin = await prisma.internalAdmin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as InternalRole || 'SUPPORT_AGENT',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    return NextResponse.json(newAdmin);
  } catch (error) {
    console.error('[platform-admins] Error:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
