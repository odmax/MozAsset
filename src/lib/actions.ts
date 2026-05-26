'use server';

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Prisma, type Plan } from '@prisma/client';
import { getPlanLimits, canAddAssets, canAddCategories, canAddDepartments, canAddLocations, canAddVendors, canAddUsers, isEnterprise } from '@/lib/billing';
import { getCurrentUserContext } from '@/lib/user-context';
import { createNotification, createNotificationForOrg } from '@/lib/notifications';
import { normalizeEmail } from '@/lib/email-normalize';

// Helper to build organization filter for non-platform admins
function buildOrgFilter(context: Awaited<ReturnType<typeof getCurrentUserContext>>, baseWhere: any = {}) {
  if (context?.isInternalAdmin) {
    return baseWhere; // Platform admins can see all
  }
  if (context?.organizationId) {
    return { ...baseWhere, organizationId: context.organizationId };
  }
  return { ...baseWhere, organizationId: 'never-match' }; // No org = no data
}

export async function getCategories() {
  const context = await getCurrentUserContext();
  if (!context) throw new Error('Unauthorized');

  const where = buildOrgFilter(context);
  return prisma.category.findMany({
    where,
    orderBy: { name: 'asc' },
    include: { _count: { select: { assets: true } } },
  });
}

export async function createCategory(data: { name: string; description?: string; icon?: string }) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const plan = (context.plan || 'FREE') as Plan;
  const currentCount = await prisma.category.count({
    where: buildOrgFilter(context),
  });
  const limitCheck = canAddCategories(plan, currentCount);
  
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'Category limit reached');
  }

  const category = await prisma.category.create({
    data: {
      ...data,
      organizationId: context.isInternalAdmin ? undefined : context.organizationId,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'Category',
      entityId: category.id,
      userId: context.userId,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/categories');
  return category;
}

export async function updateCategory(id: string, data: { name?: string; description?: string; icon?: string }) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const category = await prisma.category.update({
    where: { id, ...buildOrgFilter(context) },
    data,
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'Category',
      entityId: id,
      userId: context.userId,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/categories');
  return category;
}

export async function deleteCategory(id: string) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const assetCount = await prisma.asset.count({ where: { categoryId: id, ...buildOrgFilter(context) } });
  if (assetCount > 0) {
    throw new Error(`Cannot delete category - ${assetCount} asset(s) are linked to this category. Please reassign or delete the assets first.`);
  }

  await prisma.category.delete({ where: { id, ...buildOrgFilter(context) } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'Category',
      entityId: id,
      userId: context.userId,
    },
  });

  revalidatePath('/dashboard/categories');
}

export async function getDepartments() {
  const context = await getCurrentUserContext();
  if (!context) throw new Error('Unauthorized');

  return prisma.department.findMany({
    where: buildOrgFilter(context),
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { users: true, assets: true } },
      manager: { select: { id: true, name: true } },
    },
  });
}

export async function createDepartment(data: { name: string; code: string; description?: string }) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const plan = (context.plan || 'FREE') as Plan;
  const currentCount = await prisma.department.count({
    where: buildOrgFilter(context),
  });
  const limitCheck = canAddDepartments(plan, currentCount);
  
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'Department limit reached');
  }

  const department = await prisma.department.create({
    data: {
      ...data,
      organizationId: context.isInternalAdmin ? undefined : context.organizationId,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'Department',
      entityId: department.id,
      userId: context.userId,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/departments');
  return department;
}

export async function updateDepartment(id: string, data: { name?: string; code?: string; description?: string }) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const department = await prisma.department.update({ where: { id, ...buildOrgFilter(context) }, data });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'Department',
      entityId: id,
      userId: context.userId,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/departments');
  return department;
}

export async function deleteDepartment(id: string) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const assetCount = await prisma.asset.count({ where: { departmentId: id, ...buildOrgFilter(context) } });
  const userCount = await prisma.user.count({ where: { departmentId: id, ...buildOrgFilter(context) } });
  
  if (assetCount > 0 || userCount > 0) {
    const reasons = [];
    if (assetCount > 0) reasons.push(`${assetCount} asset(s)`);
    if (userCount > 0) reasons.push(`${userCount} user(s)`);
    throw new Error(`Cannot delete department - ${reasons.join(' and ')} are linked to this department. Please reassign them first.`);
  }

  await prisma.department.delete({ where: { id, ...buildOrgFilter(context) } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'Department',
      entityId: id,
      userId: context.userId,
    },
  });

  revalidatePath('/dashboard/departments');
}

export async function getLocations() {
  const context = await getCurrentUserContext();
  if (!context) throw new Error('Unauthorized');

  return prisma.location.findMany({
    where: buildOrgFilter(context),
    orderBy: { name: 'asc' },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { assets: true } },
    },
  });
}

export async function createLocation(data: { name: string; address?: string; building?: string; floor?: string; room?: string; departmentId?: string }) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const plan = (context.plan || 'FREE') as Plan;
  const currentCount = await prisma.location.count({
    where: buildOrgFilter(context),
  });
  const limitCheck = canAddLocations(plan, currentCount);
  
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'Location limit reached');
  }

  const location = await prisma.location.create({
    data: {
      ...data,
      organizationId: context.isInternalAdmin ? undefined : context.organizationId,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'Location',
      entityId: location.id,
      userId: context.userId,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/locations');
  return location;
}

export async function updateLocation(id: string, data: { name?: string; address?: string; building?: string; floor?: string; room?: string; departmentId?: string }) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const location = await prisma.location.update({ where: { id, ...buildOrgFilter(context) }, data });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'Location',
      entityId: id,
      userId: context.userId,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/locations');
  return location;
}

export async function deleteLocation(id: string) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const assetCount = await prisma.asset.count({ where: { locationId: id, ...buildOrgFilter(context) } });
  if (assetCount > 0) {
    throw new Error(`Cannot delete location - ${assetCount} asset(s) are linked to this location. Please reassign or delete the assets first.`);
  }

  await prisma.location.delete({ where: { id, ...buildOrgFilter(context) } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'Location',
      entityId: id,
      userId: context.userId,
    },
  });

  revalidatePath('/dashboard/locations');
}

export async function getVendors() {
  const context = await getCurrentUserContext();
  if (!context) throw new Error('Unauthorized');

  return prisma.vendor.findMany({
    where: buildOrgFilter(context),
    orderBy: { name: 'asc' },
    include: { _count: { select: { assets: true } } },
  });
}

export async function createVendor(data: { name: string; contactName?: string; email?: string; phone?: string; address?: string; website?: string; notes?: string }) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const plan = (context.plan || 'FREE') as Plan;
  const currentCount = await prisma.vendor.count({
    where: buildOrgFilter(context),
  });
  const limitCheck = canAddVendors(plan, currentCount);
  
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'Vendor limit reached');
  }

  const vendor = await prisma.vendor.create({
    data: {
      ...data,
      organizationId: context.isInternalAdmin ? undefined : context.organizationId,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'Vendor',
      entityId: vendor.id,
      userId: context.userId,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/vendors');
  return vendor;
}

export async function updateVendor(id: string, data: { name?: string; contactName?: string; email?: string; phone?: string; address?: string; website?: string; notes?: string }) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const vendor = await prisma.vendor.update({ where: { id, ...buildOrgFilter(context) }, data });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'Vendor',
      entityId: id,
      userId: context.userId,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/vendors');
  return vendor;
}

export async function deleteVendor(id: string) {
  const context = await getCurrentUserContext();
  if (!context || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role)) {
    throw new Error('Unauthorized');
  }

  const assetCount = await prisma.asset.count({ where: { vendorId: id, ...buildOrgFilter(context) } });
  if (assetCount > 0) {
    throw new Error(`Cannot delete vendor - ${assetCount} asset(s) are linked to this vendor. Please reassign or delete the assets first.`);
  }

  await prisma.vendor.delete({ where: { id, ...buildOrgFilter(context) } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'Vendor',
      entityId: id,
      userId: context.userId,
    },
  });

  revalidatePath('/dashboard/vendors');
}

export async function getUsers() {
  const context = await getCurrentUserContext();
  if (!context) throw new Error('Unauthorized');

  return prisma.user.findMany({
    where: buildOrgFilter(context),
    orderBy: { name: 'asc' },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { assets: true } },
    },
  });
}

export async function createUser(data: { name: string; email: string; password?: string; role: string; departmentId?: string; isActive?: boolean }) {
  data.email = normalizeEmail(data.email);
  const context = await getCurrentUserContext();
  if (!context || context.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }

  const plan = (context.plan || 'FREE') as Plan;
  const currentCount = await prisma.user.count({
    where: buildOrgFilter(context),
  });
  const limitCheck = canAddUsers(plan, currentCount);
  
  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'User limit reached');
  }

  const { default: bcrypt } = await import('bcryptjs');
  const hashedPassword = data.password ? await bcrypt.hash(data.password, 12) : null;

  const newUser = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      role: data.role as any,
      departmentId: data.departmentId,
      isActive: data.isActive ?? true,
      onBoardingComplete: true,
      emailVerified: new Date(),
      organizationId: context.isInternalAdmin ? undefined : context.organizationId,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'User',
      entityId: newUser.id,
      userId: context.userId,
      changes: { ...data, password: undefined } as Prisma.InputJsonValue,
    },
  });

  createNotification({
    userId: newUser.id,
    organizationId: context.organizationId,
    type: 'USER_INVITED',
    title: 'Welcome to MozAssets',
    message: `Your account has been created by ${context.name || 'an administrator'}`,
    link: '/dashboard',
  }).catch((err) => console.error('Failed to create notification:', err));

  if (context.organizationId) {
    createNotificationForOrg({
      organizationId: context.organizationId,
      excludeUserId: newUser.id,
      type: 'ORGANIZATION_UPDATE',
      title: 'New User Added',
      message: `${data.name} has been added to the organization`,
      link: '/dashboard/users',
      actorId: context.userId,
    }).catch((err) => console.error('Failed to create org notification:', err));
  }

  revalidatePath('/dashboard/users');
  return newUser;
}

export async function updateUser(id: string, data: { name?: string; email?: string; password?: string; role?: string; departmentId?: string; isActive?: boolean }) {
  if (data.email) data.email = normalizeEmail(data.email);
  const context = await getCurrentUserContext();
  if (!context || context.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }

  const updateData: any = { ...data };
  if (data.password) {
    const { default: bcrypt } = await import('bcryptjs');
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  const updated = await prisma.user.update({ where: { id, ...buildOrgFilter(context) }, data: updateData });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      userId: context.userId,
      changes: { ...data, password: undefined } as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/users');
  return updated;
}

export async function deleteUser(id: string) {
  const context = await getCurrentUserContext();
  if (!context || context.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }

  await prisma.user.delete({ where: { id, ...buildOrgFilter(context) } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      userId: context.userId,
    },
  });

  revalidatePath('/dashboard/users');
}

export async function toggleUserActive(id: string) {
  const context = await getCurrentUserContext();
  if (!context || context.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }

  const dbUser = await prisma.user.findUnique({ where: { id, ...buildOrgFilter(context) } });
  if (!dbUser) throw new Error('User not found');

  const updated = await prisma.user.update({
    where: { id, ...buildOrgFilter(context) },
    data: { isActive: !dbUser.isActive },
  });

  await prisma.auditLog.create({
    data: {
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'User',
      entityId: id,
      userId: context.userId,
      changes: { isActive: updated.isActive } as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/users');
  return updated;
}

export async function resetUserPassword(id: string, newPassword: string) {
  const context = await getCurrentUserContext();
  if (!context || context.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }

  const { default: bcrypt } = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id, ...buildOrgFilter(context) },
    data: { password: hashedPassword },
  });

  await prisma.auditLog.create({
    data: {
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: id,
      userId: context.userId,
    },
  });

  revalidatePath('/dashboard/users');
}

export async function getAuditLogs(params?: { page?: number; limit?: number; action?: string; entityType?: string }) {
  const context = await getCurrentUserContext();
  if (!context) throw new Error('Unauthorized');

  const { page = 1, limit = 50, action, entityType } = params || {};

  // AuditLog has NO organizationId; scope by user's org via user relation instead
  const where: any = context.isInternalAdmin
    ? {}
    : context.organizationId
      ? { user: { organizationId: context.organizationId } }
      : { id: undefined };
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        asset: { select: { id: true, assetTag: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// ---------- Enterprise: Branch Management ----------

export async function getBranches() {
  const context = await getCurrentUserContext();
  if (!context?.userId) throw new Error('Unauthorized');
  if (!isEnterprise(context.plan)) throw new Error('Enterprise plan required');

  if (!context.organizationId) throw new Error('No organization found');
  return prisma.branch.findMany({
    where: { organizationId: context.organizationId },
    orderBy: { name: 'asc' },
  });
}

export async function getBranch(id: string) {
  const context = await getCurrentUserContext();
  if (!context?.userId) throw new Error('Unauthorized');
  if (!isEnterprise(context.plan)) throw new Error('Enterprise plan required');
  if (!context.organizationId) throw new Error('No organization found');

  return prisma.branch.findFirst({
    where: { id, organizationId: context.organizationId },
    include: {
      _count: { select: { assets: true, users: true, departments: true, locations: true } },
    },
  });
}

export async function createBranch(data: { name: string; code?: string; address?: string; city?: string; province?: string; phone?: string; email?: string }) {
  const context = await getCurrentUserContext();
  if (!context?.userId) throw new Error('Unauthorized');
  if (!isEnterprise(context.plan)) throw new Error('Enterprise plan required');

  if (!context.organizationId) throw new Error('No organization found');

  const branch = await prisma.branch.create({
    data: {
      name: data.name,
      code: data.code,
      address: data.address,
      city: data.city,
      province: data.province,
      phone: data.phone,
      email: data.email,
      organizationId: context.organizationId,
    },
  });

  revalidatePath('/dashboard/settings');
  return branch;
}

export async function updateBranch(id: string, data: { name?: string; code?: string; address?: string; city?: string; province?: string; phone?: string; email?: string; isActive?: boolean }) {
  const context = await getCurrentUserContext();
  if (!context?.userId) throw new Error('Unauthorized');
  if (!isEnterprise(context.plan)) throw new Error('Enterprise plan required');

  if (!context.organizationId) throw new Error('No organization found');

  const existing = await prisma.branch.findFirst({
    where: { id, organizationId: context.organizationId },
  });
  if (!existing) throw new Error('Branch not found');

  const branch = await prisma.branch.update({
    where: { id },
    data,
  });

  revalidatePath('/dashboard/settings');
  return branch;
}

export async function deleteBranch(id: string) {
  const context = await getCurrentUserContext();
  if (!context?.userId) throw new Error('Unauthorized');
  if (!isEnterprise(context.plan)) throw new Error('Enterprise plan required');
  if (!context.organizationId) throw new Error('No organization found');

  const existing = await prisma.branch.findFirst({
    where: { id, organizationId: context.organizationId },
  });
  if (!existing) throw new Error('Branch not found');

  await prisma.branch.delete({ where: { id } });
  revalidatePath('/dashboard/settings');
}
