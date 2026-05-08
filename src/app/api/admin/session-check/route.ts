import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';

export async function GET() {
  const session = getAdminSession();
  return NextResponse.json({ valid: !!session });
}
