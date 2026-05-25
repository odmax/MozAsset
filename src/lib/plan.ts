import type { Plan } from '@prisma/client';

export { 
  PLAN_CONFIG,
  getPlanDetails, 
  PLANS, 
  formatLimit, 
  checkLimits, 
  getUpgradeTarget,
  getPlanLimits,
  getAssetLimit,
  getDepartmentLimit,
  getLocationLimit,
  getUserLimit,
  canAddAssets,
  canAddCategories,
  canAddDepartments,
  canAddLocations,
  canAddVendors,
  canAddUsers,
  shouldShowAds,
  shouldShowUpgradePrompt,
  getUpgradeMessage,
  createCheckoutSession, 
  createPortalSession, 
  cancelSubscription, 
  getSubscriptionStatus,
  canAccessFeature,
  canAccessEnterpriseFeature,
  isEnterprise,
  ENTERPRISE_FEATURES_LIST,
  isAdVisible,
  type PlanDetails,
  type CheckoutResult,
  type PlanLimits
} from './billing';

export type Feature = 'EXPORTS' | 'ADVANCED_REPORTS' | 'STOCK_VERIFICATION' | 'BULK_IMPORT' | 'API_ACCESS' | 'MULTI_BRANCH' | 'ADVANCED_ANALYTICS' | 'AUDIT_COMPLIANCE' | 'APPROVAL_WORKFLOWS' | 'DEPRECIATION_TRACKING' | 'API_ACCESS';