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
  shouldShowAds,
  shouldShowUpgradePrompt,
  getUpgradeMessage,
  createCheckoutSession, 
  createPortalSession, 
  cancelSubscription, 
  getSubscriptionStatus,
  canAccessFeature,
  canAccessFeatureOld,
  isAdVisible,
  type PlanDetails,
  type CheckoutResult,
  type PlanLimits
} from './billing';

export type Feature = 'EXPORTS' | 'ADVANCED_REPORTS' | 'STOCK_VERIFICATION' | 'BULK_IMPORT' | 'API_ACCESS';