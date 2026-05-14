import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { cleanupStuckJobs, cleanupOldJobs } from '@/lib/queue';

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

export async function POST() {
  const admin = getAdminSession();
  if (!admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stuck = await cleanupStuckJobs();
    const old = await cleanupOldJobs(7);
    return NextResponse.json({ success: true, stuckCleaned: stuck, oldRemoved: old });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
