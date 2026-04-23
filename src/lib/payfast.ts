import crypto from 'crypto';
import type { Plan, BillingProvider, SubscriptionStatus } from '@prisma/client';

export interface PayfastConfig {
  merchantId: string;
  merchantKey: string;
  passphrase: string;
  mode: 'sandbox' | 'live';
  itnUrl: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface PayfastCheckoutData {
  merchant_id: string;
  merchant_key: string;
  return_url: string;
  cancel_url: string;
  notify_url: string;
  name_first: string;
  name_last: string;
  email_address: string;
  m_payment_id: string;
  amount: string;
  item_name: string;
  item_description: string;
  custom_int1: string;
  custom_str1: string;
  subscription_type: string;
  billing_date: string;
  recurring_amount: string;
  frequency: string;
  cycles: string;
  signature?: string;
}

export interface PayfastPaymentData {
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  item_name: string;
  item_description: string;
  amount: string;
  custom_str1: string;
  custom_int1: string;
  name_first: string;
  name_last: string;
  email_address: string;
}

export function getPayfastConfig(): PayfastConfig {
  return {
    merchantId: process.env.PAYFAST_MERCHANT_ID || '',
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
    passphrase: process.env.PAYFAST_PASSPHRASE || '',
    mode: (process.env.PAYFAST_MODE as 'sandbox' | 'live') || 'sandbox',
    itnUrl: process.env.PAYFAST_ITN_URL || '',
    returnUrl: process.env.PAYFAST_RETURN_URL || '',
    cancelUrl: process.env.PAYFAST_CANCEL_URL || '',
  };
}

export function getPayfastBaseUrl(): string {
  const config = getPayfastConfig();
  return config.mode === 'sandbox' 
    ? 'https://sandbox.payfast.co.za' 
    : 'https://www.payfast.co.za';
}

export function generateSignature(data: Record<string, string>): string {
  const config = getPayfastConfig();
  const sortedKeys = Object.keys(data).sort();
  const signatureString = sortedKeys
    .map(key => `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}`)
    .join('&');
  return crypto
    .createHash('md5')
    .update(signatureString + `&passphrase=${config.passphrase}`)
    .digest('hex');
}

export function createCheckoutPayload(
  userId: string,
  userEmail: string,
  userName: string,
  plan: Plan
): PayfastCheckoutData {
  const config = getPayfastConfig();
  const planPrice = plan === 'PRO' ? 149 : plan === 'ENTERPRISE' ? 599 : 0;
  const planPriceFormatted = planPrice.toFixed(2);
  
  console.log('[Payfast] Creating checkout payload:', {
    plan,
    planPrice: planPriceFormatted,
    mode: config.mode,
  });
  
  // For ad-hoc payments, use simple form fields only
  const baseData = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${config.returnUrl}?userId=${userId}&plan=${plan}`,
    cancel_url: `${config.cancelUrl}?userId=${userId}`,
    notify_url: `${config.itnUrl}?userId=${userId}`,
    name_first: userName.split(' ')[0] || 'Customer',
    name_last: userName.split(' ').slice(1).join(' ') || '',
    email_address: userEmail,
    m_payment_id: `${userId}_${plan}_${Date.now()}`,
    amount: planPriceFormatted,
    item_name: `MozAssets ${plan} Plan - Monthly Subscription`,
    item_description: `Monthly subscription to MozAssets ${plan} Plan`,
    custom_int1: userId,
    custom_str1: plan,
  };

  const signature = generateSignature(baseData);
  
  return {
    ...baseData,
    signature,
  };
}

export async function verifyPaymentOrSubscription(
  paymentData: PayfastPaymentData
): Promise<{ valid: boolean; error?: string }> {
  const config = getPayfastConfig();
  
  if (paymentData.payment_status !== 'COMPLETE') {
    return { valid: false, error: 'Payment not complete' };
  }

  return { valid: true };
}

export async function handleITN(
  paymentData: PayfastPaymentData
): Promise<{ success: boolean; userId?: string; plan?: Plan; error?: string }> {
  try {
    const userId = paymentData.custom_int1;
    const planStr = paymentData.custom_str1 as string;
    const plan: Plan = planStr === 'PRO' ? 'PRO' : planStr === 'ENTERPRISE' ? 'ENTERPRISE' : 'FREE';
    
    if (!userId) {
      return { success: false, error: 'No user ID in payment data' };
    }

    return {
      success: true,
      userId,
      plan,
    };
  } catch (error) {
    console.error('Payfast ITN handling error:', error);
    return { success: false, error: 'Internal error processing payment' };
  }
}

export async function updatePlanFromConfirmedPayment(
  userId: string,
  plan: Plan,
  paymentId: string,
  billingCustomerId?: string,
  billingSubscriptionId?: string
): Promise<{ success: boolean; error?: string }> {
  const { default: prisma } = await import('@/lib/prisma');
  
  const billingPeriodStart = new Date();
  const billingPeriodEnd = new Date();
  billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        subscriptionStatus: 'ACTIVE' as SubscriptionStatus,
        billingProvider: 'PAYSTACK' as BillingProvider,
        billingCustomerId,
        billingSubscriptionId,
        billingPeriodStart,
        billingPeriodEnd,
        assetLimit: plan === 'PRO' ? 1000 : 50,
        departmentLimit: plan === 'PRO' ? -1 : 1,
        locationLimit: plan === 'PRO' ? -1 : 1,
        userLimit: plan === 'PRO' ? -1 : 3,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to update user plan:', error);
    return { success: false, error: 'Failed to update subscription' };
  }
}

export function getPlanPrice(plan: Plan): number {
  return plan === 'PRO' ? 29 : 0;
}

export function getPlanInterval(plan: Plan): string {
  return plan === 'PRO' ? 'monthly' : '';
}
