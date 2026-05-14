import prisma from '@/lib/prisma';
import type { NotificationType, Prisma } from '@prisma/client';

interface CreateAdminNotificationParams {
  adminId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

export async function createAdminNotification({
  adminId,
  type,
  title,
  message,
  link,
  metadata,
}: CreateAdminNotificationParams) {
  return prisma.notification.create({
    data: {
      adminId,
      type,
      title,
      message,
      link,
      metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      priority: 'high',
    },
  });
}

export async function notifyTicketAssigned(adminId: string, ticketSubject: string, ticketId: string) {
  return createAdminNotification({
    adminId,
    type: 'TICKET_ASSIGNED',
    title: 'New ticket assigned',
    message: `Ticket "${ticketSubject}" has been assigned to you`,
    link: `/admin/support-tickets/${ticketId}`,
    metadata: { ticketId },
  });
}

export async function notifyCustomerReplied(adminId: string, ticketSubject: string, ticketId: string) {
  return createAdminNotification({
    adminId,
    type: 'AGENT_REPLY',
    title: 'Customer replied',
    message: `Customer replied to ticket "${ticketSubject}"`,
    link: `/admin/support-tickets/${ticketId}`,
    metadata: { ticketId },
  });
}

export async function notifyTicketEscalated(
  toAdminId: string,
  fromAdminName: string,
  ticketSubject: string,
  ticketId: string
) {
  return createAdminNotification({
    adminId: toAdminId,
    type: 'TICKET_ESCALATED',
    title: 'Ticket escalated to you',
    message: `${fromAdminName} escalated ticket "${ticketSubject}" to you`,
    link: `/admin/support-tickets/${ticketId}`,
    metadata: { ticketId, escalatedBy: fromAdminName },
  });
}

export async function notifySlaBreach(adminId: string, ticketSubject: string, ticketId: string) {
  return createAdminNotification({
    adminId,
    type: 'SLA_BREACH_WARNING',
    title: 'SLA breach warning',
    message: `SLA deadline approaching for ticket "${ticketSubject}"`,
    link: `/admin/support-tickets/${ticketId}`,
    metadata: { ticketId },
  });
}

export async function getAdminUnreadCount(adminId: string): Promise<number> {
  try {
    const count = await prisma.notification.count({
      where: { adminId, isRead: false },
    });
    return count;
  } catch {
    return 0;
  }
}
