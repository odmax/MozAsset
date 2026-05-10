import { cookies } from 'next/headers';

// TEMP_ADMIN_AUTH: simple admin auth until full platform auth is rebuilt.
export interface SimpleAdminSession {
  adminId: string;
  email: string;
  role: string;
  isAdmin: true;
}

export function getSimpleAdminSession(): SimpleAdminSession | null {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('simpleAdminAuth');

  if (authCookie?.value) {
    try {
      const session = JSON.parse(Buffer.from(authCookie.value, 'base64').toString('utf-8'));
      if (session?.adminId && session.isAdmin === true) {
        return {
          adminId: session.adminId,
          email: session.email || '',
          role: session.role || 'OWNER',
          isAdmin: true,
        };
      }
    } catch {}
  }

  return null;
}

export function getSimpleAdminSessionFromHeader(cookieHeader: string): SimpleAdminSession | null {
  const parsed: Record<string, string> = {};
  cookieHeader.split(';').forEach(c => {
    const trimmed = c.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      parsed[trimmed.substring(0, eqIndex)] = trimmed.substring(eqIndex + 1);
    }
  });

  const authCookie = parsed['simpleAdminAuth'];
  if (authCookie) {
    try {
      const session = JSON.parse(Buffer.from(authCookie, 'base64').toString('utf-8'));
      if (session?.adminId && session.isAdmin === true) {
        return {
          adminId: session.adminId,
          email: session.email || '',
          role: session.role || 'OWNER',
          isAdmin: true,
        };
      }
    } catch {}
  }

  return null;
}
