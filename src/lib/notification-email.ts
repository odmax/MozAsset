import {
  renderPaymentSuccessEmail,
  renderPaymentFailedEmail,
  renderSubscriptionUpgradedEmail,
  renderSubscriptionCancelledEmail,
  renderSupportRepliedEmail,
  renderTicketCreatedEmail,
  renderTicketClosedEmail,
  renderAssetAssignedEmail,
  renderMaintenanceDueEmail,
  renderExportCompletedEmail,
  renderUserInvitedEmail,
  renderWelcomeEmail,
} from '@/lib/email-templates';
import type { NotificationType } from '@prisma/client';

const typeToTemplate: Partial<Record<NotificationType, (vars: Record<string, unknown>) => string>> = {
  ASSET_ASSIGNED: renderAssetAssignedEmail,
  MAINTENANCE_DUE: renderMaintenanceDueEmail,
  SUPPORT_REPLY: renderSupportRepliedEmail,
  BILLING_SUCCESSFUL: renderPaymentSuccessEmail,
  BILLING_FAILED: renderPaymentFailedEmail,
  SUBSCRIPTION_CANCELLED: renderSubscriptionCancelledEmail,
  PLAN_UPGRADED: renderSubscriptionUpgradedEmail,
  USER_INVITED: renderUserInvitedEmail,
  EXPORT_COMPLETED: renderExportCompletedEmail,
};

const typeSubject: Partial<Record<NotificationType, string>> = {
  ASSET_ASSIGNED: 'Asset Assigned to You',
  MAINTENANCE_DUE: 'Maintenance Due for Assigned Asset',
  SUPPORT_REPLY: 'Support Ticket Update',
  BILLING_SUCCESSFUL: 'Payment Confirmed',
  BILLING_FAILED: 'Payment Failed',
  SUBSCRIPTION_CANCELLED: 'Subscription Cancelled',
  PLAN_UPGRADED: 'Subscription Upgraded',
  USER_INVITED: 'You\'ve Been Invited to MozAssets',
  EXPORT_COMPLETED: 'Export Completed',
};

const typeCategory: Partial<Record<NotificationType, string>> = {
  ASSET_ASSIGNED: 'asset_assigned',
  MAINTENANCE_DUE: 'maintenance_due',
  SUPPORT_REPLY: 'support',
  BILLING_SUCCESSFUL: 'billing',
  BILLING_FAILED: 'billing',
  SUBSCRIPTION_CANCELLED: 'billing',
  PLAN_UPGRADED: 'billing',
  USER_INVITED: 'user_invited',
  EXPORT_COMPLETED: 'export',
};

const CATEGORIES = ['marketing', 'security', 'support', 'maintenance', 'billing'] as const;

interface EmailPreference {
  marketing: boolean;
  security: boolean;
  support: boolean;
  maintenance: boolean;
  billing: boolean;
}

async function getUserEmailPreferences(userId: string): Promise<EmailPreference> {
  try {
    const { default: prisma } = await import('@/lib/prisma');
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        emailMarketing: true,
        emailSecurity: true,
        emailSupport: true,
        emailMaintenance: true,
        emailBilling: true,
      },
    });
    if (user) {
      return {
        marketing: user.emailMarketing ?? true,
        security: user.emailSecurity ?? true,
        support: user.emailSupport ?? true,
        maintenance: user.emailMaintenance ?? true,
        billing: user.emailBilling ?? true,
      };
    }
  } catch {}
  return { marketing: true, security: true, support: true, maintenance: true, billing: true };
}

export async function sendNotificationEmail(
  userId: string,
  type: NotificationType,
  vars: Record<string, unknown>,
  email?: string
): Promise<void> {
  const templateFn = typeToTemplate[type];
  if (!templateFn) return;

  const category = typeCategory[type] || 'marketing';
  const prefs = await getUserEmailPreferences(userId);

  const categoryKey = category as (typeof CATEGORIES)[number];
  if (!prefs[categoryKey]) return;

  const html = templateFn(vars);
  const subject = typeSubject[type] || 'Notification from MozAssets';
  const to = email || (vars.email as string) || '';

  const { sendEmail: sendMail } = await import('@/lib/email');
  if (!to) {
    try {
      const { default: prisma } = await import('@/lib/prisma');
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!user?.email) return;
      await sendMail({ to: user.email, subject, html, text: '', type });
    } catch {}
    return;
  }

  await sendMail({ to, subject, html, text: '', type });
}
