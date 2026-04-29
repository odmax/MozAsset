import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import type { Role, Plan } from '@prisma/client';

export interface UserContext {
  userId: string;
  name: string | null;
  email: string;
  organizationId: string | null;
  role: Role;
  plan: Plan;
  isPlatformAdmin: boolean;
  isInternalAdmin: boolean;
}

/**
 * Get current user context from session (handles both NextAuth and custom session cookie)
 * Returns null if not authenticated
 */
export async function getCurrentUserContext(): Promise<UserContext | null> {
  const cookieStore = cookies();
  
  // Try custom session cookie first (used by onboarding/registration)
  const sessionCookie = cookieStore.get('session');
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(
        Buffer.from(sessionCookie.value, 'base64').toString('utf-8')
      );
      if (session?.id) {
        const user = await prisma.user.findUnique({
          where: { id: session.id },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            plan: true,
            isPlatformAdmin: true,
            organizationId: true,
          },
        });
        if (user) {
          return {
            userId: user.id,
            name: user.name,
            email: user.email,
            organizationId: user.organizationId,
            role: user.role,
            plan: user.plan,
            isPlatformAdmin: user.isPlatformAdmin || false,
            isInternalAdmin: false,
          };
        }
      }
    } catch {
      // Fall through to NextAuth check
    }
  }

  // Try admin session cookie (internal admin)
  const adminCookie = cookieStore.get('adminSession');
  if (adminCookie?.value) {
    try {
      const admin = JSON.parse(
        Buffer.from(adminCookie.value, 'base64').toString('utf-8')
      );
      if (admin?.id) {
        // Fetch full user details
        const user = await prisma.user.findUnique({
          where: { id: admin.id },
          select: { name: true, email: true },
        });
        return {
          userId: admin.id,
          name: user?.name || null,
          email: user?.email || '',
          organizationId: null,
          role: 'SUPER_ADMIN' as Role,
          plan: 'ENTERPRISE' as Plan,
          isPlatformAdmin: false,
          isInternalAdmin: true,
        };
      }
    } catch {
      // Not an admin session
    }
  }

  return null;
}

/**
 * Get session user from custom session cookie (legacy helper)
 */
export function getSessionUser() {
  const sessionCookie = cookies().get('session');
  if (sessionCookie?.value) {
    try {
      return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

/**
 * Get admin session from adminSession cookie (legacy helper)
 */
export function getAdminSession() {
  const adminCookie = cookies().get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}
