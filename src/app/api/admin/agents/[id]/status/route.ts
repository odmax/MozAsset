import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import type { AgentStatus } from '@prisma/client';

const VALID_STATUSES: AgentStatus[] = ['ONLINE', 'BUSY', 'AWAY', 'OFFLINE', 'IN_MEETING', 'BREAK'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSimpleAdminSession();
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.adminId },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const isSelf = admin.adminId === params.id;
    const canManageOthers = hasPermission(dbAdmin, 'agents:manage_status');

    if (!isSelf && !canManageOthers) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const target = await prisma.internalAdmin.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    if (!target) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const body = await req.json();

    if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    return NextResponse.json({ agent: target });
  } catch (error) {
    console.error('[agents] status PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
