import { NextResponse } from 'next/server';
import { processAllQueues } from '@/lib/queue';
import '@/lib/job-handlers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const expected = process.env.QUEUE_SECRET;
    if (expected && authHeader !== `Bearer ${expected}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = await processAllQueues();
    const total = Object.values(results).reduce((a, b) => a + b, 0);
    return NextResponse.json({ processed: total, queues: results });
  } catch (error) {
    console.error('Queue processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const expected = process.env.QUEUE_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const results = await processAllQueues();
  const total = Object.values(results).reduce((a, b) => a + b, 0);
  return NextResponse.json({ processed: total, queues: results });
}
