import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAllQueueStats } from '@/lib/queue';

function getAdminSession() {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

export const dynamic = 'force-dynamic';

export async function GET() {
  const admin = getAdminSession();
  if (!admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = await getAllQueueStats();
    return NextResponse.json({ queues: stats });
  } catch (error) {
    console.error('Queue stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
