import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<{ success: boolean; error?: string }>;
}

class SMTPEmailProvider implements EmailProvider {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@mozassets.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'MozAssets';
  }

  async send(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      let nodemailerMod: any;
      try {
        const pkg = String.fromCharCode(110, 111, 100, 101, 109, 97, 105, 108, 101, 114);
        nodemailerMod = require(pkg);
      } catch {
        return { success: false, error: 'nodemailer not available' };
      }
      const transporter = nodemailerMod.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      await transporter.sendMail({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

class ConsoleEmailProvider implements EmailProvider {
  async send(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    console.log('=== EMAIL ===');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('Body:', options.text || '[HTML]');
    console.log('=============');
    return { success: true };
  }
}

class ResendEmailProvider implements EmailProvider {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@mozassets.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'MozAssets';
  }

  async send(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Resend API error' };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to send via Resend' };
    }
  }
}

class BrevoEmailProvider implements EmailProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async send(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: process.env.EMAIL_FROM_NAME || 'MozAssets',
            email: process.env.EMAIL_FROM || 'noreply@mozassets.com',
          },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
          textContent: options.text,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Brevo API error' };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to send via Brevo' };
    }
  }
}

function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'console';
  switch (provider) {
    case 'smtp':
      if (process.env.SMTP_HOST) return new SMTPEmailProvider();
      console.warn('SMTP configured but SMTP_HOST not set, falling back to console');
      return new ConsoleEmailProvider();
    case 'resend':
      return new ResendEmailProvider(process.env.RESEND_API_KEY || '');
    case 'brevo':
      return new BrevoEmailProvider(process.env.BREVO_API_KEY || '');
    case 'console':
    default:
      return new ConsoleEmailProvider();
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();
  let lastError: string | undefined;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_DELAY_MS * attempt);
    }
    const result = await provider.send(options);
    if (result.success) {
      await logEmail(options, 'sent');
      return { success: true };
    }
    lastError = result.error;
  }

  await logEmail(options, 'failed', lastError);
  return { success: false, error: lastError };
}

async function logEmail(options: EmailOptions, status: string, error?: string) {
  try {
    await prisma.emailLog.create({
      data: {
        to: options.to,
        subject: options.subject,
        type: options.type || null,
        status,
        error: error || null,
        metadata: (options.metadata || undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error('Failed to log email:', err);
  }
}

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// ---- Template-based sending ----

export async function sendTemplateEmail(
  to: string,
  subject: string,
  html: string,
  text?: string,
  type?: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  return sendEmail({ to, subject, html, text, type, metadata });
}

// ---- Auth emails ----

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  const html = buildEmailHtml({
    title: 'Reset Your Password',
    greeting: 'Hi there,',
    body: `<p>You requested a password reset for your MozAssets account.</p>
<p>Click the button below to reset your password. This link expires in 1 hour.</p>`,
    cta: { text: 'Reset Password', url: resetUrl },
    footerNote: `If you didn't request this, please ignore this email.`,
    plainLink: resetUrl,
  });
  return sendEmail({
    to: email,
    subject: 'Reset your MozAssets password',
    html,
    text: `Reset your password: ${resetUrl}`,
    type: 'password_reset',
  });
}

export async function sendVerificationEmail(
  email: string,
  name: string | null,
  verificationToken: string
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`;
  const html = buildEmailHtml({
    title: 'Verify Your Email',
    greeting: name ? `Hi ${name},` : 'Hi there,',
    body: `<p>Thank you for signing up for MozAssets!</p>
<p>Please verify your email address by clicking the button below. This link expires in 24 hours.</p>`,
    cta: { text: 'Verify Email', url: verifyUrl },
    footerNote: `If you didn't create an account, please ignore this email.`,
    plainLink: verifyUrl,
  });
  return sendEmail({
    to: email,
    subject: 'Verify your MozAssets email',
    html,
    text: `Verify your email: ${verifyUrl}`,
    type: 'email_verification',
  });
}

// ---- HTML builder ----

interface EmailTemplateProps {
  title: string;
  greeting?: string;
  body: string;
  cta?: { text: string; url: string };
  footerNote?: string;
  plainLink?: string;
}

const BRAND_COLOR = '#6366f1';
const BRAND_COLOR_DARK = '#4f46e5';

function buildEmailHtml(props: EmailTemplateProps): string {
  const { title, greeting, body, cta, footerNote, plainLink } = props;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom:8px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:20px;font-weight:700;color:#1e293b;">
                    <span style="color:${BRAND_COLOR};">●</span> MozAssets
                    <span style="font-size:12px;font-weight:400;color:#94a3b8;"> by Mozetech</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;padding:40px 40px 32px;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:8px;">
                    <h1 style="margin:0;font-size:24px;font-weight:700;color:#1e293b;line-height:1.3;">${escapeHtml(title)}</h1>
                  </td>
                </tr>
                ${greeting ? `
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0;font-size:16px;color:#475569;line-height:1.6;">${escapeHtml(greeting)}</p>
                  </td>
                </tr>` : ''}
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
                          <a href="${escapeHtml(cta.url)}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background:${BRAND_COLOR};">
                            ${escapeHtml(cta.text)}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>` : ''}
                ${plainLink ? `
                <tr>
                  <td style="padding-bottom:16px;">
                    <p style="margin:0;font-size:13px;color:#94a3b8;">Or copy this link:</p>
                    <p style="margin:4px 0 0;word-break:break-all;font-size:13px;color:${BRAND_COLOR};"><a href="${escapeHtml(plainLink)}" style="color:${BRAND_COLOR};">${escapeHtml(plainLink)}</a></p>
                  </td>
                </tr>` : ''}
                ${footerNote ? `
                <tr>
                  <td style="padding-bottom:0;">
                    <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.5;">${escapeHtml(footerNote)}</p>
                  </td>
                </tr>` : ''}
              </table>
            </td>
          </tr>
          <!-- Footer -->
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
