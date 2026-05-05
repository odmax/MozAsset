import { cookies } from 'next/headers';
import { headers } from 'next/headers';

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string;
  sessionType: 'admin';
  isInternalAdmin: true;
}

export function getAdminSession(): AdminSession | null {
  const cookieStore = cookies();
  const adminCookie = cookieStore.get('adminSession');
  
  if (adminCookie?.value) {
    try {
      const session = JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
      if (session?.id && session.sessionType === 'admin') {
        return {
          id: session.id,
          email: session.email || '',
          name: session.name || '',
          role: session.role || 'OWNER',
          sessionType: 'admin',
          isInternalAdmin: true,
        };
      }
    } catch {}
  }
  
  return null;
}

export function getAdminSessionFromHeader(cookieHeader: string): AdminSession | null {
  const cookies: Record<string, string> = {};
  cookieHeader.split(';').forEach(cookie => {
    const trimmed = cookie.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      const name = trimmed.substring(0, eqIndex);
      const value = trimmed.substring(eqIndex + 1);
      cookies[name] = value;
    }
  });
  
  const adminCookie = cookies['adminSession'];
  if (adminCookie) {
    try {
      const session = JSON.parse(Buffer.from(adminCookie, 'base64').toString('utf-8'));
      if (session?.id && session.sessionType === 'admin') {
        return {
          id: session.id,
          email: session.email || '',
          name: session.name || '',
          role: session.role || 'OWNER',
          sessionType: 'admin',
          isInternalAdmin: true,
        };
      }
    } catch {}
  }
  
  return null;
}
