import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  
  const exists = !!dbUrl;
  const isValid = dbUrl?.startsWith('postgresql://') || dbUrl?.startsWith('postgres://');
  
  return NextResponse.json({
    exists,
    startsWithValidPrefix: isValid,
    prefix: dbUrl ? dbUrl.split('://')[0] + '://' : null,
    provider: 'postgresql',
    envNodeEnv: process.env.NODE_ENV,
  });
}