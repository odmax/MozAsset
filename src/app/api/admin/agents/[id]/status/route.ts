import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import type { AgentStatus } from '@prisma/client';

const VALID_STATUSES: AgentStatus[] = ['ONLINE', 'BUSY', 'AWAY', 'OFFLINE', 'IN_MEETING', 'BREAK'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbAdmin = await prisma.internalAdmin.findUnique({ where: { id: admin.adminId } });
  if (!dbAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const isSelf = admin.adminId === params.id;
  const canManageOthers = hasPermission(dbAdmin, 'agents:manage_status');

  if (!isSelf && !canManageOthers) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const target = await prisma.internalAdmin.findUnique({ where: { id: params.id } });
  if (!target) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const body = await req.json();
  const { status: newStatus, statusMessage, isBusy } = body;

  const updateData: any = { lastActiveAt: new Date() };

  if (newStatus) {
    if (!VALID_STATUSES.includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    updateData.status = newStatus;
    updateData.isOnline = newStatus === 'ONLINE' || newStatus === 'BUSY';
  }

  if (statusMessage !== undefined) updateData.statusMessage = statusMessage;
  if (isBusy !== undefined) updateData.isBusy = isBusy;

  const agent = await prisma.internalAdmin.update({
    where: { id: params.id },
    data: updateData,
    select: {
      id: true, name: true, email: true, role: true,
      status: true, isOnline: true, isBusy: true,
      activeChatCount: true, statusMessage: true, lastActiveAt: true,
    },
  });

  return NextResponse.json({ agent });
}
