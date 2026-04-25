import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import type { Plan, Role, SubscriptionStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  if (sessionCookie?.value) {
    try {
      return JSON.parse(Buffer.from(sessionCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

function getAdminSession() {
  const adminCookie = cookies().get('adminSession');
  if (adminCookie?.value) {
    try {
      return JSON.parse(Buffer.from(adminCookie.value, 'base64').toString('utf-8'));
    } catch { return null; }
  }
  return null;
}

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const user = getSessionUser();
  const admin = getAdminSession();
  
  console.log('[admin-user-get] Params userId:', params.userId);
  console.log('[admin-user-get] Session user:', user?.email, 'isPlatformAdmin:', user?.isPlatformAdmin);
  console.log('[admin-user-get] Admin user:', admin?.email, 'isInternalAdmin:', admin?.isInternalAdmin);
  
  if (!user?.isPlatformAdmin && !admin?.isInternalAdmin) {
    console.log('[admin-user-get] Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    console.log('[admin-user-get] Finding user:', params.userId);
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        plan: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        department: { select: { id: true, name: true } },
        departmentId: true,
        subscriptionStatus: true,
        assetLimit: true,
        departmentLimit: true,
        locationLimit: true,
        userLimit: true,
        onBoardingComplete: true,
        billingProvider: true,
        billingPeriodStart: true,
        billingPeriodEnd: true,
        canceledAt: true,
        isPlatformAdmin: true,
      },
    });

    if (!targetUser) {
      console.log('[admin-user-get] User not found:', params.userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('[admin-user-get] Found user:', targetUser.email);
    return NextResponse.json(targetUser);

    return NextResponse.json(targetUser);
  } catch (error) {
    console.error('Admin user GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const user = getSessionUser();
  const admin = getAdminSession();
  
  if (!user?.isPlatformAdmin && !admin?.isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { 
      name, 
      role, 
      plan, 
      isActive,
      emailVerified,
      departmentId,
      subscriptionStatus,
      assetLimit,
      departmentLimit,
      locationLimit,
      userLimit,
      onBoardingComplete,
    } = body;

    // Validate plan if provided
    if (plan && !['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Validate role if provided
    if (role && !['EMPLOYEE', 'MANAGER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Validate subscription status
    if (subscriptionStatus && !['ACTIVE', 'CANCELED', 'PAST_DUE', 'PAUSED'].includes(subscriptionStatus)) {
      return NextResponse.json({ error: 'Invalid subscription status' }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name || null;
    if (role) updateData.role = role as Role;
    if (plan) updateData.plan = plan as Plan;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (emailVerified !== undefined) {
      updateData.emailVerified = emailVerified ? new Date(emailVerified) : null;
      if (emailVerified) {
        updateData.emailVerificationToken = null;
      }
    }
    if (departmentId !== undefined) updateData.departmentId = departmentId;
    if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus as SubscriptionStatus;
    if (assetLimit !== undefined) updateData.assetLimit = assetLimit;
    if (departmentLimit !== undefined) updateData.departmentLimit = departmentLimit;
    if (locationLimit !== undefined) updateData.locationLimit = locationLimit;
    if (userLimit !== undefined) updateData.userLimit = userLimit;
    if (onBoardingComplete !== undefined) updateData.onBoardingComplete = onBoardingComplete;

    console.log('[admin-user-patch] Update data:', updateData);

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Admin user PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}