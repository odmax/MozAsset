import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import type { Role, Plan } from '@prisma/client';

interface UserContext {
  userId: string;
  name: string | null;
  email: string;
  organizationId: string | null;
  role: Role;
  plan: Plan;
  isPlatformAdmin: boolean;
  isInternalAdmin: boolean;
}

async function getCurrentUserContext(): Promise<UserContext | null> {
  const cookieStore = cookies();

  // Try custom session cookie first
  const sessionCookie = cookieStore.get('session');
  if (sessionCookie?.value) {
    try {
      const session = JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
      if (session?.id) {
        const user = await prisma.user.findUnique({
          where: { id: session.id },
          select: { id: true, name: true, email: true, role: true, plan: true, isPlatformAdmin: true, organizationId: true },
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
    } catch {}
  }

  // Try admin session cookie
  const adminCookie = cookieStore.get('adminSession');
  if (adminCookie?.value) {
    try {
      const admin = JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
      if (admin?.id) {
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
    } catch {}
  }

  return null;
}

export async function middleware(request: Request) {
  const url = new URL(request.url);
  const user = await getCurrentUserContext();

  const isAdminRoute = url.pathname.startsWith('/admin');
  const isDashboardRoute = url.pathname.startsWith('/dashboard');
  const isOnboardingRoute = url.pathname.startsWith('/onboarding');

  // Allow public routes
  if (!isAdminRoute && !isDashboardRoute && !isOnboardingRoute) {
    return NextResponse.next();
  }

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user.isInternalAdmin) {
    if (isAdminRoute) return NextResponse.next();
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  if (user.isPlatformAdmin) {
    if (isAdminRoute || isDashboardRoute || isOnboardingRoute) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  if (isOnboardingRoute && user.userId) {
    // Check if user needs onboarding
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { onBoardingComplete: true } });
    if (dbUser?.onBoardingComplete) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (isDashboardRoute && user.userId) {
    const dbUser = await prisma.user.findUnique({ where: { id: user.userId }, select: { onBoardingComplete: true } });
    if (!dbUser?.onBoardingComplete) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/admin/:path*'],
};