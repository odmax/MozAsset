import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission, canManageAgent } from '@/lib/admin-permissions';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSimpleAdminSession();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.adminId },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'agents:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const agent = await prisma.internalAdmin.findUnique({
      where: { id: params.id },
      select: {
        id: true, email: true, name: true, role: true, isActive: true,
        createdAt: true, lastLogin: true,
      },
    });

    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    return NextResponse.json({ agent });
  } catch (error) {
    console.error('[agents] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSimpleAdminSession();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.adminId },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const target = await prisma.internalAdmin.findUnique({
      where: { id: params.id },
      select: { id: true, role: true, isActive: true },
    });
    if (!target) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  if (!canManageAgent(dbAdmin, target)) {
    return NextResponse.json({ error: 'Forbidden: cannot manage this agent' }, { status: 403 });
  }

  const body = await req.json();
  const updateData: any = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.role !== undefined) {
    if (!hasPermission(dbAdmin, 'agents:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (dbAdmin.role !== 'OWNER' && (body.role === 'SUPER_ADMIN' || body.role === 'OWNER')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    updateData.role = body.role;
  }
  if (body.isActive !== undefined) {
    if (!hasPermission(dbAdmin, 'agents:update')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    updateData.isActive = body.isActive;
  }

  const agent = await prisma.internalAdmin.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true, email: true, name: true, role: true, isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ agent });
  } catch (error) {
    console.error('[agents] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSimpleAdminSession();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.adminId },
      select: { id: true, role: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'agents:delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const target = await prisma.internalAdmin.findUnique({
      where: { id: params.id },
      select: { id: true, role: true },
    });
  if (!target) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  if (target.role === 'OWNER') {
    return NextResponse.json({ error: 'Cannot delete owner' }, { status: 403 });
  }

  if (dbAdmin.role === 'SUPPORT_MANAGER' && !['SUPPORT_AGENT', 'VIEWER'].includes(target.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.internalAdmin.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[agents] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
