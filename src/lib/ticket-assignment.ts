import prisma from '@/lib/prisma';
import type { TicketPriority, InternalRole } from '@prisma/client';

interface AgentWithLoad {
  id: string;
  name: string | null;
  role: InternalRole;
  activeChatCount: number;
  maxConcurrentChats: number;
  isOnline: boolean;
  isBusy: boolean;
  isSuspended: boolean;
}

const PRIORITY_ORDER: Record<TicketPriority, number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export async function findBestAgent(priority: TicketPriority): Promise<string | null> {
  const available = await prisma.internalAdmin.findMany({
    where: {
      isOnline: true,
      isBusy: false,
      isActive: true,
      isSuspended: false,
      role: { in: ['SUPPORT_AGENT', 'SUPPORT_MANAGER', 'SUPER_ADMIN', 'OWNER'] },
    },
    select: {
      id: true,
      name: true,
      role: true,
      activeChatCount: true,
      maxConcurrentChats: true,
      isOnline: true,
      isBusy: true,
      isSuspended: true,
    },
  });

  const eligible = available.filter(
    (a) => a.activeChatCount < a.maxConcurrentChats
  );

  if (eligible.length === 0) return null;

  const sorted = eligible.sort((a, b) => {
    // Prefer dedicated support roles first, then managers, fall back to super_admin/owner
    const roleWeight: Record<string, number> = {
      SUPPORT_AGENT: 0,
      SUPPORT_MANAGER: 1,
      SUPER_ADMIN: 2,
      OWNER: 3,
    };
    const aWeight = roleWeight[a.role] ?? 99;
    const bWeight = roleWeight[b.role] ?? 99;
    if (aWeight !== bWeight) return aWeight - bWeight;
    // Within same role, assign to agent with lowest chat count (load balancing)
    return a.activeChatCount - b.activeChatCount;
  });

  return sorted[0].id;
}

export async function autoAssignTicket(ticketId: string): Promise<string | null> {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: { priority: true, assignedAdminId: true, status: true },
  });

  if (!ticket || ticket.assignedAdminId || ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') {
    return null;
  }

  const agentId = await findBestAgent(ticket.priority);

  if (!agentId) return null;

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { assignedAdminId: agentId },
  });

  await prisma.internalAdmin.update({
    where: { id: agentId },
    data: { activeChatCount: { increment: 1 } },
  });

  await prisma.auditLog.create({
    data: {
      action: 'TICKET_ASSIGNED',
      entityType: 'SupportTicket',
      entityId: ticketId,
      userId: agentId,
      metadata: { assignedTo: agentId, autoAssigned: true },
    },
  });

  return agentId;
}

export async function reassignUnassignedTickets(batchSize = 5): Promise<number> {
  const unassigned = await prisma.supportTicket.findMany({
    where: {
      assignedAdminId: null,
      status: { notIn: ['CLOSED', 'RESOLVED'] },
    },
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'asc' },
    ],
    take: batchSize,
    select: { id: true, priority: true },
  });

  let assigned = 0;
  for (const ticket of unassigned) {
    const success = await autoAssignTicket(ticket.id);
    if (success) assigned++;
  }

  return assigned;
}

export async function getAgentWorkload(agentId: string) {
  const agent = await prisma.internalAdmin.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      activeChatCount: true,
      maxConcurrentChats: true,
      isOnline: true,
      isBusy: true,
    },
  });

  if (!agent) return null;

  const activeTickets = await prisma.supportTicket.count({
    where: {
      assignedAdminId: agentId,
      status: { notIn: ['CLOSED', 'RESOLVED'] },
    },
  });

  return {
    ...agent,
    activeTickets,
    utilizationPercent: agent.maxConcurrentChats > 0
      ? Math.round((activeTickets / agent.maxConcurrentChats) * 100)
      : 0,
    available: agent.isOnline && !agent.isBusy && activeTickets < agent.maxConcurrentChats,
  };
}
