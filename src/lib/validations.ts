import { z } from 'zod';
import { Role, AssetStatus, AssetCondition } from '@prisma/client';

export const roles = ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'] as const;
export const assetStatuses = ['AVAILABLE', 'ASSIGNED', 'IN_REPAIR', 'RETIRED', 'DISPOSED', 'LOST'] as const;
export const assetConditions = ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'NEEDS_REPAIR'] as const;

export const userRoles = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'],
  ASSET_MANAGER: ['ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'],
  DEPARTMENT_MANAGER: ['DEPARTMENT_MANAGER', 'EMPLOYEE'],
  EMPLOYEE: ['EMPLOYEE'],
} as const;

export type UserRole = keyof typeof userRoles;

export function canAccessRole(userRole: string, targetRole: string): boolean {
  const allowedRoles = userRoles[userRole as UserRole] as readonly string[];
  return allowedRoles?.includes(targetRole) ?? false;
}

export function canManageAssets(role: string): boolean {
  return role === 'SUPER_ADMIN' || role === 'ASSET_MANAGER' || role === 'DEPARTMENT_MANAGER';
}

export function canManageUsers(role: string): boolean {
  return role === 'SUPER_ADMIN';
}

export const assetFormSchema = z.object({
  assetTag: z.string().min(1, 'Asset tag is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  serialNumber: z.string().optional(),
  model: z.string().optional(),
  brand: z.string().optional(),
  status: z.nativeEnum(AssetStatus),
  condition: z.nativeEnum(AssetCondition),
  categoryId: z.string().optional(),
  locationId: z.string().optional(),
  departmentId: z.string().optional(),
  assignedToId: z.string().optional(),
  vendorId: z.string().optional(),
  purchaseDate: z.date().optional(),
  purchaseCost: z.number().optional(),
  warrantyExpiry: z.date().optional(),
  notes: z.string().optional(),
});

export const userFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: z.nativeEnum(Role),
  departmentId: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const categoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
});

export const departmentFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
  managerId: z.string().optional(),
});

export const locationFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  room: z.string().optional(),
  departmentId: z.string().optional(),
});

export const vendorFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  contactName: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  notes: z.string().optional(),
});

export const transferFormSchema = z.object({
  toDepartmentId: z.string().min(1, 'Department is required'),
  toLocationId: z.string().optional(),
  toUserId: z.string().optional(),
  notes: z.string().optional(),
});

export const maintenanceFormSchema = z.object({
  type: z.string().min(1, 'Type is required'),
  description: z.string().min(1, 'Description is required'),
  cost: z.number().optional(),
  vendorId: z.string().optional(),
  nextDueDate: z.date().optional(),
  notes: z.string().optional(),
});

export type AssetFormData = z.infer<typeof assetFormSchema>;
export type UserFormData = z.infer<typeof userFormSchema>;
export type CategoryFormData = z.infer<typeof categoryFormSchema>;
export type DepartmentFormData = z.infer<typeof departmentFormSchema>;
export type LocationFormData = z.infer<typeof locationFormSchema>;
export type VendorFormData = z.infer<typeof vendorFormSchema>;
export type TransferFormData = z.infer<typeof transferFormSchema>;
export type MaintenanceFormData = z.infer<typeof maintenanceFormSchema>;
