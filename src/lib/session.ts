import { cookies } from 'next/headers';

export function getSessionUser() {
  const sessionCookie = cookies().get('session');
  
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
  
  return null;
}

export function requireAuth() {
  const user = getSessionUser();
  if (!user) {
    throw new Error('Unauthorized');
  }
  return user;
}