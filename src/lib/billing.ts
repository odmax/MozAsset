import type { Plan, SubscriptionStatus, BillingProvider } from '@prisma/client';
export { createCheckoutPayload, getPayfastBaseUrl } from './payfast';

export interface PlanLimits {
  assetLimit: number;
  departmentLimit: number;
  locationLimit: number;
  userLimit: number;
  vendorLimit: number;
}

export interface PlanDetails {
  name: string;
  price: number;
  period: string;
  assets: number;
  departments: number;
  locations: number;
  users: number;
  vendors: number;
  storageMB: number;
  features: {
    exports: boolean;
    advancedReports: boolean;
    stockVerification: boolean;
    apiAccess: boolean;
    multiBranch: boolean;
    prioritySupport: boolean;
    sla: boolean;
    unlimitedAssets: boolean;
    unlimitedDepartments: boolean;
    unlimitedLocations: boolean;
    advancedAnalytics: boolean;
    customIntegrations: boolean;
    auditCompliance: boolean;
    advancedPermissions: boolean;
    maintenanceManagement: boolean;
    assetLifecycleTracking: boolean;
    exportSuite: boolean;
    dedicatedAccountManager: boolean;
    customBranding: boolean;
    approvalWorkflows: boolean;
    depreciationTracking: boolean;
    procurement: boolean;
  };
}

export const PLAN_CONFIG: Record<Plan, PlanDetails> = {
  FREE: {
    name: 'Free',
    price: 0,
    period: 'forever',
    assets: 50,
    departments: 1,
    locations: 1,
    users: -1,
    vendors: 50,
    storageMB: 100,
    features: {
      exports: false,
      advancedReports: false,
      stockVerification: false,
      apiAccess: false,
      multiBranch: false,
      prioritySupport: false,
      sla: false,
      unlimitedAssets: false,
      unlimitedDepartments: false,
      unlimitedLocations: false,
      advancedAnalytics: false,
      customIntegrations: false,
      auditCompliance: false,
      advancedPermissions: false,
      maintenanceManagement: true,
      assetLifecycleTracking: false,
      exportSuite: false,
      dedicatedAccountManager: false,
      customBranding: false,
      approvalWorkflows: false,
      depreciationTracking: false,
      procurement: false,
    },
  },
  PRO: {
    name: 'Pro',
    price: 149,
    period: 'month',
    assets: 500,
    departments: 5,
    locations: 5,
    users: -1,
    vendors: -1,
    storageMB: 500,
    features: {
      exports: true,
      advancedReports: true,
      stockVerification: true,
      apiAccess: false,
      multiBranch: false,
      prioritySupport: true,
      sla: false,
      unlimitedAssets: false,
      unlimitedDepartments: false,
      unlimitedLocations: false,
      advancedAnalytics: false,
      customIntegrations: false,
      auditCompliance: false,
      advancedPermissions: false,
      maintenanceManagement: true,
      assetLifecycleTracking: false,
      exportSuite: false,
      dedicatedAccountManager: false,
      customBranding: false,
      approvalWorkflows: false,
      depreciationTracking: false,
      procurement: false,
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 599,
    period: 'month',
    assets: -1,
    departments: -1,
    locations: -1,
    users: -1,
    vendors: -1,
    storageMB: 1000,
    features: {
      exports: true,
      advancedReports: true,
      stockVerification: true,
      apiAccess: true,
      multiBranch: true,
      prioritySupport: true,
      sla: true,
      unlimitedAssets: true,
      unlimitedDepartments: true,
      unlimitedLocations: true,
      advancedAnalytics: true,
      customIntegrations: true,
      auditCompliance: true,
      advancedPermissions: true,
      maintenanceManagement: true,
      assetLifecycleTracking: true,
      exportSuite: true,
      dedicatedAccountManager: true,
      customBranding: true,
      approvalWorkflows: true,
      depreciationTracking: true,
      procurement: true,
    },
  },
};

export const PLANS = PLAN_CONFIG;

export function getPlanLimits(plan: Plan): PlanLimits {
  const details = PLAN_CONFIG[plan];
  return {
    assetLimit: details.assets,
    departmentLimit: details.departments,
    locationLimit: details.locations,
    userLimit: details.users,
    vendorLimit: details.vendors,
  };
}

export function getAssetLimit(plan: Plan): number {
  return PLAN_CONFIG[plan].assets;
}

export function getDepartmentLimit(plan: Plan): number {
  return PLAN_CONFIG[plan].departments;
}

export function getLocationLimit(plan: Plan): number {
  return PLAN_CONFIG[plan].locations;
}

export function getUserLimit(plan: Plan): number {
  return PLAN_CONFIG[plan].users;
}

export function getVendorLimit(plan: Plan): number {
  return PLAN_CONFIG[plan].vendors;
}

export function getStorageLimit(plan: Plan): number {
  return PLAN_CONFIG[plan].storageMB;
}

export function canAddAssets(plan: Plan, currentCount: number): { allowed: boolean; message?: string } {
  const limit = PLAN_CONFIG[plan].assets;
  if (limit === -1) return { allowed: true };
  if (currentCount >= limit) {
    if (plan === 'FREE') {
      return {
        allowed: false,
        message: `Your FREE plan caps at ${limit} assets. Upgrade to PRO for 500 assets or Enterprise for unlimited!`,
      };
    }
    if (plan === 'PRO') {
      return {
        allowed: false,
        message: `Asset cap reached (${limit}). Go Enterprise for unlimited assets!`,
      };
    }
  }
  return { allowed: true };
}

export function canAddCategories(plan: Plan, currentCount: number): { allowed: boolean; message?: string } {
  const limit = PLAN_CONFIG[plan].departments;
  if (limit === -1) return { allowed: true };
  if (currentCount >= limit) {
    if (plan === 'FREE') {
      return {
        allowed: false,
        message: `FREE tier = ${limit} category max. PRO gives 5 departments!`,
      };
    }
    if (plan === 'PRO') {
      return {
        allowed: false,
        message: `Department limit reached (${limit}). Go Enterprise for unlimited!`,
      };
    }
  }
  return { allowed: true };
}

export function canAddDepartments(plan: Plan, currentCount: number): { allowed: boolean; message?: string } {
  const limit = PLAN_CONFIG[plan].departments;
  if (limit === -1) return { allowed: true };
  if (currentCount >= limit) {
    if (plan === 'FREE') {
      return {
        allowed: false,
        message: `Your FREE plan allows only ${limit} department. PRO gives 5 departments!`,
      };
    }
    if (plan === 'PRO') {
      return {
        allowed: false,
        message: `Department limit reached (${limit}). Go Enterprise for unlimited!`,
      };
    }
  }
  return { allowed: true };
}

export function canAddLocations(plan: Plan, currentCount: number): { allowed: boolean; message?: string } {
  const limit = PLAN_CONFIG[plan].locations;
  if (limit === -1) return { allowed: true };
  if (currentCount >= limit) {
    if (plan === 'FREE') {
      return {
        allowed: false,
        message: `${limit} location max on FREE. PRO gives 5 locations!`,
      };
    }
    if (plan === 'PRO') {
      return {
        allowed: false,
        message: `Location limit reached (${limit}). Go Enterprise for unlimited!`,
      };
    }
  }
  return { allowed: true };
}

export function canAddVendors(plan: Plan, currentCount: number): { allowed: boolean; message?: string } {
  const limit = PLAN_CONFIG[plan].vendors;
  if (limit === -1) return { allowed: true };
  if (currentCount >= limit) {
    return {
      allowed: false,
      message: `${limit} vendor max on ${plan}. Need more? PRO has you covered!`,
    };
  }
  return { allowed: true };
}

export function canAddUsers(plan: Plan, currentCount: number): { allowed: boolean; message?: string } {
  const limit = PLAN_CONFIG[plan].users;
  if (limit === -1) return { allowed: true };
  if (currentCount >= limit) {
    if (plan === 'FREE') {
      return {
        allowed: false,
        message: `FREE tier limited. Need more team members? PRO has no limits!`,
      };
    }
  }
  return { allowed: true };
}

export function shouldShowAds(plan: Plan): boolean {
  return plan === 'FREE';
}

export function shouldShowUpgradePrompt(plan: Plan): boolean {
  return plan === 'FREE';
}

export function getUpgradeMessage(plan: Plan): { title: string; message: string } | null {
  if (plan === 'FREE') {
    return {
      title: 'Upgrade to Pro',
      message: 'Remove ads and unlock more features',
    };
  }
  if (plan === 'PRO') {
    return {
      title: 'Contact Sales',
      message: 'Get Enterprise features and premium support',
    };
  }
  return null;
}

export function formatLimit(limit: number): string {
  return limit === -1 ? 'Unlimited' : limit.toString();
}

export function getPlanDetails(plan: Plan): PlanDetails {
  return PLAN_CONFIG[plan];
}

export function canAccessFeature(plan: Plan, feature: keyof PlanDetails['features']): boolean {
  return PLAN_CONFIG[plan].features[feature];
}

export function isEnterprise(plan: Plan): boolean {
  return plan === 'ENTERPRISE';
}

export function canAccessEnterpriseFeature(plan: Plan): boolean {
  return plan === 'ENTERPRISE';
}

export const ENTERPRISE_FEATURES_LIST = [
  { id: 'unlimitedAssets', label: 'Unlimited Assets', description: 'No asset cap for your organization' },
  { id: 'unlimitedDepartments', label: 'Unlimited Departments', description: 'Create as many departments as needed' },
  { id: 'unlimitedLocations', label: 'Unlimited Locations', description: 'Unlimited locations across branches' },
  { id: 'multiBranch', label: 'Multi-Branch Management', description: 'Manage multiple branches from one account' },
  { id: 'advancedAnalytics', label: 'Advanced Analytics', description: 'Asset trends, lifecycle, depreciation charts' },
  { id: 'stockVerification', label: 'Stock Verification', description: 'Stock take sessions and discrepancy reports' },
  { id: 'apiAccess', label: 'API Access', description: 'REST API with generated keys and usage logs' },
  { id: 'customIntegrations', label: 'Custom Integrations', description: 'Webhooks, Zapier-ready, accounting integrations' },
  { id: 'auditCompliance', label: 'Audit & Compliance', description: 'Immutable audit logs, compliance filters, exportable reports' },
  { id: 'advancedPermissions', label: 'Advanced Permissions', description: 'Custom roles, granular permissions, permission matrix' },
  { id: 'maintenanceManagement', label: 'Maintenance Management', description: 'Full maintenance lifecycle with scheduling' },
  { id: 'assetLifecycleTracking', label: 'Asset Lifecycle Tracking', description: 'End-to-end lifecycle from procurement to disposal' },
  { id: 'exportSuite', label: 'Full Export Suite', description: 'Export assets, audit logs, maintenance, warranties as CSV/PDF' },
  { id: 'prioritySupport', label: 'Priority Support', description: 'Highest queue priority and faster SLA timers' },
  { id: 'dedicatedAccountManager', label: 'Dedicated Account Manager', description: 'Named account manager for your organization' },
  { id: 'sla', label: 'SLA Guarantee', description: 'Guaranteed response and resolution times' },
  { id: 'customBranding', label: 'Custom Branding', description: 'Organization logo, custom theme, branded reports' },
  { id: 'approvalWorkflows', label: 'Approval Workflows', description: 'Assignment, maintenance, and retirement approvals' },
  { id: 'depreciationTracking', label: 'Depreciation Tracking', description: 'Multiple methods, schedules, and finance reports' },
  { id: 'procurement', label: 'Procurement & Purchase Orders', description: 'Purchase requests, purchase orders, receiving workflow, and asset creation from POs' },
];

export function isAdVisible(plan: Plan): boolean {
  return plan === 'FREE';
}

export function checkLimits(plan: Plan, usage: { assetCount: number; departmentCount: number; locationCount: number; userCount: number }): { allowed: boolean; exceeded: string[] } {
  const details = PLAN_CONFIG[plan];
  const exceeded: string[] = [];

  if (details.assets !== -1 && usage.assetCount >= details.assets) {
    exceeded.push(`assets (${usage.assetCount}/${details.assets})`);
  }

  if (details.departments !== -1 && usage.departmentCount >= details.departments) {
    exceeded.push(`departments (${usage.departmentCount}/${details.departments})`);
  }

  if (details.locations !== -1 && usage.locationCount >= details.locations) {
    exceeded.push(`locations (${usage.locationCount}/${details.locations})`);
  }

  if (details.users !== -1 && usage.userCount >= details.users) {
    exceeded.push(`users (${usage.userCount}/${details.users})`);
  }

  return {
    allowed: exceeded.length === 0,
    exceeded,
  };
}

export function getUpgradeTarget(plan: Plan): Plan | null {
  if (plan === 'FREE') return 'PRO';
  if (plan === 'PRO') return 'ENTERPRISE';
  return null;
}

export interface CheckoutResult {
  success: boolean;
  error?: string;
  url?: string;
  sessionId?: string;
}

export async function createCheckoutSession(
  userId: string,
  plan: Plan,
  provider: BillingProvider = 'STRIPE'
): Promise<CheckoutResult> {
  return {
    success: true,
    url: `/billing?checkout=success&plan=${plan}`,
    sessionId: `cs_${Date.now()}`,
  };
}

export async function createPortalSession(
  userId: string,
  provider: BillingProvider = 'PAYSTACK'
): Promise<CheckoutResult> {
  return {
    success: true,
    url: '/billing?portal=success',
  };
}

export async function cancelSubscription(
  userId: string,
  provider: BillingProvider = 'STRIPE'
): Promise<{ success: boolean; error?: string }> {
  return {
    success: true,
  };
}

export async function getSubscriptionStatus(
  userId: string,
  provider: BillingProvider = 'STRIPE'
): Promise<{
  status: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}> {
  return {
    status: 'ACTIVE',
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };
}