import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function getAdminFromCookies() {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch {}
  }
  const sessionCookie = cookieStore.get('session');
  if (sessionCookie?.value) {
    try {
      const sess = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
      if (sess?.isPlatformAdmin || sess?.isInternalAdmin) return sess;
    } catch {}
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const admin = getAdminFromCookies();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const dbAdmin = await prisma.internalAdmin.findUnique({
    where: { id: admin.id },
    select: { id: true, role: true, permissions: true },
  });

  if (!dbAdmin || !hasPermission(dbAdmin, 'plans:send_payment_link')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const upgradeRequest = await prisma.upgradeRequest.findUnique({
      where: { id: params.id },
    });

    if (!upgradeRequest) {
      return NextResponse.json({ error: 'Upgrade request not found' }, { status: 404 });
    }

    if (upgradeRequest.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: 'Upgrade request is not pending' }, { status: 400 });
    }

    await prisma.upgradeRequest.update({
      where: { id: params.id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[cancel-upgrade] Error:', error);
    return NextResponse.json({ error: 'Failed to cancel upgrade request' }, { status: 500 });
  }
}
