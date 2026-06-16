import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSimpleUserSession } from '@/lib/customer-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }
  const dbUrl = process.env.DATABASE_URL;
  const exists = !!dbUrl;
  const isValid = dbUrl?.startsWith('postgresql://') || dbUrl?.startsWith('postgres://');

  return NextResponse.json({ exists, isValid, provider: 'postgresql' });
}
