import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  try {
    const adminCookie = cookies().get('adminSession');
    if (!adminCookie?.value) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let admin;
    try { admin = JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8')); }
    catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    if (!admin.isInternalAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: admin.id },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'tickets:reply')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { ticketId } = await params;
    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { adminTypingAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin typing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
