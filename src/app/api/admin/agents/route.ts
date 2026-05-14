import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import type { InternalRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        avatar: true, isSuspended: true, createdAt: true, lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.internalAdmin.count({ where }),
  ]);

  return NextResponse.json({ agents, total, page, limit });
}

export async function POST(req: Request) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({ where: { id: admin.adminId } });
  if (!dbAdmin || !hasPermission(dbAdmin, 'agents:create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { email, name, password, role } = body;

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Email, password, and role required' }, { status: 400 });
  }

  const validRoles: InternalRole[] = ['SUPER_ADMIN', 'SUPPORT_MANAGER', 'SUPPORT_AGENT', 'FINANCE_ADMIN', 'VIEWER'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  if (dbAdmin.role !== 'OWNER' && (role === 'SUPER_ADMIN' || role === 'SUPPORT_MANAGER')) {
    return NextResponse.json({ error: 'Forbidden: cannot create this role' }, { status: 403 });
  }

  const existing = await prisma.internalAdmin.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const agent = await prisma.internalAdmin.create({
    data: {
      email: email.toLowerCase(),
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

  return NextResponse.json({ agent }, { status: 201 });
}
