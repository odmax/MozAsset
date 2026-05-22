import prisma from '@/lib/prisma';
import { normalizeEmail } from '@/lib/email-normalize';
import type { NotificationType, Prisma } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  organizationId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      organizationId: params.organizationId ?? null,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
      priority: params.priority ?? 'normal',
      actorId: params.actorId ?? null,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

interface CreateNotificationForOrgParams {
  organizationId: string;
  excludeUserId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actorId?: string;
  metadata?: Record<string, unknown>;
}

export async function createNotificationForOrg(params: CreateNotificationForOrgParams) {
  const users = await prisma.user.findMany({
    where: {
      organizationId: params.organizationId,
      isActive: true,
      ...(params.excludeUserId ? { id: { not: params.excludeUserId } } : {}),
    },
    select: { id: true },
  });

  if (users.length === 0) return [];

  return prisma.notification.createMany({
    data: users.map((user) => ({
      userId: user.id,
      organizationId: params.organizationId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
      priority: params.priority ?? 'normal',
      actorId: params.actorId ?? null,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
    })),
  });
}

export async function createNotificationForAdmins(
  params: Omit<CreateNotificationParams, 'userId'> & { excludeAdminId?: string }
) {
  const admins = await prisma.internalAdmin.findMany({
    where: {
      isActive: true,
      ...(params.excludeAdminId ? { id: { not: params.excludeAdminId } } : {}),
    },
    select: { id: true, email: true },
  });

  const results = [];
  for (const admin of admins) {
    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(admin.email) } });
    if (user) {
      const notif = await createNotification({
        userId: user.id,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link,
        priority: params.priority,
        actorId: params.actorId,
        metadata: params.metadata,
      });
      results.push(notif);
    }
  }
  return results;
}

export const NOTIFICATION_LINKS = {
  asset: (id: string) => `/dashboard/assets/${id}`,
  supportTicket: (id: string) => `/dashboard/support?ticket=${id}`,
  billing: () => `/billing`,
  user: (id: string) => `/dashboard/users?id=${id}`,
  notifications: () => `/dashboard/notifications`,
} as const;

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  ASSET_ASSIGNED: 'package',
  ASSET_TRANSFERRED: 'arrows-up-down',
  MAINTENANCE_DUE: 'wrench',
  MAINTENANCE_COMPLETED: 'check-circle',
  SUPPORT_REPLY: 'message-square',
  BILLING_SUCCESSFUL: 'credit-card',
  BILLING_FAILED: 'alert-circle',
  SUBSCRIPTION_CANCELLED: 'ban',
  PLAN_UPGRADED: 'crown',
  USER_INVITED: 'user-plus',
  EXPORT_COMPLETED: 'download',
  ORGANIZATION_UPDATE: 'building',
  TICKET_ASSIGNED: 'message-square',
  TICKET_ESCALATED: 'arrow-up-circle',
  SLA_BREACH_WARNING: 'alert-triangle',
  AGENT_REPLY: 'message-circle',
  ACCOUNT_INACTIVE: 'clock',
  ACCOUNT_DEACTIVATED: 'shield-off',
  ACCOUNT_DELETION_WARNING: 'alert-triangle',
  ACCOUNT_REACTIVATED: 'check-circle',
} as const;
