import { NextResponse } from 'next/server';
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

  // Only OWNER can create new admins
  if (admin.role !== 'OWNER') {
    return NextResponse.json({ error: 'Only owner can create admins' }, { status: 403 });
  }

  try {
    const { name, email, password, role } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    if (role && !['PLATFORM_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const existing = await prisma.internalAdmin.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newAdmin = await prisma.internalAdmin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role as InternalRole || 'PLATFORM_ADMIN',
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
