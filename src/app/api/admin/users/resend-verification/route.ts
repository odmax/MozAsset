import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { hasPermission } from '@/lib/admin-permissions';
import { sendVerificationEmail, hashToken } from '@/lib/email';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const admin = getSimpleAdminSession();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const dbAdmin = await prisma.internalAdmin.findUnique({ where: { id: admin.adminId }, select: { id: true, role: true } });
  if (!dbAdmin || !hasPermission(dbAdmin, 'users:edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { userId } = await request.json();

  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, emailVerified: true, verificationEmailCount: true, lastVerificationEmailAt: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ error: 'Already verified' }, { status: 400 });

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (user.verificationEmailCount >= 3 && user.lastVerificationEmailAt && new Date(user.lastVerificationEmailAt) > oneDayAgo) {
      return NextResponse.json({ error: 'Max 3 verification emails per 24h' }, { status: 429 });
    }

    const rawToken = randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: userId }, data: { emailVerificationToken: hashToken(rawToken), verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), verificationEmailCount: { increment: 1 }, lastVerificationEmailAt: new Date() } });
    await sendVerificationEmail(user.email, user.id, rawToken);
    return NextResponse.json({ success: true, email: user.email });
  }

  const unverified = await prisma.user.findMany({
    where: { isActive: true, emailVerified: null, verificationEmailCount: { lt: 3 } },
    select: { id: true, email: true, verificationEmailCount: true, lastVerificationEmailAt: true },
  });

  let sent = 0;
  const oneDay = new Date(Date.now() - 24 * 60 * 60 * 1000);
  for (const u of unverified) {
    if (u.lastVerificationEmailAt && new Date(u.lastVerificationEmailAt) > oneDay) continue;
    if (u.verificationEmailCount >= 3) continue;
    const rawToken = randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: u.id }, data: { emailVerificationToken: hashToken(rawToken), verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), verificationEmailCount: { increment: 1 }, lastVerificationEmailAt: new Date() } });
    await sendVerificationEmail(u.email, u.id, rawToken).catch(() => {});
    sent++;
  }

  return NextResponse.json({ success: true, totalUnverified: unverified.length, sent });
}
