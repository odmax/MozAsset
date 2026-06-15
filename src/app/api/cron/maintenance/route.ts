import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { createNotification } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'mozassets-cron'}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dueRecords = await prisma.maintenance.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledDate: { lte: tomorrow },
      reminderSentAt: null,
    },
    include: { asset: { select: { id: true, name: true, assetTag: true, organizationId: true } }, performedByUser: { select: { name: true, email: true } } },
  });

  let sent = 0;
  for (const record of dueRecords) {
    await createNotification({
      userId: record.performedBy,
      type: 'MAINTENANCE_DUE' as any,
      title: 'Maintenance Due',
      message: `Maintenance "${record.description}" for ${record.asset.name} (${record.asset.assetTag}) is due`,
      link: `/dashboard/assets/${record.asset.id}`,
    }).catch(() => {});

    await sendEmail({
      to: record.performedByUser.email,
      subject: `Maintenance Due: ${record.asset.name}`,
      html: `<p>Maintenance "${record.description}" for <strong>${record.asset.name}</strong> (${record.asset.assetTag}) is due.</p><p><a href="${process.env.APP_URL || ''}/dashboard/assets/${record.asset.id}">View Asset</a></p>`,
      type: 'maintenance_reminder',
    }).catch(() => {});

    await prisma.maintenance.update({ where: { id: record.id }, data: { reminderSentAt: new Date() } });
    sent++;
  }

  const overdueRecords = await prisma.maintenance.findMany({
    where: { status: 'SCHEDULED', scheduledDate: { lt: now }, reminderSentAt: { not: null } },
    include: { asset: { select: { name: true, assetTag: true } } },
  });

  return NextResponse.json({ success: true, dueRemindersSent: sent, overdueCount: overdueRecords.length });
}
