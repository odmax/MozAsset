function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// Re-export the builder for use in this file
function e(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

interface TemplateVars {
  name?: string;
  [key: string]: unknown;
}

function renderHtml(props: {
  title: string;
  greeting?: string;
  body: string;
  cta?: { text: string; url: string };
  footerNote?: string;
  plainLink?: string;
}): string {
  const { title, greeting, body, cta, footerNote, plainLink } = props;
  const BRAND_COLOR = '#6366f1';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td style="padding-bottom:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:#1e293b;">
                    <img src="${getBaseUrl()}/logo1.png" alt="MozAssets" style="height:28px;width:auto;vertical-align:middle;margin-right:8px;" />
                    <span style="font-size:12px;font-weight:400;color:#94a3b8;"> by Mozetech</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border-radius:12px;padding:40px 40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:8px;">
                    <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.3;">${e(title)}</h1>
                  </td>
                </tr>
                ${greeting ? `<tr><td style="padding-bottom:16px;"><p style="margin:0;font-size:16px;color:#475569;line-height:1.6;">${e(greeting)}</p></td></tr>` : ''}
                <tr>
                  <td style="padding-bottom:${cta ? '24px' : '0'};">
                    <p style="margin:0;font-size:16px;color:#475569;line-height:1.6;">${body}</p>
                  </td>
                </tr>
                ${cta ? `
                <tr>
                  <td style="padding-bottom:24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="border-radius:8px;background:${BRAND_COLOR};">
                          <a href="${e(cta.url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                            ${e(cta.text)}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ''}
                ${plainLink ? `<tr><td style="padding-bottom:16px;"><p style="margin:0;font-size:13px;color:#94a3b8;">Or copy this link:</p><p style="margin:4px 0 0;word-break:break-all;font-size:13px;color:${BRAND_COLOR};"><a href="${e(plainLink)}" style="color:${BRAND_COLOR};">${e(plainLink)}</a></p></td></tr>` : ''}
                ${footerNote ? `<tr><td style="padding-bottom:0;"><p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.5;">${e(footerNote)}</p></td></tr>` : ''}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.5;">
                MozAssets — Asset Management by Mozetech<br>
                &copy; ${new Date().getFullYear()} Mozetech. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---- Welcome ----
export function renderWelcomeEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  return renderHtml({
    title: 'Welcome to MozAssets',
    greeting: `Hi ${e(name)},`,
    body: `<p>Welcome to MozAssets! We're excited to have you on board.</p>
<p>MozAssets helps you track, manage, and optimize your assets from a single dashboard. Here's what you can do:</p>
<ul style="color:#475569;font-size:15px;line-height:1.7;padding-left:20px;">
  <li>Track all your physical and digital assets</li>
  <li>Manage assignments and transfers</li>
  <li>Schedule and log maintenance</li>
  <li>Generate detailed reports</li>
</ul>
<p>Get started by adding your first asset or exploring the dashboard.</p>`,
    cta: { text: 'Go to Dashboard', url: `${getBaseUrl()}/dashboard` },
    footerNote: 'If you did not create this account, please contact us immediately.',
  });
}

// ---- Verify Email ----
export function renderVerifyEmailEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const token = vars.token as string;
  const url = `${getBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  return renderHtml({
    title: 'Verify Your Email',
    greeting: `Hi ${e(name)},`,
    body: `<p>Thank you for signing up for MozAssets! Please verify your email address to get started.</p>`,
    cta: { text: 'Verify Email', url },
    plainLink: url,
    footerNote: 'This link expires in 24 hours. If you did not create an account, please ignore this email.',
  });
}

// ---- Password Reset ----
export function renderPasswordResetEmail(vars: TemplateVars) {
  const token = vars.token as string;
  const url = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  return renderHtml({
    title: 'Reset Your Password',
    greeting: 'Hi there,',
    body: `<p>You requested a password reset for your MozAssets account. Click the button below to reset it.</p>`,
    cta: { text: 'Reset Password', url },
    plainLink: url,
    footerNote: 'This link expires in 1 hour. If you did not request this, please ignore this email.',
  });
}

// ---- Login Alert ----
export function renderLoginAlertEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const time = vars.time as string;
  const ip = vars.ip as string;
  return renderHtml({
    title: 'New Login to Your Account',
    greeting: `Hi ${e(name)},`,
    body: `<p>We detected a new login to your MozAssets account.</p>
<p><strong>Time:</strong> ${e(time)}<br>
<strong>IP Address:</strong> ${e(ip)}</p>
<p>If this was you, you can ignore this email. If you did not log in, please change your password immediately.</p>`,
    cta: { text: 'Secure Account', url: `${getBaseUrl()}/dashboard/settings` },
    footerNote: 'This is an automated security alert.',
  });
}

// ---- Payment Success ----
export function renderPaymentSuccessEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const plan = vars.plan as string;
  const amount = vars.amount as string;
  return renderHtml({
    title: 'Payment Confirmed',
    greeting: `Hi ${e(name)},`,
    body: `<p>Your payment has been successfully processed.</p>
<p><strong>Plan:</strong> ${e(plan)}<br>
<strong>Amount:</strong> ${e(amount)}</p>
<p>Your subscription is now active and you have access to all ${e(plan)} features.</p>`,
    cta: { text: 'View Billing', url: `${getBaseUrl()}/billing` },
    footerNote: 'Thank you for choosing MozAssets!',
  });
}

// ---- Payment Failed ----
export function renderPaymentFailedEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const plan = vars.plan as string;
  return renderHtml({
    title: 'Payment Failed',
    greeting: `Hi ${e(name)},`,
    body: `<p>We were unable to process your payment for the ${e(plan)} plan.</p>
<p>Don't worry — we'll retry automatically. Please ensure your payment method is up to date to avoid any interruption to your service.</p>`,
    cta: { text: 'Update Payment', url: `${getBaseUrl()}/billing` },
    footerNote: 'If the issue persists, your subscription may be downgraded.',
  });
}

// ---- Subscription Upgraded ----
export function renderSubscriptionUpgradedEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const plan = vars.plan as string;
  return renderHtml({
    title: 'Subscription Upgraded',
    greeting: `Hi ${e(name)},`,
    body: `<p>Congratulations! Your subscription has been upgraded to <strong>${e(plan)}</strong>.</p>
<p>You now have access to all the premium features included in your plan. Explore the new capabilities available to you.</p>`,
    cta: { text: 'Explore Features', url: `${getBaseUrl()}/dashboard` },
    footerNote: 'Thank you for upgrading!',
  });
}

// ---- Subscription Cancelled ----
export function renderSubscriptionCancelledEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const endDate = vars.endDate as string;
  return renderHtml({
    title: 'Subscription Cancelled',
    greeting: `Hi ${e(name)},`,
    body: `<p>Your MozAssets subscription has been cancelled.</p>
${endDate ? `<p>You will continue to have access to your current features until <strong>${e(endDate)}</strong>.</p>` : '<p>Your account has been downgraded to the Free plan.</p>'}
<p>If you change your mind, you can resubscribe at any time.</p>`,
    cta: { text: 'View Plans', url: `${getBaseUrl()}/pricing` },
    footerNote: 'We\'re sorry to see you go. Your feedback helps us improve.',
  });
}

// ---- Trial Ending ----
export function renderTrialEndingEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const daysLeft = vars.daysLeft as string;
  return renderHtml({
    title: 'Your Trial is Ending',
    greeting: `Hi ${e(name)},`,
    body: `<p>Your MozAssets Pro trial ends in <strong>${e(daysLeft)} days</strong>.</p>
<p>Upgrade to keep your premium features, including advanced reports, CSV exports, priority support, and more.</p>`,
    cta: { text: 'Upgrade Now', url: `${getBaseUrl()}/billing` },
    footerNote: 'Your data will be saved, but premium features will be disabled after the trial ends.',
  });
}

// ---- Ticket Created ----
export function renderTicketCreatedEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const subject = vars.subject as string;
  const category = vars.category as string;
  return renderHtml({
    title: 'Support Ticket Created',
    greeting: `Hi ${e(name)},`,
    body: `<p>Your support ticket has been created successfully.</p>
<p><strong>Subject:</strong> ${e(subject)}<br>
<strong>Category:</strong> ${e(category)}</p>
<p>Our team will review your ticket and get back to you as soon as possible.</p>`,
    cta: { text: 'View Ticket', url: `${getBaseUrl()}/dashboard/support` },
    footerNote: 'You will receive a notification when our team responds.',
  });
}

// ---- Support Replied ----
export function renderSupportRepliedEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const subject = vars.subject as string;
  return renderHtml({
    title: 'Support Ticket Update',
    greeting: `Hi ${e(name)},`,
    body: `<p>Your support ticket <strong>"${e(subject)}"</strong> has received a reply from our team.</p>
<p>Log in to view the response and continue the conversation.</p>`,
    cta: { text: 'View Reply', url: `${getBaseUrl()}/dashboard/support` },
    footerNote: 'Reply in-app or create a new ticket for further assistance.',
  });
}

// ---- Ticket Closed ----
export function renderTicketClosedEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const subject = vars.subject as string;
  return renderHtml({
    title: 'Support Ticket Closed',
    greeting: `Hi ${e(name)},`,
    body: `<p>Your support ticket <strong>"${e(subject)}"</strong> has been marked as resolved and closed.</p>
<p>If you need further assistance, feel free to create a new ticket or reply to reopen this one.</p>`,
    cta: { text: 'View Ticket', url: `${getBaseUrl()}/dashboard/support` },
    footerNote: 'Your satisfaction is important to us. Let us know if you need anything else.',
  });
}

// ---- User Invited ----
export function renderUserInvitedEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const invitedBy = vars.invitedBy as string;
  return renderHtml({
    title: 'You\'ve Been Invited!',
    greeting: `Hi ${e(name)},`,
    body: `<p>You have been invited to join MozAssets by ${e(invitedBy)}.</p>
<p>MozAssets is an asset management platform that helps teams track, manage, and optimize their assets.</p>`,
    cta: { text: 'Get Started', url: `${getBaseUrl()}/login` },
    footerNote: 'If you were not expecting this invitation, you can safely ignore this email.',
  });
}

// ---- Asset Assigned ----
export function renderAssetAssignedEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const assetName = vars.assetName as string;
  const assignedBy = vars.assignedBy as string;
  return renderHtml({
    title: 'Asset Assigned to You',
    greeting: `Hi ${e(name)},`,
    body: `<p>The asset <strong>"${e(assetName)}"</strong> has been assigned to you by ${e(assignedBy)}.</p>
<p>Please log in to view the details and acknowledge the assignment.</p>`,
    cta: { text: 'View Asset', url: `${getBaseUrl()}/dashboard/assets` },
    footerNote: 'Please ensure the asset is in good condition and report any issues.',
  });
}

// ---- Maintenance Due ----
export function renderMaintenanceDueEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const assetName = vars.assetName as string;
  const dueDate = vars.dueDate as string;
  return renderHtml({
    title: 'Maintenance Due',
    greeting: `Hi ${e(name)},`,
    body: `<p>Maintenance is due for asset <strong>"${e(assetName)}"</strong>.</p>
<p><strong>Due Date:</strong> ${e(dueDate)}</p>
<p>Please schedule the required maintenance to keep your asset in optimal condition.</p>`,
    cta: { text: 'View Asset', url: `${getBaseUrl()}/dashboard/assets` },
    footerNote: 'Regular maintenance extends the life of your assets.',
  });
}

// ---- Export Completed ----
export function renderExportCompletedEmail(vars: TemplateVars) {
  const name = vars.name || 'there';
  const exportType = vars.exportType as string;
  return renderHtml({
    title: 'Export Completed',
    greeting: `Hi ${e(name)},`,
    body: `<p>Your ${e(exportType)} export has been completed and is ready for download.</p>`,
    cta: { text: 'Download Export', url: `${getBaseUrl()}/dashboard/reports` },
    footerNote: 'Export files are available for 24 hours.',
  });
}
