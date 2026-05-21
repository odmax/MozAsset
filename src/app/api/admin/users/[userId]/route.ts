import { NextResponse } from 'next/server';
import { hasPermission } from '@/lib/admin-permissions';
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
  const sessionUser = getSessionUser();
  const adminUser = getAdminSession();
  
  const isPlatformAdmin = sessionUser?.isPlatformAdmin === true;
  const isInternalAdmin = adminUser?.isInternalAdmin === true || sessionUser?.isInternalAdmin === true;
  
  if (!isPlatformAdmin && !isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Platform admins bypass permission checks (legacy full access)
  if (!isPlatformAdmin && isInternalAdmin && adminUser) {
    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: adminUser.id },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'users:read')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(targetUser);
  } catch (error) {
    console.error('Admin user GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const sessionUser = getSessionUser();
  const adminUser = getAdminSession();

  const isPlatformAdmin = sessionUser?.isPlatformAdmin === true;
  const isInternalAdmin = adminUser?.isInternalAdmin === true || sessionUser?.isInternalAdmin === true;

  if (!isPlatformAdmin && !isInternalAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!isPlatformAdmin && isInternalAdmin && adminUser) {
    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: adminUser.id },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'users:delete')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true, email: true, organizationId: true,
        accounts: { select: { id: true } },
        sessions: { select: { id: true } },
        ownedOrganization: { select: { id: true } },
        managedDepartments: { select: { id: true } },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Delete NextAuth accounts and sessions
      if (targetUser.accounts.length > 0) {
        await tx.account.deleteMany({ where: { userId: params.userId } });
      }
      if (targetUser.sessions.length > 0) {
        await tx.session.deleteMany({ where: { userId: params.userId } });
      }

      // Delete notifications
      await tx.notification.deleteMany({ where: { userId: params.userId } });

      // Delete support tickets
      await tx.supportTicket.deleteMany({ where: { userId: params.userId } });

      // Delete files uploaded by this user
      await tx.file.deleteMany({ where: { uploadedById: params.userId } });

      // Delete payment and invoice records
      await tx.payment.deleteMany({ where: { userId: params.userId } });
      await tx.invoice.deleteMany({ where: { userId: params.userId } });

      // Delete audit logs for this user
      await tx.auditLog.deleteMany({ where: { userId: params.userId } });

      // Clear department manager assignments
      if (targetUser.managedDepartments.length > 0) {
        await tx.department.updateMany({
          where: { managerId: params.userId },
          data: { managerId: null },
        });
      }

      // Unassign assets currently assigned to this user
      const assets = await tx.asset.findMany({
        where: { assignedToId: params.userId },
        select: { id: true },
      });
      for (const asset of assets) {
        await tx.asset.update({
          where: { id: asset.id },
          data: { assignedToId: null, status: 'AVAILABLE' },
        });
      }

      // Delete all asset assignment history for this user
      await tx.assetAssignment.deleteMany({ where: { userId: params.userId } });

      // Delete maintenance records performed by this user
      await tx.maintenance.deleteMany({ where: { performedBy: params.userId } });

      // If user owns an organization (via ownerId), delete it and all related data
      if (targetUser.ownedOrganization) {
        const orgId = targetUser.ownedOrganization.id;
        await tx.department.deleteMany({ where: { organizationId: orgId } });
        await tx.location.deleteMany({ where: { organizationId: orgId } });
        await tx.category.deleteMany({ where: { organizationId: orgId } });
        await tx.vendor.deleteMany({ where: { organizationId: orgId } });
        await tx.file.deleteMany({ where: { organizationId: orgId } });
        await tx.asset.updateMany({
          where: { organizationId: orgId },
          data: { organizationId: null },
        });
        await tx.organization.delete({ where: { id: orgId } });
      }

      // Delete the user
      await tx.user.delete({ where: { id: params.userId } });
    });

    // Create audit log for the deletion action
    await prisma.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'User',
        entityId: params.userId,
        userId: sessionUser?.id || adminUser?.id || 'unknown',
        metadata: { deleted: true, email: targetUser.email },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      } as any,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Admin user DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { userId: string } }
) {
  const sessionUser = getSessionUser();
  const adminUser = getAdminSession();
  
  const isPlatformAdmin = sessionUser?.isPlatformAdmin === true;
  const isInternalAdmin = adminUser?.isInternalAdmin === true || sessionUser?.isInternalAdmin === true;
  
  if (!isPlatformAdmin && !isInternalAdmin) {
    console.log('[admin-user-patch] Unauthorized');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!isPlatformAdmin && isInternalAdmin && adminUser) {
    const dbAdmin = await prisma.internalAdmin.findUnique({
      where: { id: adminUser.id },
      select: { id: true, role: true, permissions: true },
    });
    if (!dbAdmin || !hasPermission(dbAdmin, 'users:modify')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
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

    // Validate role if provided (must match Prisma Role enum)
    if (role && !['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Validate subscription status
    if (subscriptionStatus && !['ACTIVE', 'CANCELED', 'PAST_DUE', 'PAUSED', 'TRIALING'].includes(subscriptionStatus)) {
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