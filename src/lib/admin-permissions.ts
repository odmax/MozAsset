import type { InternalAdmin, InternalRole } from '@prisma/client';

// ─── Scoped Permissions ─────────────────────────────────────────────
export type Permission =
  | 'users:read'
  | 'users:edit'
  | 'users:activate'
  | 'users:delete'
  | 'users:permanent_delete'
  | 'users:verify_email'
  | 'users:reset_password'
  | 'plans:change'
  | 'plans:send_payment_link'
  | 'plans:manual_confirm'
  | 'billing:read'
  | 'billing:assist'
  | 'subscriptions:read'
  | 'subscriptions:modify'
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
  | 'agents:read'
  | 'agents:create'
  | 'agents:update'
  | 'agents:delete'
  | 'agents:manage_status'
  | 'agents:suspend'
  | 'agents:manage_roles'
  | 'admins:manage'
  | 'organizations:read'
  | 'organizations:edit'
  | 'organizations:delete'
  | 'analytics:read'
  | 'security:read'
  | 'backups:manage'
  | 'audit:read'
  | 'settings:read'
  | 'settings:modify'
  | 'owner:controls';

// ─── Role → Permission Mapping ──────────────────────────────────────

// OWNER — full access, no restrictions
const OWNER_PERMISSIONS: Permission[] = [
  'users:read', 'users:edit', 'users:activate', 'users:delete', 'users:permanent_delete',
  'users:verify_email', 'users:reset_password',
  'plans:change', 'plans:send_payment_link', 'plans:manual_confirm',
  'billing:read', 'billing:assist',
  'subscriptions:read', 'subscriptions:modify',
  'tickets:read', 'tickets:reply', 'tickets:assign', 'tickets:transfer',
  'tickets:escalate', 'tickets:resolve', 'tickets:delete', 'tickets:change_priority',
  'tickets:view_internal_notes', 'tickets:add_internal_notes',
  'agents:read', 'agents:create', 'agents:update', 'agents:delete',
  'agents:manage_status', 'agents:suspend', 'agents:manage_roles',
  'admins:manage',
  'organizations:read', 'organizations:edit', 'organizations:delete',
  'analytics:read',
  'security:read',
  'backups:manage',
  'audit:read',
  'settings:read', 'settings:modify',
  'owner:controls',
];

// PLATFORM_ADMIN — operational full access, cannot touch OWNER or destroy platform
const PLATFORM_ADMIN_PERMISSIONS: Permission[] = [
  'users:read', 'users:edit', 'users:activate', 'users:delete',
  'users:verify_email', 'users:reset_password',
  'plans:change', 'plans:send_payment_link', 'plans:manual_confirm',
  'billing:read', 'billing:assist',
  'subscriptions:read', 'subscriptions:modify',
  'tickets:read', 'tickets:reply', 'tickets:assign', 'tickets:transfer',
  'tickets:escalate', 'tickets:resolve', 'tickets:delete', 'tickets:change_priority',
  'tickets:view_internal_notes', 'tickets:add_internal_notes',
  'agents:read', 'agents:create', 'agents:update', 'agents:delete',
  'agents:manage_status', 'agents:suspend', 'agents:manage_roles',
  'admins:manage',
  'organizations:read', 'organizations:edit',
  'analytics:read',
  'security:read',
  'audit:read',
  'settings:read', 'settings:modify',
];

// SUPPORT_MANAGER — manage support team + tickets, edit customers, billing assist
const SUPPORT_MANAGER_PERMISSIONS: Permission[] = [
  'users:read', 'users:edit', 'users:activate', 'users:verify_email', 'users:reset_password',
  'plans:change', 'plans:send_payment_link',
  'billing:read', 'billing:assist',
  'subscriptions:read',
  'tickets:read', 'tickets:reply', 'tickets:assign', 'tickets:transfer',
  'tickets:escalate', 'tickets:resolve', 'tickets:change_priority',
  'tickets:view_internal_notes', 'tickets:add_internal_notes',
  'agents:read', 'agents:create', 'agents:update', 'agents:manage_status', 'agents:suspend',
  'organizations:read',
  'analytics:read',
  'audit:read',
];

// ACCOUNT_MANAGER — customer/account management, billing visibility, no delete/security
const ACCOUNT_MANAGER_PERMISSIONS: Permission[] = [
  'users:read', 'users:edit', 'users:activate', 'users:verify_email', 'users:reset_password',
  'plans:change', 'plans:send_payment_link', 'plans:manual_confirm',
  'billing:read', 'billing:assist',
  'subscriptions:read', 'subscriptions:modify',
  'tickets:read', 'tickets:reply',
  'organizations:read', 'organizations:edit',
  'analytics:read',
  'audit:read',
];

// SUPPORT_AGENT — tickets/chat only, limited customer profile, no plan/activation changes
const SUPPORT_AGENT_PERMISSIONS: Permission[] = [
  'users:read',
  'tickets:read', 'tickets:reply', 'tickets:assign',
  'tickets:transfer', 'tickets:escalate', 'tickets:resolve',
  'tickets:view_internal_notes', 'tickets:add_internal_notes',
  'agents:read', 'agents:manage_status',
  'organizations:read',
];

// VIEWER — read-only dashboards and logs
const VIEWER_PERMISSIONS: Permission[] = [
  'users:read',
  'tickets:read',
  'billing:read',
  'subscriptions:read',
  'organizations:read',
  'analytics:read',
  'audit:read',
  'security:read',
  'settings:read',
];

// Map old deprecated roles to their new equivalents for permission lookup
const ROLE_PERMISSIONS: Record<InternalRole, Permission[]> = {
  OWNER: OWNER_PERMISSIONS,
  PLATFORM_ADMIN: PLATFORM_ADMIN_PERMISSIONS,
  SUPER_ADMIN: PLATFORM_ADMIN_PERMISSIONS,  // deprecated — mapped
  SUPPORT_MANAGER: SUPPORT_MANAGER_PERMISSIONS,
  ACCOUNT_MANAGER: ACCOUNT_MANAGER_PERMISSIONS,
  SUPPORT_AGENT: SUPPORT_AGENT_PERMISSIONS,
  FINANCE_ADMIN: ACCOUNT_MANAGER_PERMISSIONS,  // deprecated — mapped
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

/**
 * Hierarchical admin management rules:
 *   OWNER            → can manage everyone
 *   PLATFORM_ADMIN   → everyone except OWNER
 *   SUPPORT_MANAGER  → SUPPORT_AGENT, ACCOUNT_MANAGER, VIEWER
 *   ACCOUNT_MANAGER  → themselves only
 *   SUPPORT_AGENT    → themselves only
 *   VIEWER           → themselves only
 */
export function canManageAgent(
  currentAdmin: { role: InternalRole; id: string },
  targetAdmin: { role: InternalRole; id: string }
): boolean {
  if (currentAdmin.role === 'OWNER') return true;
  if (currentAdmin.role === 'PLATFORM_ADMIN' && targetAdmin.role !== 'OWNER') return true;
  if (currentAdmin.role === 'SUPER_ADMIN' && targetAdmin.role !== 'OWNER') return true;
  if (currentAdmin.role === 'SUPPORT_MANAGER' &&
    ['SUPPORT_AGENT', 'ACCOUNT_MANAGER', 'FINANCE_ADMIN', 'VIEWER'].includes(targetAdmin.role)) return true;
  return currentAdmin.id === targetAdmin.id;
}

// ─── Role hierarchy for UI ordering / display ───────────────────────

export const ROLE_HIERARCHY: Record<InternalRole, number> = {
  OWNER: 0,
  PLATFORM_ADMIN: 1,
  SUPER_ADMIN: 1,
  SUPPORT_MANAGER: 2,
  ACCOUNT_MANAGER: 3,
  SUPPORT_AGENT: 4,
  FINANCE_ADMIN: 3,
  VIEWER: 5,
};

export const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  PLATFORM_ADMIN: 'Platform Admin',
  SUPER_ADMIN: 'Platform Admin',
  SUPPORT_MANAGER: 'Support Manager',
  ACCOUNT_MANAGER: 'Account Manager',
  SUPPORT_AGENT: 'Support Agent',
  FINANCE_ADMIN: 'Account Manager',
  VIEWER: 'Viewer',
};

export const ROLE_BADGE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  PLATFORM_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  SUPER_ADMIN: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  SUPPORT_MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  ACCOUNT_MANAGER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  SUPPORT_AGENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  FINANCE_ADMIN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  VIEWER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

// Roles available for creation in the admin form
export const CREATABLE_ROLES: InternalRole[] = [
  'PLATFORM_ADMIN',
  'SUPPORT_MANAGER',
  'ACCOUNT_MANAGER',
  'SUPPORT_AGENT',
  'VIEWER',
];

// ─── Security rules helpers ─────────────────────────────────────────

export function canModifyOwner(currentAdmin: { role: InternalRole }): boolean {
  return currentAdmin.role === 'OWNER';
}

export function canPermanentDelete(currentAdmin: { role: InternalRole }): boolean {
  return currentAdmin.role === 'OWNER';
}

export function canManageBackups(currentAdmin: { role: InternalRole }): boolean {
  return currentAdmin.role === 'OWNER' || currentAdmin.role === 'PLATFORM_ADMIN' || currentAdmin.role === 'SUPER_ADMIN';
}

export function canAccessSecurity(currentAdmin: { role: InternalRole }): boolean {
  return currentAdmin.role === 'OWNER' || currentAdmin.role === 'PLATFORM_ADMIN' || currentAdmin.role === 'SUPER_ADMIN';
}
