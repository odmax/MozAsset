import type { InternalAdmin } from '@prisma/client';
import type { InternalRole } from '@prisma/client';

export type Permission =
  | 'agents:read'
  | 'agents:create'
  | 'agents:update'
  | 'agents:delete'
  | 'agents:manage_status'
  | 'agents:suspend'
  | 'tickets:read'
  | 'tickets:reply'
  | 'tickets:assign'
  | 'tickets:transfer'
  | 'tickets:escalate'
  | 'tickets:resolve'
  | 'tickets:delete'
  | 'tickets:change_priority'
  | 'tickets:view_internal_notes'
  | 'tickets:add_internal_notes'
  | 'billing:read'
  | 'billing:modify'
  | 'security:read'
  | 'security:modify'
  | 'users:read'
  | 'users:modify'
  | 'users:delete'
  | 'organizations:read'
  | 'organizations:modify'
  | 'analytics:read'
  | 'settings:read'
  | 'settings:modify'
  | 'subscriptions:read'
  | 'subscriptions:modify'
  | 'owner:controls'
  | 'audit:read'
  | 'backups:read'
  | 'backups:create';

const OWNER_PERMISSIONS: Permission[] = [
  'agents:read', 'agents:create', 'agents:update', 'agents:delete',
  'agents:manage_status', 'agents:suspend',
  'tickets:read', 'tickets:reply', 'tickets:assign', 'tickets:transfer',
  'tickets:escalate', 'tickets:resolve', 'tickets:delete', 'tickets:change_priority',
  'tickets:view_internal_notes', 'tickets:add_internal_notes',
  'billing:read', 'billing:modify',
  'security:read', 'security:modify',
  'users:read', 'users:modify', 'users:delete',
  'organizations:read', 'organizations:modify',
  'analytics:read',
  'settings:read', 'settings:modify',
  'subscriptions:read', 'subscriptions:modify',
  'owner:controls',
  'audit:read',
  'backups:read',
  'backups:create',
];

const SUPER_ADMIN_PERMISSIONS: Permission[] = [
  'agents:read', 'agents:create', 'agents:update', 'agents:delete',
  'agents:manage_status', 'agents:suspend',
  'tickets:read', 'tickets:reply', 'tickets:assign', 'tickets:transfer',
  'tickets:escalate', 'tickets:resolve', 'tickets:change_priority',
  'tickets:view_internal_notes', 'tickets:add_internal_notes',
  'billing:read', 'billing:modify',
  'security:read',
  'users:read', 'users:modify', 'users:delete',
  'organizations:read', 'organizations:modify',
  'analytics:read',
  'settings:read', 'settings:modify',
  'subscriptions:read', 'subscriptions:modify',
  'audit:read',
];

const SUPPORT_MANAGER_PERMISSIONS: Permission[] = [
  'agents:read', 'agents:create', 'agents:update', 'agents:delete',
  'agents:manage_status', 'agents:suspend',
  'tickets:read', 'tickets:reply', 'tickets:assign', 'tickets:transfer',
  'tickets:escalate', 'tickets:resolve', 'tickets:change_priority',
  'tickets:view_internal_notes', 'tickets:add_internal_notes',
  'users:read',
  'organizations:read',
  'analytics:read',
  'audit:read',
  'subscriptions:read',
];

const SUPPORT_AGENT_PERMISSIONS: Permission[] = [
  'agents:read', 'agents:manage_status',
  'tickets:read', 'tickets:reply', 'tickets:assign',
  'tickets:transfer', 'tickets:escalate', 'tickets:resolve',
  'tickets:view_internal_notes', 'tickets:add_internal_notes',
  'users:read',
  'organizations:read',
];

const FINANCE_ADMIN_PERMISSIONS: Permission[] = [
  'tickets:read',
  'billing:read', 'billing:modify',
  'subscriptions:read', 'subscriptions:modify',
  'users:read',
  'organizations:read',
  'analytics:read',
  'audit:read',
];

const VIEWER_PERMISSIONS: Permission[] = [
  'agents:read',
  'tickets:read',
  'billing:read',
  'security:read',
  'users:read',
  'organizations:read',
  'analytics:read',
  'audit:read',
];

const ROLE_PERMISSIONS: Record<InternalRole, Permission[]> = {
  OWNER: OWNER_PERMISSIONS,
  SUPER_ADMIN: SUPER_ADMIN_PERMISSIONS,
  SUPPORT_MANAGER: SUPPORT_MANAGER_PERMISSIONS,
  SUPPORT_AGENT: SUPPORT_AGENT_PERMISSIONS,
  FINANCE_ADMIN: FINANCE_ADMIN_PERMISSIONS,
  VIEWER: VIEWER_PERMISSIONS,
};

export function getPermissionsForRole(role: InternalRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

export function hasPermission(
  admin: { role: InternalRole; permissions?: any },
  permission: Permission
): boolean {
  if (admin.role === 'OWNER') return true;
  const rolePerms = ROLE_PERMISSIONS[admin.role] || [];
  if (rolePerms.includes(permission)) return true;
  if (admin.permissions && typeof admin.permissions === 'object') {
    const customPerms: Permission[] = Array.isArray(admin.permissions)
      ? admin.permissions
      : (admin.permissions as any).customPermissions || [];
    return customPerms.includes(permission);
  }
  return false;
}

export function requirePermission(
  admin: { role: InternalRole; permissions?: any },
  permission: Permission
): void {
  if (!hasPermission(admin, permission)) {
    throw new Error(`Forbidden: missing permission "${permission}"`);
  }
}

export function canManageAgent(
  currentAdmin: { role: InternalRole; id: string },
  targetAdmin: { role: InternalRole; id: string }
): boolean {
  // OWNER can manage everyone
  if (currentAdmin.role === 'OWNER') return true;
  // SUPER_ADMIN can manage everyone except OWNER
  if (currentAdmin.role === 'SUPER_ADMIN' && targetAdmin.role !== 'OWNER') return true;
  // SUPPORT_MANAGER can manage SUPPORT_AGENT, VIEWER, and FINANCE_ADMIN (but not OWNER/SUPER_ADMIN)
  if (currentAdmin.role === 'SUPPORT_MANAGER' &&
    (targetAdmin.role === 'SUPPORT_AGENT' || targetAdmin.role === 'VIEWER' || targetAdmin.role === 'FINANCE_ADMIN')) return true;
  // SUPPORT_AGENT can only manage themselves (status toggle)
  if (currentAdmin.role === 'SUPPORT_AGENT') return currentAdmin.id === targetAdmin.id;
  // Everyone can manage themselves
  return currentAdmin.id === targetAdmin.id;
}
