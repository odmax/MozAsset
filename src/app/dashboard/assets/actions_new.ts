'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { assetFormSchema, canManageAssets } from '@/lib/validations';
import { getAssetLimit, canAddAssets } from '@/lib/billing';
import type { AssetStatus, AssetCondition, Prisma, AuditAction, Plan } from '@prisma/client';
import type { AssetFormData } from '@/lib/validations';
import { getCurrentUserContext } from '@/lib/user-context';

async function logAudit(
  action: AuditAction,
  entityType: string,
  entityId: string,
  userId: string,
  changes?: Prisma.InputJsonValue,
  metadata?: Prisma.InputJsonValue
) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      userId,
      changes,
      metadata,
    },
  });
}

export async function getAssets(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  condition?: string;
  categoryId?: string;
  departmentId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const context = await getCurrentUserContext();
  if (!context?.userId) throw new Error('Unauthorized');

  const {
    page = 1,
    limit = 10,
    search = '',
    status = '',
    condition = '',
    categoryId = '',
    departmentId = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = params;

  const isPlatformAdmin = context.isPlatformAdmin || context.isInternalAdmin;

  const where: Prisma.AssetWhereInput = {
    AND: [
      !isPlatformAdmin ? { organizationId: context.organizationId } : {},
      search ? {
        OR: [
          { assetTag: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
          { serialNumber: { contains: search, mode: 'insensitive' } },
        ],
      } : {},
      status ? { status: status as AssetStatus } : {},
      condition ? { condition: condition as AssetCondition } : {},
      categoryId ? { categoryId } : {},
      departmentId ? { departmentId } : {},
    ],
  };

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        category: true,
        department: true,
        location: true,
        assignedTo: { select: { id: true, name: true, email: true } },
        vendor: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    prisma.asset.count({ where }),
  ]);

  return {
    data: assets,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getAsset(id: string) {
  const context = await getCurrentUserContext();
  if (!context?.userId) throw new Error('Unauthorized');

  const isPlatformAdmin = context.isPlatformAdmin || context.isInternalAdmin;

  return prisma.asset.findFirst({
    where: {
      id,
      ...(!isPlatformAdmin ? { organizationId: context.organizationId } : {}),
    },
    include: {
      category: true,
      department: true,
      location: true,
      assignedTo: true,
      vendor: true,
      assignments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { assignedAt: 'desc' },
      },
      transfers: {
        orderBy: { transferredAt: 'desc' },
      },
      maintenances: {
        include: { performedByUser: { select: { id: true, name: true } } },
        orderBy: { performedAt: 'desc' },
      },
      checkIns: {
        orderBy: { checkedAt: 'desc' },
      },
      auditLogs: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  });
}

export async function createAsset(data: AssetFormData) {
  const context = await getCurrentUserContext();
  if (!context?.userId || !canManageAssets(context.role)) {
    throw new Error('Unauthorized');
  }

  const whereClause = context.isPlatformAdmin ? undefined : { organizationId: context.organizationId };
  const currentCount = await prisma.asset.count({ where: whereClause });
  const limitCheck = canAddAssets(context.plan, currentCount);

  if (!limitCheck.allowed) {
    throw new Error(limitCheck.message || 'Asset limit reached');
  }

  const validated = assetFormSchema.parse(data);

  const asset = await prisma.asset.create({
    data: {
      assetTag: validated.assetTag,
      name: validated.name,
      serialNumber: validated.serialNumber,
      model: validated.model,
      brand: validated.brand,
      status: validated.status,
      condition: validated.condition,
      categoryId: validated.categoryId || null,
      locationId: validated.locationId || null,
      departmentId: validated.departmentId || null,
      vendorId: validated.vendorId || null,
      purchaseDate: validated.purchaseDate,
      purchaseCost: validated.purchaseCost ? validated.purchaseCost : null,
      warrantyExpiry: validated.warrantyExpiry,
      notes: validated.notes,
      organizationId: context.organizationId,
    },
  });

  await logAudit('CREATE' as AuditAction, 'Asset', asset.id, context.userId, data as Prisma.InputJsonValue);

  revalidatePath('/dashboard/assets');
  return asset;
}

export async function updateAsset(id: string, data: Partial<AssetFormData>) {
  const context = await getCurrentUserContext();
  if (!context?.userId || !canManageAssets(context.role)) {
    throw new Error('Unauthorized');
  }

  const asset = await prisma.asset.findFirst({ where: { id, organizationId: context.organizationId } });
  if (!asset) throw new Error('Asset not found');

  const updated = await prisma.asset.update({
    where: { id },
    data: {
      name: data.name,
      serialNumber: data.serialNumber,
      model: data.model,
      brand: data.brand,
      status: data.status,
      condition: data.condition,
      categoryId: data.categoryId,
      locationId: data.locationId,
      departmentId: data.departmentId,
      vendorId: data.vendorId,
      purchaseDate: data.purchaseDate,
      purchaseCost: data.purchaseCost ?? undefined,
      warrantyExpiry: data.warrantyExpiry,
      notes: data.notes,
    },
  });

  await logAudit('UPDATE' as AuditAction, 'Asset', id, context.userId, data as Prisma.InputJsonValue);

  revalidatePath('/dashboard/assets');
  revalidatePath(`/dashboard/assets/${id}`);
  return updated;
}

export async function deleteAsset(id: string) {
  const context = await getCurrentUserContext();
  if (!context?.userId || !canManageAssets(context.role)) {
    throw new Error('Unauthorized');
  }

  await prisma.asset.delete({ where: { id, organizationId: context.organizationId } });

  await logAudit('DELETE' as AuditAction, 'Asset', id, context.userId);

  revalidatePath('/dashboard/assets');
}

export async function assignAsset(assetId: string, userId: string, notes?: string) {
  const context = await getCurrentUserContext();
  if (!context?.userId || !canManageAssets(context.role)) {
    throw new Error('Unauthorized');
  }

  const asset = await prisma.asset.update({
    where: { id: assetId, organizationId: context.organizationId },
    data: {
      assignedToId: userId,
      status: 'ASSIGNED' as AssetStatus,
    },
  });

  await prisma.assetAssignment.create({
    data: {
      assetId,
      userId,
      assignedBy: context.userId,
      notes,
    },
  });

  await logAudit('ASSIGN' as AuditAction, 'Asset', assetId, context.userId, { assignedToId: userId });

  revalidatePath('/dashboard/assets');
  revalidatePath(`/dashboard/assets/${assetId}`);
  return asset;
}

export async function unassignAsset(assetId: string, notes?: string) {
  const context = await getCurrentUserContext();
  if (!context?.userId || !canManageAssets(context.role)) {
    throw new Error('Unauthorized');
  }

  const asset = await prisma.asset.update({
    where: { id: assetId, organizationId: context.organizationId },
    data: {
      assignedToId: null,
      status: 'AVAILABLE' as AssetStatus,
    },
  });

  await prisma.assetAssignment.updateMany({
    where: { assetId, returnedAt: null },
    data: { returnedAt: new Date(), notes },
  });

  await logAudit('TRANSFER' as AuditAction, 'Asset', assetId, context.userId, { unassigned: true });

  revalidatePath('/dashboard/assets');
  revalidatePath(`/dashboard/assets/${assetId}`);
  return asset;
}

export async function transferAsset(
  assetId: string,
  data: {
    toDepartmentId?: string;
    toLocationId?: string;
    toUserId?: string;
    notes?: string;
  }
) {
  const context = await getCurrentUserContext();
  if (!context?.userId || !canManageAssets(context.role)) {
    throw new Error('Unauthorized');
  }

  const asset = await prisma.asset.findFirst({ where: { id: assetId, organizationId: context.organizationId } });
  if (!asset) throw new Error('Asset not found');

  const updated = await prisma.asset.update({
    where: { id: assetId },
    data: {
      departmentId: data.toDepartmentId || asset.departmentId,
      locationId: data.toLocationId || asset.locationId,
      assignedToId: data.toUserId || asset.assignedToId,
      status: data.toUserId ? 'ASSIGNED' as AssetStatus : asset.status,
    },
  });

  await prisma.assetTransfer.create({
    data: {
      assetId,
      fromDepartmentId: asset.departmentId,
      toDepartmentId: data.toDepartmentId || asset.departmentId!,
      fromLocationId: asset.locationId,
      toLocationId: data.toLocationId || asset.locationId,
      fromUserId: asset.assignedToId,
      toUserId: data.toUserId,
      transferredBy: context.userId,
      notes: data.notes,
    },
  });

  await logAudit('TRANSFER' as AuditAction, 'Asset', assetId, context.userId, data as Prisma.InputJsonValue);

  revalidatePath('/dashboard/assets');
  revalidatePath(`/dashboard/assets/${assetId}`);
  return updated;
}

export async function checkInAsset(assetId: string, condition?: AssetCondition, notes?: string) {
  const context = await getCurrentUserContext();
  if (!context?.userId) throw new Error('Unauthorized');

  await prisma.checkInOut.create({
    data: {
      assetId,
      userId: context.userId,
      type: 'CHECK_IN',
      condition,
      notes,
    },
  });

  await prisma.asset.update({
    where: { id: assetId, organizationId: context.organizationId },
    data: {
      assignedToId: null,
      status: 'AVAILABLE' as AssetStatus,
      condition: condition || undefined,
    },
  });

  await logAudit('CHECK_IN' as AuditAction, 'Asset', assetId, context.userId);

  revalidatePath('/dashboard/assets');
  revalidatePath(`/dashboard/assets/${assetId}`);
}

export async function checkOutAsset(assetId: string, userId: string, condition?: AssetCondition, notes?: string) {
  const context = await getCurrentUserContext();
  if (!context?.userId) throw new Error('Unauthorized');

  await prisma.checkInOut.create({
    data: {
      assetId,
      userId,
      type: 'CHECK_OUT',
      condition,
      notes,
    },
  });

  await prisma.asset.update({
    where: { id: assetId, organizationId: context.organizationId },
    data: {
      assignedToId: userId,
      status: 'ASSIGNED' as AssetStatus,
      condition: condition || undefined,
    },
  });

  await logAudit('CHECK_OUT' as AuditAction, 'Asset', assetId, context.userId);

  revalidatePath('/dashboard/assets');
  revalidatePath(`/dashboard/assets/${assetId}`);
}

export async function retireAsset(assetId: string, notes?: string) {
  const context = await getCurrentUserContext();
  if (!context?.userId || !canManageAssets(context.role)) {
    throw new Error('Unauthorized');
  }

  const existing = await prisma.asset.findFirst({ where: { id: assetId, organizationId: context.organizationId } });
  if (!existing) throw new Error('Asset not found');

  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      status: 'RETIRED' as AssetStatus,
      notes: notes ? `${existing.notes || ''}\n${notes}`.trim() : existing.notes,
    },
  });

  await logAudit('RETRE' as AuditAction, 'Asset', assetId, context.userId);

  revalidatePath('/dashboard/assets');
  revalidatePath(`/dashboard/assets/${assetId}`);
  return asset;
}

export async function disposeAsset(assetId: string, notes?: string) {
  const context = await getCurrentUserContext();
  if (!context?.userId || !canManageAssets(context.role)) {
    throw new Error('Unauthorized');
  }

  const existing = await prisma.asset.findFirst({ where: { id: assetId, organizationId: context.organizationId } });
  if (!existing) throw new Error('Asset not found');

  const asset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      status: 'DISPOSED' as AssetStatus,
      notes: notes ? `${existing.notes || ''}\n${notes}`.trim() : existing.notes,
    },
  });

  await logAudit('DISPOSE' as AuditAction, 'Asset', assetId, context.userId);

  revalidatePath('/dashboard/assets');
  revalidatePath(`/dashboard/assets/${assetId}`);
  return asset;
}

export async function addMaintenance(
  assetId: string,
  data: {
    type: string;
    description: string;
    cost?: number;
    vendorId?: string;
    nextDueDate?: Date;
    notes?: string;
  }
) {
  const context = await getCurrentUserContext();
  if (!context?.userId || !canManageAssets(context.role)) {
    throw new Error('Unauthorized');
  }

  const maintenance = await prisma.maintenance.create({
    data: {
      assetId,
      type: data.type,
      description: data.description,
      performedBy: context.userId,
      cost: data.cost,
      vendorId: data.vendorId,
      nextDueDate: data.nextDueDate,
      notes: data.notes,
    },
  });

  if (data.type === 'REPAIR') {
    await prisma.asset.update({
      where: { id: assetId, organizationId: context.organizationId },
      data: { status: 'IN_REPAIR' as AssetStatus },
    });
  }

  await logAudit('MAINTENANCE' as AuditAction, 'Asset', assetId, context.userId, data as Prisma.InputJsonValue);

  revalidatePath('/dashboard/assets');
  revalidatePath(`/dashboard/assets/${assetId}`);
  return maintenance;
}
