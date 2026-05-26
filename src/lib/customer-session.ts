import { cookies } from 'next/headers';

// TEMP_USER_AUTH: simple customer auth until full auth is rebuilt.
export interface SimpleUserSession {
  userId: string;
  email: string;
  role: string;
  plan: string;
  organizationId: string | null;
  isUser: true;
}

function parseSessionCookie(raw: string): { userId: string; email: string; role: string; plan: string; organizationId: string | null } | null {
  const attempts: string[] = [];
  try { attempts.push(decodeURIComponent(raw)); } catch {}
  attempts.push(raw);

  for (const candidate of attempts) {
    try {
      const session = JSON.parse(Buffer.from(candidate, 'base64').toString('utf-8'));
      if (session?.userId && session.isUser === true) {
        return {
          userId: session.userId,
          email: session.email || '',
          role: session.role || 'EMPLOYEE',
          plan: session.plan || 'FREE',
          organizationId: session.organizationId || null,
        };
      }
    } catch {}
  }

  return null;
}

export function getSimpleUserSession(): SimpleUserSession | null {
  const cookieStore = cookies();
  const authCookie = cookieStore.get('simpleUserAuth');

  if (authCookie?.value) {
    const parsed = parseSessionCookie(authCookie.value);
    if (parsed) {
      return { ...parsed, isUser: true as const };
    }
  }

  return null;
}

export function getSimpleUserSessionFromHeader(cookieHeader: string): SimpleUserSession | null {
  const parsed: Record<string, string> = {};
  cookieHeader.split(';').forEach(c => {
    const trimmed = c.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > 0) {
      parsed[trimmed.substring(0, eqIndex)] = trimmed.substring(eqIndex + 1);
    }
  });

  const authCookie = parsed['simpleUserAuth'];
  if (authCookie) {
    const parsed = parseSessionCookie(authCookie);
    if (parsed) {
      return { ...parsed, isUser: true as const };
    }
  }

  return null;
}
