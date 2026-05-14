import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { retryAllFailed, QUEUES, type QueueName } from '@/lib/queue';

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

export async function POST(request: Request) {
  const admin = getAdminSession();
  if (!admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { queue } = await request.json();
    if (!queue || !QUEUES.includes(queue as QueueName)) {
      return NextResponse.json({ error: 'Invalid queue' }, { status: 400 });
    }

    const count = await retryAllFailed(queue as QueueName);
    return NextResponse.json({ success: true, retried: count });
  } catch (error) {
    console.error('Retry all error:', error);
    return NextResponse.json({ error: 'Failed to retry jobs' }, { status: 500 });
  }
}
