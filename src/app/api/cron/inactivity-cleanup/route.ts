import { NextResponse } from 'next/server';
import { processInactivityLifecycle } from '@/lib/inactivity-cleanup';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Send POST to execute cleanup' });
}

export async function POST(request: Request) {
  const auth = process.env.CRON_SECRET;
  if (auth) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader !== `Bearer ${auth}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await processInactivityLifecycle();
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
