import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { retryJob, QUEUES, type QueueName } from '@/lib/queue';

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

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const admin = getAdminSession();
  if (!admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { queue } = await request.json();
    if (!queue || !QUEUES.includes(queue as QueueName)) {
      return NextResponse.json({ error: 'Invalid queue' }, { status: 400 });
    }

    const success = await retryJob(queue as QueueName, params.id);
    if (!success) {
      return NextResponse.json({ error: 'Job not found or not retryable' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Retry job error:', error);
    return NextResponse.json({ error: 'Failed to retry job' }, { status: 500 });
  }
}
