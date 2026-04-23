import type { Plan, SubscriptionStatus, BillingProvider } from '@prisma/client';
export { createCheckoutPayload, getPayfastBaseUrl } from './payfast';

export interface PlanLimits {
  assetLimit: number;
  departmentLimit: number;
  locationLimit: number;
  userLimit: number;
}

export interface PlanDetails {
  name: string;
  price: number;
  period: string;
  assets: number;
  departments: number;
  locations: number;
  users: number;
  features: {
    exports: boolean;
    advancedReports: boolean;
    stockVerification: boolean;
    apiAccess: boolean;
    multiBranch: boolean;
    prioritySupport: boolean;
    sla: boolean;
    onPremise: boolean;
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
    features: {
      exports: false,
      advancedReports: false,
      stockVerification: false,
      apiAccess: false,
      multiBranch: false,
      prioritySupport: false,
      sla: false,
      onPremise: false,
    },
  },
  PRO: {
    name: 'Pro',
    price: 149,
    period: 'month',
    assets: 1000,
    departments: -1,
    locations: -1,
    users: -1,
    features: {
      exports: true,
      advancedReports: true,
      stockVerification: true,
      apiAccess: false,
      multiBranch: false,
      prioritySupport: true,
      sla: false,
      onPremise: false,
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
    features: {
      exports: true,
      advancedReports: true,
      stockVerification: true,
      apiAccess: true,
      multiBranch: true,
      prioritySupport: true,
      sla: true,
      onPremise: true,
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

export function canAddAssets(plan: Plan, currentCount: number): { allowed: boolean; message?: string } {
  const limit = PLAN_CONFIG[plan].assets;
  if (limit === -1) return { allowed: true };
  if (currentCount >= limit) {
    if (plan === 'FREE') {
      return {
        allowed: false,
        message: `You've hit the wall! Your FREE plan caps at ${limit} assets. Time to level up to PRO for unlimited assets!`,
      };
    }
    if (plan === 'PRO') {
      return {
        allowed: false,
        message: `Asset cap reached (${limit}). Go Enterprise for unlimited!`,
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
        message: `FREE tier = ${limit} category max. PRO unlocks unlimited!`,
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
        message: `Your FREE plan allows only ${limit} department. PRO = unlimited departments!`,
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
        message: `${limit} location max on FREE. PRO unlocks infinite locations!`,
      };
    }
  }
  return { allowed: true };
}

export function canAddVendors(plan: Plan, currentCount: number): { allowed: boolean; message?: string } {
  const limit = 50;
  if (currentCount >= limit) {
    if (plan === 'FREE') {
      return {
        allowed: false,
        message: `${limit} vendors max on FREE. Need more? PRO has you covered!`,
      };
    }
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

export function canAccessFeatureOld(_feature: string, plan: Plan): boolean {
  const featureKey = _feature.toLowerCase() as keyof PlanDetails['features'];
  return canAccessFeature(plan, featureKey);
}

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