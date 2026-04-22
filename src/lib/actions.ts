'use server';

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { getPlanLimits, canAddAssets } from '@/lib/billing';

function getSessionUser() {
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

export async function getCategories() {
  const user = getSessionUser();
  if (!user) throw new Error('Unauthorized');

  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { assets: true } } },
  });
}

export async function createCategory(data: { name: string; description?: string; icon?: string }) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const category = await prisma.category.create({
    data,
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'Category',
      entityId: category.id,
      userId: user.id,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/categories');
  return category;
}

export async function updateCategory(id: string, data: { name?: string; description?: string; icon?: string }) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const category = await prisma.category.update({
    where: { id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'Category',
      entityId: id,
      userId: user.id,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/categories');
  return category;
}

export async function deleteCategory(id: string) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const assetCount = await prisma.asset.count({ where: { categoryId: id } });
  if (assetCount > 0) {
    throw new Error(`Cannot delete category - ${assetCount} asset(s) are linked to this category. Please reassign or delete the assets first.`);
  }

  await prisma.category.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'Category',
      entityId: id,
      userId: user.id,
    },
  });

  revalidatePath('/dashboard/categories');
}

export async function getDepartments() {
  const user = getSessionUser();
  if (!user) throw new Error('Unauthorized');

  return prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { users: true, assets: true } },
      manager: { select: { id: true, name: true } },
    },
  });
}

export async function createDepartment(data: { name: string; code: string; description?: string }) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const plan = dbUser?.plan || 'FREE';
  const limits = getPlanLimits(plan);
  const currentCount = await prisma.department.count();
  
  if (limits.departmentLimit !== -1 && currentCount >= limits.departmentLimit) {
    if (plan === 'FREE') {
      throw new Error(`You have reached your department limit. Upgrade to PRO for unlimited departments.`);
    }
    throw new Error(`You have reached your department limit.`);
  }

  const department = await prisma.department.create({ data });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'Department',
      entityId: department.id,
      userId: user.id,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/departments');
  return department;
}

export async function updateDepartment(id: string, data: { name?: string; code?: string; description?: string }) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const department = await prisma.department.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'Department',
      entityId: id,
      userId: user.id,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/departments');
  return department;
}

export async function deleteDepartment(id: string) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const assetCount = await prisma.asset.count({ where: { departmentId: id } });
  const userCount = await prisma.user.count({ where: { departmentId: id } });
  
  if (assetCount > 0 || userCount > 0) {
    const reasons = [];
    if (assetCount > 0) reasons.push(`${assetCount} asset(s)`);
    if (userCount > 0) reasons.push(`${userCount} user(s)`);
    throw new Error(`Cannot delete department - ${reasons.join(' and ')} are linked to this department. Please reassign them first.`);
  }

  await prisma.department.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'Department',
      entityId: id,
      userId: user.id,
    },
  });

  revalidatePath('/dashboard/departments');
}

export async function getLocations() {
  const user = getSessionUser();
  if (!user) throw new Error('Unauthorized');

  return prisma.location.findMany({
    orderBy: { name: 'asc' },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { assets: true } },
    },
  });
}

export async function createLocation(data: { name: string; address?: string; building?: string; floor?: string; room?: string; departmentId?: string }) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  const plan = dbUser?.plan || 'FREE';
  const limits = getPlanLimits(plan);
  const currentCount = await prisma.location.count();
  
  if (limits.locationLimit !== -1 && currentCount >= limits.locationLimit) {
    if (plan === 'FREE') {
      throw new Error(`You have reached your location limit. Upgrade to PRO for unlimited locations.`);
    }
    throw new Error(`You have reached your location limit.`);
  }

  const location = await prisma.location.create({ data });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'Location',
      entityId: location.id,
      userId: user.id,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/locations');
  return location;
}

export async function updateLocation(id: string, data: { name?: string; address?: string; building?: string; floor?: string; room?: string; departmentId?: string }) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const location = await prisma.location.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'Location',
      entityId: id,
      userId: user.id,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/locations');
  return location;
}

export async function deleteLocation(id: string) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const assetCount = await prisma.asset.count({ where: { locationId: id } });
  if (assetCount > 0) {
    throw new Error(`Cannot delete location - ${assetCount} asset(s) are linked to this location. Please reassign or delete the assets first.`);
  }

  await prisma.location.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'Location',
      entityId: id,
      userId: user.id,
    },
  });

  revalidatePath('/dashboard/locations');
}

export async function getVendors() {
  const user = getSessionUser();
  if (!user) throw new Error('Unauthorized');

  return prisma.vendor.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { assets: true } } },
  });
}

export async function createVendor(data: { name: string; contactName?: string; email?: string; phone?: string; address?: string; website?: string; notes?: string }) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const vendor = await prisma.vendor.create({ data });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'Vendor',
      entityId: vendor.id,
      userId: user.id,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/vendors');
  return vendor;
}

export async function updateVendor(id: string, data: { name?: string; contactName?: string; email?: string; phone?: string; address?: string; website?: string; notes?: string }) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const vendor = await prisma.vendor.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'Vendor',
      entityId: id,
      userId: user.id,
      changes: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/vendors');
  return vendor;
}

export async function deleteVendor(id: string) {
  const user = getSessionUser();
  if (!user || !['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role)) {
    throw new Error('Unauthorized');
  }

  const assetCount = await prisma.asset.count({ where: { vendorId: id } });
  if (assetCount > 0) {
    throw new Error(`Cannot delete vendor - ${assetCount} asset(s) are linked to this vendor. Please reassign or delete the assets first.`);
  }

  await prisma.vendor.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'Vendor',
      entityId: id,
      userId: user.id,
    },
  });

  revalidatePath('/dashboard/vendors');
}

export async function getUsers() {
  const user = getSessionUser();
  if (!user) throw new Error('Unauthorized');

  return prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { assets: true } },
    },
  });
}

export async function createUser(data: { name: string; email: string; password?: string; role: string; departmentId?: string; isActive?: boolean }) {
  const user = getSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
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
    },
  });

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'User',
      entityId: newUser.id,
      userId: user.id,
      changes: { ...data, password: undefined } as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/users');
  return newUser;
}

export async function updateUser(id: string, data: { name?: string; email?: string; password?: string; role?: string; departmentId?: string; isActive?: boolean }) {
  const user = getSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }

  const updateData: any = { ...data };
  if (data.password) {
    const { default: bcrypt } = await import('bcryptjs');
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  const updated = await prisma.user.update({ where: { id }, data: updateData });

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      userId: user.id,
      changes: { ...data, password: undefined } as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/users');
  return updated;
}

export async function deleteUser(id: string) {
  const user = getSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }

  await prisma.user.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      userId: user.id,
    },
  });

  revalidatePath('/dashboard/users');
}

export async function toggleUserActive(id: string) {
  const user = getSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }

  const dbUser = await prisma.user.findUnique({ where: { id } });
  if (!dbUser) throw new Error('User not found');

  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: !dbUser.isActive },
  });

  await prisma.auditLog.create({
    data: {
      action: updated.isActive ? 'ACTIVATE' : 'DEACTIVATE',
      entityType: 'User',
      entityId: id,
      userId: user.id,
      changes: { isActive: updated.isActive } as Prisma.InputJsonValue,
    },
  });

  revalidatePath('/dashboard/users');
  return updated;
}

export async function resetUserPassword(id: string, newPassword: string) {
  const user = getSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error('Unauthorized');
  }

  const { default: bcrypt } = await import('bcryptjs');
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  await prisma.auditLog.create({
    data: {
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: id,
      userId: user.id,
    },
  });

  revalidatePath('/dashboard/users');
}

export async function getAuditLogs(params?: { page?: number; limit?: number; action?: string; entityType?: string }) {
  const user = getSessionUser();
  if (!user) throw new Error('Unauthorized');

  const { page = 1, limit = 50, action, entityType } = params || {};

  const where: any = {};
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
