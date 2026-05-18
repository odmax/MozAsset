'use client';

import type { Plan } from '@prisma/client';
import { getAssetLimit, getPlanDetails } from '@/lib/billing';

export type Feature = 'EXPORTS' | 'ADVANCED_REPORTS' | 'STOCK_VERIFICATION' | 'BULK_IMPORT' | 'API_ACCESS';

export function PlanGuard({ assetCount = 0, plan, children, fallback }: {
  assetCount?: number;
  plan: Plan;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const limit = getAssetLimit(plan);
  if (limit !== -1 && assetCount >= limit) {
    if (fallback) return <>{fallback}</>;
    return null;
  }

  return <>{children}</>;
}

export function checkAssetLimit(plan: Plan, currentCount: number): { allowed: boolean; message?: string } {
  const limit = getAssetLimit(plan);
  if (limit !== -1 && currentCount >= limit) {
    if (plan === 'FREE') {
      return {
        allowed: false,
        message: `You have reached your asset limit (${limit}). Upgrade to PRO to add more assets.`,
      };
    }
    if (plan === 'PRO') {
      return {
        allowed: false,
        message: `You have reached your asset limit (${limit}). Contact sales for Enterprise.`,
      };
    }
  }
  return { allowed: true };
}

export function usePlanCheck(plan: Plan) {
  const details = getPlanDetails(plan);
  return {
    canExport: details.features.exports,
    canAdvancedReports: details.features.advancedReports,
    canStockVerification: details.features.stockVerification,
    canBulkImport: details.features.stockVerification,
    canApiAccess: details.features.apiAccess,
    isPro: plan === 'PRO' || plan === 'ENTERPRISE',
    isEnterprise: plan === 'ENTERPRISE',
    assetLimit: details.assets,
  };
}
