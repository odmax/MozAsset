import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import type { AgentStatus } from '@prisma/client';

const VALID_STATUSES: AgentStatus[] = ['ONLINE', 'BUSY', 'AWAY', 'OFFLINE', 'IN_MEETING', 'BREAK'];

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const admin = getSimpleAdminSession();
    if (!admin) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.adminId },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const isSelf = admin.adminId === params.id;
    const canManageOthers = hasPermission(dbAdmin, 'agents:manage_status');

    if (!isSelf && !canManageOthers) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const target = await prisma.internalAdmin.findUnique({
      where: { id: params.id },
      select: { id: true, name: true, email: true, role: true, isActive: true, status: true, isOnline: true, isBusy: true, activeChatCount: true, maxConcurrentChats: true, statusMessage: true, isSuspended: true },
    });
    if (!target) return NextResponse.json({ success: false, error: 'Agent not found' }, { status: 404 });

    const body = await req.json();
    const { status: newStatus, statusMessage, isBusy } = body;

    const updateData: any = { lastActiveAt: new Date() };

    if (newStatus) {
      if (!VALID_STATUSES.includes(newStatus)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
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

    return NextResponse.json({ success: true, agent });
  } catch (error) {
    console.error('[agents] status PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update status' }, { status: 500 });
  }
}
