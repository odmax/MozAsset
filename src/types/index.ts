import { type AssetStatus, type AssetCondition, type Role } from '@prisma/client';
import { type LucideIcon } from 'lucide-react';

export type { LucideIcon };
export type { Role };

export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles?: Role[];
}

export interface DashboardStats {
  totalAssets: number;
  availableAssets: number;
  assignedAssets: number;
  inRepairAssets: number;
  retiredAssets: number;
  totalValue: number;
  expiringWarranties: number;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}

export interface AssetFilters {
  search?: string;
  status?: AssetStatus | '';
  condition?: AssetCondition | '';
  categoryId?: string;
  departmentId?: string;
  locationId?: string;
  vendorId?: string;
  assignedToId?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userName: string;
  userEmail: string;
  changes?: Record<string, unknown>;
  createdAt: Date;
}
