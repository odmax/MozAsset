import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';
import { getBaseUrl } from '@/lib/email';

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * DAY_MS);
}

function formatDays(days: number): string {
  if (days < 30) return `${days} day${days === 1 ? '' : 's'}`;
  const months = Math.floor(days / 30);
  return months === 1 ? '1 month' : `${months} months`;
}

interface LifecycleResult {
  warningsSent: number;
  deactivated: number;
  finalWarningsSent: number;
  deleted: number;
  errors: string[];
}

export async function processInactivityLifecycle(): Promise<LifecycleResult> {
  const result: LifecycleResult = { warningsSent: 0, deactivated: 0, finalWarningsSent: 0, deleted: 0, errors: [] };

  try {
    const now = new Date();
    const freeUsers = await prisma.user.findMany({
      where: {
        plan: 'FREE',
        isPlatformAdmin: false,
        isActive: true,
      },
      select: {
        id: true, name: true, email: true, createdAt: true,
        lastActiveAt: true, isDeactivated: true,
        deactivatedAt: true, scheduledDeletionAt: true,
        inactivityWarningSentAt: true, finalWarningSentAt: true,
        organizationId: true,
        emailMarketing: true,
      },
    });

    for (const user of freeUsers) {
      try {
        const inactiveSince = user.lastActiveAt ?? user.createdAt;
        const daysSinceActivity = Math.floor((now.getTime() - inactiveSince.getTime()) / DAY_MS);

        // 60 days: send warning email + notification
        if (daysSinceActivity >= 60 && daysSinceActivity < 90 && !user.inactivityWarningSentAt && !user.isDeactivated) {
          await sendInactivityWarning(user);
          await prisma.user.update({
            where: { id: user.id },
            data: { inactivityWarningSentAt: now },
            select: { id: true },
          });
          result.warningsSent++;
        }

        // 90 days: soft deactivate (read-only)
        if (daysSinceActivity >= 90 && daysSinceActivity < 120 && !user.isDeactivated) {
          await softDeactivate(user, `Inactive for ${formatDays(daysSinceActivity)}`);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              isDeactivated: true,
              deactivatedAt: now,
              deactivationReason: `FREE account inactive for ${formatDays(daysSinceActivity)}`,
              scheduledDeletionAt: new Date(now.getTime() + 60 * DAY_MS),
            },
            select: { id: true },
          });
          result.deactivated++;
        }

        // 120 days: final warning
        if (daysSinceActivity >= 120 && daysSinceActivity < 150 && user.isDeactivated && !user.finalWarningSentAt) {
          await sendFinalDeletionWarning(user);
          await prisma.user.update({
            where: { id: user.id },
            data: { finalWarningSentAt: now },
            select: { id: true },
          });
          result.finalWarningsSent++;
        }

        // 150 days: permanent deletion
        if (daysSinceActivity >= 150 && user.isDeactivated) {
          await permanentlyDeleteUser(user.id);
          result.deleted++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        result.errors.push(`User ${user.id} (${user.email}): ${msg}`);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    result.errors.push(`Global error: ${msg}`);
  }

  return result;
}

async function sendInactivityWarning(user: { id: string; name: string | null; email: string; emailMarketing: boolean }) {
  const name = user.name || 'there';
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f4f5f7;padding:40px 16px;">
  <table width="560" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:12px;padding:40px;">
    <tr><td>
      <h1 style="font-size:22px;color:#1e293b;">Your FREE workspace is at risk</h1>
      <p style="font-size:16px;color:#475569;line-height:1.6;">Hi ${name},</p>
      <p style="font-size:16px;color:#475569;line-height:1.6;">Your MozAssets FREE workspace has been inactive for over 60 days. If no action is taken within the next 30 days, your account will be <strong>deactivated</strong> and set to read-only mode.</p>
      <p style="font-size:16px;color:#475569;line-height:1.6;">After 90 days of inactivity, your workspace will be scheduled for permanent deletion.</p>
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="border-radius:8px;background:#6366f1;padding:14px 32px;">
          <a href="${getBaseUrl()}/dashboard" style="color:#fff;text-decoration:none;font-weight:600;font-size:15px;">Reactivate Now</a>
        </td>
      </tr></table>
    </td></tr>
  </table>
</body></html>`;

  try {
    await sendEmail({ to: user.email, subject: 'Your FREE workspace is inactive — action needed', html });
  } catch {}

  if (user.emailMarketing) {
    try {
      await createNotification({
        userId: user.id,
        type: 'ACCOUNT_INACTIVE',
        title: 'Your workspace is inactive',
        message: 'Your FREE workspace has been inactive for over 60 days. Log in to keep it active.',
        link: '/dashboard',
        priority: 'high',
      });
    } catch {}
  }
}

async function softDeactivate(user: { id: string; name: string | null; email: string; emailMarketing: boolean }, reason: string) {
  const name = user.name || 'there';
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f4f5f7;padding:40px 16px;">
  <table width="560" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:12px;padding:40px;">
    <tr><td>
      <h1 style="font-size:22px;color:#1e293b;">Your FREE workspace has been deactivated</h1>
      <p style="font-size:16px;color:#475569;line-height:1.6;">Hi ${name},</p>
      <p style="font-size:16px;color:#475569;line-height:1.6;">Your FREE workspace was deactivated due to inactivity. Your account is now in <strong>read-only mode</strong>.</p>
      <p style="font-size:16px;color:#475569;line-height:1.6;">You can still log in and view your data. To restore full access, click the button below.</p>
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="border-radius:8px;background:#6366f1;padding:14px 32px;">
          <a href="${getBaseUrl()}/reactivate" style="color:#fff;text-decoration:none;font-weight:600;font-size:15px;">Reactivate Account</a>
        </td>
      </tr></table>
      <p style="font-size:13px;color:#94a3b8;margin-top:24px;">If not reactivated within 60 days, your workspace and all associated data will be permanently deleted.</p>
    </td></tr>
  </table>
</body></html>`;

  try {
    await sendEmail({ to: user.email, subject: 'Your FREE workspace has been deactivated', html });
  } catch {}

  try {
    await createNotification({
      userId: user.id,
      type: 'ACCOUNT_DEACTIVATED',
      title: 'Workspace deactivated',
      message: `Your FREE workspace was deactivated due to inactivity: ${reason}. Log in to reactivate.`,
      link: '/reactivate',
      priority: 'high',
    });
  } catch {}
}

async function sendFinalDeletionWarning(user: { id: string; name: string | null; email: string; emailMarketing: boolean }) {
  const name = user.name || 'there';
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f4f5f7;padding:40px 16px;">
  <table width="560" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:12px;padding:40px;">
    <tr><td>
      <h1 style="font-size:22px;color:#1e293b;">Final warning: your workspace will be deleted</h1>
      <p style="font-size:16px;color:#475569;line-height:1.6;">Hi ${name},</p>
      <p style="font-size:16px;color:#475569;line-height:1.6;">Your FREE workspace has been inactive for over 120 days. In 30 days, all your data will be <strong>permanently deleted</strong>.</p>
      <p style="font-size:16px;color:#475569;line-height:1.6;">This includes all assets, categories, locations, departments, and uploaded files. This action cannot be undone.</p>
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="border-radius:8px;background:#6366f1;padding:14px 32px;">
          <a href="${getBaseUrl()}/reactivate" style="color:#fff;text-decoration:none;font-weight:600;font-size:15px;">Reactivate & Save Your Data</a>
        </td>
      </tr></table>
    </td></tr>
  </table>
</body></html>`;

  try {
    await sendEmail({ to: user.email, subject: 'Final warning: your workspace will be permanently deleted', html });
  } catch {}

  if (user.emailMarketing) {
    try {
      await createNotification({
        userId: user.id,
        type: 'ACCOUNT_DELETION_WARNING',
        title: 'Workspace scheduled for deletion',
        message: 'Your FREE workspace will be permanently deleted in 30 days due to prolonged inactivity. Reactivate now to save your data.',
        link: '/reactivate',
        priority: 'urgent',
      });
    } catch {}
  }
}

async function permanentlyDeleteUser(userId: string) {
  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { organizationId: true },
    });

    if (!user) return;

    const orgId = user.organizationId;

    // Delete user's notifications
    await tx.notification.deleteMany({ where: { userId } });

    // Delete user's support tickets
    await tx.supportTicket.deleteMany({ where: { userId } });

    // Delete user's files
    await tx.file.deleteMany({ where: { uploadedById: userId } });

    // Delete user's payment/invoice records
    await tx.payment.deleteMany({ where: { userId } });
    await tx.invoice.deleteMany({ where: { userId } });

    // Delete asset assignments
    const assets = await tx.asset.findMany({ where: { assignedToId: userId }, select: { id: true } });
    for (const asset of assets) {
      await tx.assetAssignment.deleteMany({ where: { assetId: asset.id } });
      await tx.asset.update({ where: { id: asset.id }, data: { assignedToId: null, status: 'AVAILABLE' } });
    }

    // Delete maintenance records performed by this user
    await tx.maintenance.deleteMany({ where: { performedBy: userId } });

    // If user owns an organization, delete the org and all related data
    if (orgId) {
      const org = await tx.organization.findUnique({
        where: { id: orgId },
        select: { id: true },
      });
      if (org) {
        await tx.department.deleteMany({ where: { organizationId: orgId } });
        await tx.location.deleteMany({ where: { organizationId: orgId } });
        await tx.category.deleteMany({ where: { organizationId: orgId } });
        await tx.vendor.deleteMany({ where: { organizationId: orgId } });
        await tx.file.deleteMany({ where: { organizationId: orgId } });
        // Reassign or unlink assets from the org
        await tx.asset.updateMany({ where: { organizationId: orgId }, data: { organizationId: null } });
        // Delete the organization
        await tx.organization.delete({ where: { id: orgId } });
      }
    }

    // Delete user
    await tx.user.delete({ where: { id: userId } });
  });
}

export async function reactivateAccount(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, plan: true, isDeactivated: true, name: true, email: true,
      },
    });

    if (!user) return { success: false, error: 'User not found' };
    if (user.plan !== 'FREE') return { success: false, error: 'Only FREE accounts can be reactivated via this flow' };
    if (!user.isDeactivated) return { success: false, error: 'Account is not deactivated' };

    await prisma.user.update({
      where: { id: userId },
      data: {
        isDeactivated: false,
        deactivatedAt: null,
        scheduledDeletionAt: null,
        deactivationReason: null,
        inactivityWarningSentAt: null,
        finalWarningSentAt: null,
        lastActiveAt: new Date(),
      },
      select: { id: true },
    });

    const name = user.name || 'there';
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;background:#f4f5f7;padding:40px 16px;">
  <table width="560" cellpadding="0" cellspacing="0" style="margin:0 auto;background:#fff;border-radius:12px;padding:40px;">
    <tr><td>
      <h1 style="font-size:22px;color:#1e293b;">Welcome back! Your workspace is restored</h1>
      <p style="font-size:16px;color:#475569;line-height:1.6;">Hi ${name},</p>
      <p style="font-size:16px;color:#475569;line-height:1.6;">Your MozAssets FREE workspace has been reactivated. All features are available again.</p>
      <table cellpadding="0" cellspacing="0"><tr>
        <td style="border-radius:8px;background:#6366f1;padding:14px 32px;">
          <a href="${getBaseUrl()}/dashboard" style="color:#fff;text-decoration:none;font-weight:600;font-size:15px;">Go to Dashboard</a>
        </td>
      </tr></table>
    </td></tr>
  </table>
</body></html>`;

    try {
      await sendEmail({ to: user.email, subject: 'Your FREE workspace has been reactivated', html });
    } catch {}

    try {
      await createNotification({
        userId,
        type: 'ACCOUNT_REACTIVATED',
        title: 'Workspace reactivated',
        message: 'Your FREE workspace has been reactivated. All features are restored.',
        link: '/dashboard',
        priority: 'high',
      });
    } catch {}

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: msg };
  }
}
