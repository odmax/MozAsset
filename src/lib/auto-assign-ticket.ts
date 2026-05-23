import prisma from '@/lib/prisma';

export async function autoAssignTicket(ticketId: string, userPlan: string) {
  const candidates = await prisma.internalAdmin.findMany({
    where: {
      role: { in: ['SUPPORT_AGENT', 'SUPPORT_MANAGER'] },
      isActive: true,
      isBusy: false,
      isSuspended: false,
    },
    select: {
      id: true,
      email: true,
      status: true,
      activeChatCount: true,
      maxConcurrentChats: true,
      lastAssignedAt: true,
    },
  });

  const available = candidates.filter(
    (a) => a.status === 'ONLINE' && a.activeChatCount < a.maxConcurrentChats
  );

  if (available.length === 0) return null;

  available.sort((a, b) => {
    const chatDiff = a.activeChatCount - b.activeChatCount;
    if (chatDiff !== 0) return chatDiff;
    const aTime = a.lastAssignedAt?.getTime() ?? 0;
    const bTime = b.lastAssignedAt?.getTime() ?? 0;
    return aTime - bTime;
  });

  const selected = available[0];

  const now = new Date();
  const willBeBusy = selected.activeChatCount + 1 >= selected.maxConcurrentChats;

  await prisma.$transaction([
    prisma.supportTicket.update({
      where: { id: ticketId },
      data: { assignedAdminId: selected.id, updatedAt: now },
    }),
    prisma.internalAdmin.update({
      where: { id: selected.id },
      data: {
        activeChatCount: { increment: 1 },
        lastAssignedAt: now,
        status: willBeBusy ? 'BUSY' : undefined,
        isBusy: willBeBusy,
      },
    }),
  ]);

  try {
    await prisma.notification.create({
      data: {
        adminId: selected.id,
        type: 'TICKET_ASSIGNED',
        title: 'New Ticket Assigned',
        message: `Ticket #${ticketId.slice(0, 7)} has been assigned to you`,
        link: `/admin/support-tickets?ticket=${ticketId}`,
      },
    });
  } catch (err) {
    console.error('Failed to notify agent:', err);
  }

  try {
    await prisma.auditLog.create({
      data: {
        action: 'TICKET_ASSIGNED',
        entityType: 'SupportTicket',
        entityId: ticketId,
        userId: selected.id,
        metadata: { assignedBy: 'system', agentId: selected.id },
      },
    });
  } catch (err) {
    console.error('Failed to log assignment:', err);
  }

  return selected;
}
