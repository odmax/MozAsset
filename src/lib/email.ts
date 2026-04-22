export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailProvider {
  send(options: EmailOptions): Promise<{ success: boolean; error?: string }>;
}

class SMTPEmailProvider implements EmailProvider {
  private nodemailer: any;
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@mozassets.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'MozAssets';
  }

  async send(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      const nodemailer = await import('nodemailer');
      
      const transporter = nodemailer.createTransport({
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
      console.error('SMTP send error:', err);
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

  constructor(apiKey: string) {
    this.apiKey = apiKey;
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
          from: process.env.EMAIL_FROM || 'noreply@mozassets.com',
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to send email' };
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
        return { success: false, error: error.message || 'Failed to send' };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to send email' };
    }
  }
}

function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER || 'console';
  
  switch (provider) {
    case 'smtp':
      if (process.env.SMTP_HOST) {
        return new SMTPEmailProvider();
      }
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

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const provider = getEmailProvider();
  return provider.send(options);
}

export function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  return sendEmail({
    to: email,
    subject: 'Reset your MozAssets password',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="margin-bottom: 20px;">
          <strong style="font-size: 18px;">MozAssets</strong>
          <span style="color: #666; font-size: 12px;"> by Mozetech</span>
        </div>
        <h1>Reset Your Password</h1>
        <p>You requested a password reset for your MozAssets account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Reset Password
        </a>
        <p>Or copy and paste this link:</p>
        <p style="word-break: break-all; color: #6366f1;">${resetUrl}</p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">MozAssets - Asset Management by Mozetech</p>
      </div>
    `,
    text: `Reset your password: ${resetUrl}`,
  });
}

export async function sendVerificationEmail(
  email: string,
  name: string | null,
  verificationToken: string
): Promise<{ success: boolean; error?: string }> {
  const baseUrl = getBaseUrl();
  const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

  return sendEmail({
    to: email,
    subject: 'Verify your MozAssets email',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="margin-bottom: 20px;">
          <strong style="font-size: 18px;">MozAssets</strong>
          <span style="color: #666; font-size: 12px;"> by Mozetech</span>
        </div>
        <h1>Verify Your Email</h1>
        <p>Hi${name ? ` ${name}` : ''},</p>
        <p>Thank you for signing up for MozAssets!</p>
        <p>Please verify your email address:</p>
        <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link:</p>
        <p style="word-break: break-all; color: #6366f1;">${verifyUrl}</p>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">MozAssets - Asset Management by Mozetech</p>
      </div>
    `,
    text: `Verify your email: ${verifyUrl}`,
  });
}
