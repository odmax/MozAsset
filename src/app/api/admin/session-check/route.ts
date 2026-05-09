import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';

export async function GET() {
  console.log('=== SESSION CHECK API ===');

  const allCookies = cookies().getAll();
  const cookieNames = allCookies.map((c: { name: string }) => c.name);
  console.log('1. Cookies in request:', cookieNames);

  const adminCookie = cookies().get('adminSession');
  console.log('2. adminSession raw cookie found:', !!adminCookie);
  if (adminCookie) {
    console.log('3. adminSession value length:', adminCookie.value.length, 'first 20 chars:', adminCookie.value.substring(0, 20) + '...');
    try {
      const decoded = JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
      console.log('4. Decoded - sessionType:', decoded.sessionType, 'role:', decoded.role, 'id:', decoded.id?.substring(0, 8) + '...');
    } catch (e) {
      console.log('4. FAILED TO DECODE:', e);
    }
  } else {
    console.log('3. No adminSession cookie in request');
  }

  const session = getAdminSession();
  console.log('5. getAdminSession() returns:', !!session);
  if (session) {
    console.log('6. Session - sessionType:', session.sessionType, 'role:', session.role);
  }

  const result = { valid: !!session };
  console.log('7. Returning:', JSON.stringify(result));
  return NextResponse.json(result);
}
