import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
// TEMP_ADMIN_AUTH: check simpleAdminAuth cookie
import { getSimpleAdminSession } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const authCookie = cookies().get('simpleAdminAuth');
  const session = getSimpleAdminSession();

  console.log('SESSION CHECK: simpleAdminAuth cookie found:', !!authCookie, '| valid session:', !!session);

  return NextResponse.json({ valid: !!session });
}
