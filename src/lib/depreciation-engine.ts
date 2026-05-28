import type { DepreciationMethod } from '@prisma/client';

export interface DepreciationParams {
  purchaseCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  method: DepreciationMethod;
  monthsElapsed: number;
}

export function calculateStraightLine(params: DepreciationParams) {
  const { purchaseCost, salvageValue, usefulLifeMonths, monthsElapsed } = params;
  const monthlyRate = (purchaseCost - salvageValue) / usefulLifeMonths;
  const accumulated = Math.min(monthlyRate * monthsElapsed, purchaseCost - salvageValue);
  const bookValue = Math.max(purchaseCost - accumulated, salvageValue);
  return { monthlyDepreciation: monthlyRate, accumulatedDepreciation: accumulated, bookValue };
}

export function calculateDecliningBalance(params: DepreciationParams) {
  const { purchaseCost, salvageValue, usefulLifeMonths, monthsElapsed } = params;
  const rate = 2 / usefulLifeMonths;
  let bookValue = purchaseCost;
  let accumulated = 0;

  for (let i = 0; i < monthsElapsed; i++) {
    const monthly = bookValue * rate;
    accumulated += monthly;
    bookValue = Math.max(purchaseCost - accumulated, salvageValue);
    if (bookValue <= salvageValue) break;
  }

  const monthlyDepreciation = monthsElapsed > 0 ? accumulated / monthsElapsed : 0;
  return { monthlyDepreciation, accumulatedDepreciation: accumulated, bookValue };
}

export function calculateDepreciation(params: DepreciationParams) {
  if (params.method === 'DECLINING_BALANCE') {
    return calculateDecliningBalance(params);
  }
  return calculateStraightLine(params);
}

export function getMonthsElapsed(startDate: Date): number {
  const now = new Date();
  return Math.max(0, (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth()));
}
