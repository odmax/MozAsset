import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getQueueJobs, QUEUES, type QueueName } from '@/lib/queue';
import type { Job } from '@/lib/queue';

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

export async function GET(request: Request) {
  const admin = getAdminSession();
  if (!admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queue = searchParams.get('queue') || 'email';
  const status = (searchParams.get('status') || 'all') as Job['status'] | 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));

  if (!QUEUES.includes(queue as QueueName)) {
    return NextResponse.json({ error: 'Invalid queue' }, { status: 400 });
  }

  try {
    const result = await getQueueJobs(queue as QueueName, status, page, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Get jobs error:', error);
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
  }
}
