import prisma from '@/lib/prisma';
import { registerJobHandler } from '@/lib/queue';

registerJobHandler('send-notification-email', async (data) => {
  const { sendNotificationEmail } = await import('@/lib/notification-email');
  const { userId, type, vars, email } = data as any;
  await sendNotificationEmail(userId, type, vars || {}, email);
});

registerJobHandler('send-email', async (data) => {
  const { sendEmail } = await import('@/lib/email');
  const { to, subject, html, type } = data as any;
  await sendEmail({ to, subject, html, type });
});

registerJobHandler('create-notification', async (data) => {
  const { createNotification } = await import('@/lib/notifications');
  const { userId, type, title, message, link, priority, organizationId, actorId, metadata } = data as any;
  await createNotification({ userId, type, title, message, link, priority, organizationId, actorId, metadata });
});

registerJobHandler('bulk-notification-fanout', async (data) => {
  const { userIds, notification } = data as { userIds: string[]; notification: any };
  const { createNotification } = await import('@/lib/notifications');
  for (const userId of userIds) {
    await createNotification({ ...notification, userId }).catch(() => {});
  }
});

registerJobHandler('export-csv', async (data) => {
  const { type, filters, organizationId } = data as any;
  // CSV export queued — processing happens via export endpoint which creates the file
  const prisma = (await import('@/lib/prisma')).default;
  await prisma.auditLog.create({
    data: {
      action: 'CREATE' as any,
      entityType: 'Export',
      entityId: `csv-${type}-${Date.now()}`,
      userId: filters?.userId || organizationId || 'system',
      metadata: { exportType: type, filters, format: 'csv' },
    },
  });
});

registerJobHandler('export-pdf', async (data) => {
  const { type, filters, organizationId } = data as any;
  const prisma = (await import('@/lib/prisma')).default;
  await prisma.auditLog.create({
    data: {
      action: 'CREATE' as any,
      entityType: 'Export',
      entityId: `pdf-${type}-${Date.now()}`,
      userId: filters?.userId || organizationId || 'system',
      metadata: { exportType: type, filters, format: 'pdf' },
    },
  });
});

registerJobHandler('process-image', async (data) => {
  const { fileId } = data as any;
  const { uploadFile } = await import('@/lib/storage');
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) throw new Error(`File ${fileId} not found`);
  // Image is already processed by Cloudinary on upload — re-generate thumbnail if needed
  if (file.mimeType.startsWith('image/') && !file.thumbnailUrl) {
    const response = await fetch(file.url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const result = await uploadFile(buffer, file.originalName, file.mimeType, {
      folder: `mozassets/processed`,
    });
    await prisma.file.update({
      where: { id: fileId },
      data: { thumbnailUrl: result.thumbnailUrl },
    });
  }
});

registerJobHandler('subscription-update', async (data) => {
  const { userId, plan, provider } = data as any;
  const { createCheckoutSession } = await import('@/lib/billing');
  await createCheckoutSession(userId, plan, provider);
});

registerJobHandler('payment-retry', async (data) => {
  const { paymentId } = data as any;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.status !== 'FAILED') return;
  // Re-check payment status with provider
  const { getSubscriptionStatus } = await import('@/lib/billing');
  const status = await getSubscriptionStatus(payment.userId, payment.provider as any);
  if (status?.status === 'ACTIVE') {
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });
  }
});

registerJobHandler('invoice-generation', async (data) => {
  const { userId, periodStart, periodEnd } = data as any;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, plan: true },
  });
  if (!user) throw new Error(`User ${userId} not found`);
  // Create invoice record
  const { getPlanPrice } = await import('@/lib/payfast');
  const amount = getPlanPrice(user.plan as any);
  await prisma.invoice.create({
    data: {
      userId,
      amount,
      status: 'PENDING',
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      description: `${user.plan} plan - ${new Date(periodStart).toLocaleDateString()} to ${new Date(periodEnd).toLocaleDateString()}`,
    },
  });
});

registerJobHandler('maintenance-reminder', async (data) => {
  const { maintenanceId } = data as any;
  const maintenance = await prisma.maintenance.findUnique({
    where: { id: maintenanceId },
    include: { asset: { select: { name: true } }, performedByUser: { select: { id: true } } },
  });
  if (!maintenance) return;
  // Create notification for the user who performed the maintenance
  const { createNotification } = await import('@/lib/notifications');
  await createNotification({
    userId: maintenance.performedByUser.id,
    type: 'MAINTENANCE_DUE',
    title: 'Maintenance Reminder',
    message: `Scheduled maintenance for ${maintenance.asset.name} is due`,
    link: `/dashboard/assets/${maintenance.assetId}/maintenance`,
  });
});

registerJobHandler('scheduled-cleanup', async () => {
  const { cleanupStuckJobs, cleanupOldJobs } = await import('@/lib/queue');
  const stuck = await cleanupStuckJobs();
  const old = await cleanupOldJobs(7);
  console.log(`[Queue Cleanup] ${stuck} stuck jobs cleaned, ${old} old jobs removed`);
});

registerJobHandler('subscription-expiry-reminder', async (data) => {
  const { userId } = data as any;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, plan: true, billingPeriodEnd: true },
  });
  if (!user || !user.billingPeriodEnd) return;
  const daysLeft = Math.ceil((user.billingPeriodEnd.getTime() - Date.now()) / 86400000);
  if (daysLeft <= 0 || daysLeft > 7) return;
  const { createNotification } = await import('@/lib/notifications');
  await createNotification({
    userId,
    type: 'SUBSCRIPTION_CANCELLED',
    title: 'Subscription Expiring Soon',
    message: `Your ${user.plan} plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew to avoid service interruption.`,
    link: '/billing',
  });
});

export function initializeJobHandlers(): void {
  // All handlers are registered at import time via the top-level calls
}
