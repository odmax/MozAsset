import { PLAN_CONFIG } from './billing';
import type { Plan } from '@prisma/client';

export interface SubscriptionKPIs {
  activeSubscriptions: number;
  trialAccounts: number;
  cancelledSubscriptions: number;
  expiringSoon: number;
  mrr: number;
  arr: number;
  conversionRate: number;
  churnRate: number;
}

export interface SubscriptionRow {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  organization: string | null;
  plan: string;
  status: string;
  billingCycle: string;
  amount: number;
  startDate: string | null;
  renewalDate: string | null;
  lastPayment: string | null;
  autoRenew: boolean;
  paymentMethod: string;
  canceledAt: string | null;
}

export interface SubscriptionChartData {
  subscriptionGrowth: { month: string; count: number }[];
  planDistribution: { plan: string; count: number; percentage: number }[];
  churnTrend: { month: string; cancelled: number; new: number }[];
  conversionFunnel: { stage: string; count: number }[];
}

export interface RevenueKPIs {
  totalRevenue: number;
  revenueThisMonth: number;
  revenueToday: number;
  arpu: number;
  failedPayments: number;
  refunds: number;
  netRevenue: number;
  outstandingRevenue: number;
}

export interface RevenueChartData {
  dailyRevenue: { date: string; revenue: number }[];
  monthlyRevenue: { month: string; revenue: number }[];
  yearlyGrowth: { year: string; revenue: number }[];
  paymentSuccessVsFailed: { status: string; count: number; amount: number }[];
  revenueByPlan: { plan: string; revenue: number; count: number }[];
}

export interface TransactionRow {
  id: string;
  transactionId: string;
  customer: string;
  email: string;
  organization: string | null;
  plan: string | null;
  amount: number;
  vat: number;
  netAmount: number;
  status: string;
  provider: string;
  date: string;
  reference: string | null;
  userId: string;
}

export function getPlanPrice(plan: string): number {
  return PLAN_CONFIG[plan as Plan]?.price || 0;
}

export function getMonthRange(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  if (amount >= 1_000_000) return `R${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `R${(amount / 1_000).toFixed(1)}K`;
  return formatCurrency(amount);
}
