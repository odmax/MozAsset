import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

const RULES = [
  { days: 7, type: 'INACTIVE_7_DAYS', subject: "We haven't seen you in a while" },
  { days: 14, type: 'INACTIVE_14_DAYS', subject: "See what's new in MozAssets" },
  { days: 30, type: 'INACTIVE_30_DAYS', subject: 'Your MozAssets account health report' },
  { days: 60, type: 'INACTIVE_60_DAYS', subject: "We'd love to see you back" },
  { days: 90, type: 'INACTIVE_90_DAYS', subject: 'Need help getting more value from MozAssets?' },
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function yesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'mozassets-cron'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: any[] = [];

  for (const rule of RULES) {
    const startOfDay = daysAgo(rule.days + 1);
    const endOfDay = daysAgo(rule.days);

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        isDeactivated: false,
        lastActiveAt: { lte: endOfDay, gte: startOfDay },
        plan: { in: ['FREE', 'PRO'] },
      },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        organization: { select: { name: true } },
      },
    });

    let sent = 0;

    for (const user of users) {
      const alreadySent = await prisma.userEngagementEmail.findFirst({
        where: { userId: user.id, emailType: rule.type },
      });
      if (alreadySent) continue;

      await sendEmail({
        to: user.email,
        subject: rule.subject,
        html: buildEmailHtml(user.name, user.organization?.name || 'Your Organization', rule, user.plan),
        type: rule.type,
      }).catch(() => {});

      await prisma.userEngagementEmail.create({
        data: { userId: user.id, email: user.email, emailType: rule.type },
      });

      sent++;
    }

    results.push({ type: rule.type, usersFound: users.length, sent });
  }

  return NextResponse.json({ success: true, results });
}

function buildEmailHtml(name: string | null, orgName: string, rule: { days: number; type: string; subject: string }, plan: string): string {
  const firstName = name?.split(' ')[0] || 'there';
  const upgradeCta = plan === 'FREE'
    ? '<p style="margin-top:16px">Upgrade to <strong>Pro</strong> for advanced reports, maintenance scheduling and priority support.</p>'
    : '<p style="margin-top:16px">Upgrade to <strong>Enterprise</strong> for stock verification, approval workflows, custom branding and dedicated account management.</p>';

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7"><tr><td align="center" style="padding:40px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.06)">
<h1 style="margin:0;font-size:22px;color:#1e293b">${rule.subject}</h1>
<p style="margin:16px 0;font-size:16px;color:#475569;line-height:1.6">Hi ${firstName},</p>
<p style="margin:0 0 16px;font-size:16px;color:#475569;line-height:1.6">
  It's been ${rule.days} days since you last logged into <strong>${orgName}</strong> on MozAssets.
  We'd love to help you get back on track with managing your assets.
</p>
<a href="${process.env.APP_URL || ''}/login" style="display:inline-block;background:#6366f1;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600">Log in to MozAssets</a>
${upgradeCta}
<p style="margin-top:24px;font-size:13px;color:#94a3b8">
  MozAssets — Asset Management by Mozetech<br>
  Need help? <a href="${process.env.APP_URL || ''}/contact" style="color:#6366f1">Contact support</a>
</p>
</td></tr></table></td></tr></table></body></html>`;
}
