import { NextResponse } from 'next/server';
import { getAdminSession } from '@/lib/admin-session';

export async function GET() {
  console.log('=== SESSION CHECK API ===');
  const cookieHeader = require('next/headers').cookies;
  const allCookies = cookieHeader().getAll();
  console.log('1. All cookie names:', allCookies.map((c: any) => c.name));

  const adminCookie = cookieHeader().get('adminSession');
  console.log('2. adminSession cookie found:', !!adminCookie);
  if (adminCookie) {
    console.log('3. adminSession value length:', adminCookie.value.length);
    try {
      const decoded = JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
      console.log('4. Decoded session:', JSON.stringify({ ...decoded, id: decoded.id?.substring(0, 8) + '...' }));
      console.log('5. sessionType:', decoded.sessionType);
      console.log('6. role:', decoded.role);
    } catch (e) {
      console.log('4. FAILED TO DECODE:', e);
    }
  }

  const session = getAdminSession();
  console.log('7. getAdminSession() returned:', !!session);
  if (session) {
    console.log('8. Session sessionType:', session.sessionType);
    console.log('9. Session role:', session.role);
  }

  return NextResponse.json({ valid: !!session });
}
