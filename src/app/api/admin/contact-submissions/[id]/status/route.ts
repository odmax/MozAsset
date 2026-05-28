import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/admin-permissions';

export const dynamic = 'force-dynamic';

function getSessionUser() {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('session');
  if (sessionCookie?.value) {
    try {
      return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
    } catch {}
  }
  return null;
}

function getAdminSession() {
  const adminCookie = cookies().get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch {}
  }
  return null;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sessionUser = getSessionUser();
  const adminUser = getAdminSession();

  const isPlatformAdmin = sessionUser?.isPlatformAdmin === true;
  const isInternalAdmin = adminUser?.isInternalAdmin === true || sessionUser?.isInternalAdmin === true;

  if (!isPlatformAdmin && !isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const dbAdmin = isInternalAdmin && adminUser
    ? await prisma.internalAdmin.findUnique({
        where: { id: adminUser.id },
        select: { id: true, role: true, permissions: true },
      })
    : null;

  if (isInternalAdmin && (!dbAdmin || !hasPermission(dbAdmin, 'users:edit'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { status } = await request.json();

    if (!['PENDING', 'CONTACTED', 'RESOLVED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const updated = await prisma.contactSubmission.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update contact submission error:', error);
    return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
  }
}
