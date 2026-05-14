import { addJob } from '@/lib/queue';

/**
 * Queue an email for async sending.
 * Falls back to sync send if Redis is not configured.
 */
export async function queueEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: string;
  organizationId?: string;
  userId?: string;
}): Promise<{ queued: boolean; id?: string }> {
  if (!process.env.UPSTASH_REDIS_URL) {
    const { sendEmail } = await import('@/lib/email');
    await sendEmail(options);
    return { queued: false };
  }

  const id = await addJob(
    'email',
    'send-email',
    {
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      type: options.type,
    },
    {
      organizationId: options.organizationId,
      userId: options.userId,
    }
  );
  return { queued: true, id };
}

/**
 * Queue a notification for async creation.
 */
export async function queueNotification(
  params: {
    userId: string;
    organizationId?: string | null;
    type: string;
    title: string;
    message: string;
    link?: string;
    priority?: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<{ queued: boolean; id?: string }> {
  if (!process.env.UPSTASH_REDIS_URL) {
    const { createNotification } = await import('@/lib/notifications');
    await (createNotification as any)(params);
    return { queued: false };
  }

  const id = await addJob(
    'notification',
    'create-notification',
    params as unknown as Record<string, unknown>,
    {
      organizationId: params.organizationId || undefined,
      userId: params.userId,
    }
  );
  return { queued: true, id };
}

/**
 * Queue a notification-email combo (creates notification + sends email).
 */
export async function queueNotificationEmail(
  params: {
    userId: string;
    organizationId?: string | null;
    type: string;
    title: string;
    message: string;
    link?: string;
    priority?: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
    emailTo?: string;
    emailSubject?: string;
    emailHtml?: string;
  }
): Promise<void> {
  const hasRedis = !!process.env.UPSTASH_REDIS_URL;

  // Always create notification (fast DB write)
  if (hasRedis) {
    await addJob('notification', 'create-notification', params as unknown as Record<string, unknown>, {
      organizationId: params.organizationId || undefined,
      userId: params.userId,
    });
  } else {
    const { createNotification } = await import('@/lib/notifications');
    await (createNotification as any)(params);
  }

  // Send email
  if (params.emailTo) {
    if (hasRedis) {
      await addJob('email', 'send-notification-email', {
        userId: params.userId,
        type: params.type,
        vars: {},
        email: params.emailTo,
      } as Record<string, unknown>, {
        organizationId: params.organizationId || undefined,
        userId: params.userId,
      });
    } else {
      const { sendNotificationEmail } = await import('@/lib/notification-email');
      await sendNotificationEmail(params.userId, params.type as any, {}, params.emailTo);
    }
  }
}

/**
 * Queue an export job.
 */
export async function queueExport(
  type: string,
  format: 'csv' | 'pdf',
  filters: Record<string, unknown>,
  organizationId?: string,
  userId?: string
): Promise<string> {
  const id = await addJob(
    'export',
    format === 'csv' ? 'export-csv' : 'export-pdf',
    { type, filters, organizationId, userId },
    { organizationId, userId }
  );
  return id;
}

/**
 * Queue bulk notification fan-out to multiple users.
 */
export async function queueBulkNotification(
  userIds: string[],
  notification: {
    organizationId?: string | null;
    type: string;
    title: string;
    message: string;
    link?: string;
    priority?: string;
    actorId?: string;
    metadata?: Record<string, unknown>;
  },
  organizationId?: string
): Promise<string> {
  const id = await addJob(
    'notification',
    'bulk-notification-fanout',
    {
      userIds,
      notification: { ...notification, organizationId },
    },
    { organizationId }
  );
  return id;
}

/**
 * Queue a maintenance reminder.
 */
export async function queueMaintenanceReminder(
  maintenanceId: string,
  organizationId?: string
): Promise<string> {
  const id = await addJob(
    'maintenance',
    'maintenance-reminder',
    { maintenanceId },
    { organizationId }
  );
  return id;
}

/**
 * Queue a subscription expiry reminder.
 */
export async function queueSubscriptionReminder(
  userId: string,
  organizationId?: string
): Promise<string> {
  const id = await addJob(
    'maintenance',
    'subscription-expiry-reminder',
    { userId },
    { organizationId, userId }
  );
  return id;
}
