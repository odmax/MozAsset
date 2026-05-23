import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> }
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

    const { messageId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['SENT', 'DELIVERED', 'SEEN'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updateData: Record<string, any> = { status };
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'SEEN') updateData.seenAt = new Date();

    await prisma.supportMessage.update({
      where: { id: messageId },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Message status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
