import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import { normalizeEmail } from '@/lib/email-normalize';
import type { InternalRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    const admin = getSimpleAdminSession();
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.adminId },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'agents:read')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
    const role = url.searchParams.get('role');
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');

    const where: any = {};
    if (role) where.role = role;
    if (status === 'online') where.isOnline = true;
    else if (status === 'offline') where.isOnline = false;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [agents, total] = await Promise.all([
      prisma.internalAdmin.findMany({
        where,
        select: {
          id: true, email: true, name: true, role: true, isActive: true,
          status: true, isOnline: true, isBusy: true, maxConcurrentChats: true,
          activeChatCount: true, lastActiveAt: true, statusMessage: true,
          isSuspended: true, createdAt: true, lastLogin: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.internalAdmin.count({ where }),
    ]);

    return NextResponse.json({ success: true, agents, total, page, limit });
  } catch (error) {
    console.error('[agents] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch agents', agents: [], total: 0, page: 1, limit: 20 }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = getSimpleAdminSession();
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.adminId },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'agents:create')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { email, name, password, role } = body;

    if (!email || !password || !role) {
      return NextResponse.json({ success: false, error: 'Email, password, and role required' }, { status: 400 });
    }

    const validRoles: InternalRole[] = ['SUPER_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_AGENT', 'FINANCE_ADMIN', 'VIEWER'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }

    if (dbAdmin.role !== 'OWNER' && (role === 'SUPER_ADMIN' || role === 'SUPPORT_MANAGER')) {
      return NextResponse.json({ success: false, error: 'Forbidden: cannot create this role' }, { status: 403 });
    }

    const normalizedEmail = normalizeEmail(email);
    const existing = await prisma.internalAdmin.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const agent = await prisma.internalAdmin.create({
      data: {
        email: normalizedEmail,
        name: name || null,
        password: hashedPassword,
        role,
        createdByOwner: dbAdmin.role === 'OWNER',
        status: 'OFFLINE',
      },
      select: {
        id: true, email: true, name: true, role: true, isActive: true,
        status: true, createdAt: true,
      },
    });

    return NextResponse.json({ success: true, agent }, { status: 201 });
  } catch (error) {
    console.error('[agents] POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create agent' }, { status: 500 });
  }
}
