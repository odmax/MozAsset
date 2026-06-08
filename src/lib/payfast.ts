import crypto from 'crypto';
import type { Plan, BillingProvider, SubscriptionStatus } from '@prisma/client';
import { getPlanLimits } from './billing';

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
  custom_int1?: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  subscription_type?: string;
  billing_date?: string;
  recurring_amount?: string;
  frequency?: string;
  cycles?: string;
  signature?: string;
}

export interface PayfastPaymentData {
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  item_name: string;
  item_description: string;
  amount: string;
  custom_str1?: string;
  custom_str2?: string;
  custom_str3?: string;
  custom_int1?: string;
  name_first: string;
  name_last: string;
  email_address: string;
}

export function getPayfastConfig(): PayfastConfig {
  return {
    merchantId: (process.env.PAYFAST_MERCHANT_ID || '').trim(),
    merchantKey: (process.env.PAYFAST_MERCHANT_KEY || '').trim(),
    passphrase: (process.env.PAYFAST_PASSPHRASE || '').trim(),
    mode: ((process.env.PAYFAST_MODE as 'sandbox' | 'live') || 'sandbox').trim() as 'sandbox' | 'live',
    itnUrl: (process.env.PAYFAST_ITN_URL || '').trim(),
    returnUrl: (process.env.PAYFAST_RETURN_URL || '').trim(),
    cancelUrl: (process.env.PAYFAST_CANCEL_URL || '').trim(),
  };
}

export function getPayfastBaseUrl(): string {
  const config = getPayfastConfig();
  return config.mode === 'sandbox' 
    ? 'https://sandbox.payfast.co.za' 
    : 'https://www.payfast.co.za';
}

function phpUrlencode(value: string): string {
  // PHP's urlencode(trim(val)) — trim FIRST, then encode.
  // PHP's urlencode encodes all non-alphanumeric except -_.
  // JS encodeURIComponent preserves !~*'() which PHP encodes.
  // Also convert spaces to + (PHP style).
  const encoded = encodeURIComponent(value.trim())
    .replace(/%20/g, '+')
    .replace(/!/g, '%21')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/\*/g, '%2A')
    .replace(/~/g, '%7E');
  return encoded;
}

const PAYFAST_KNOWN_FIELDS = [
  'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
  'name_first', 'name_last', 'email_address', 'cell_number',
  'm_payment_id', 'amount', 'item_name', 'item_description',
  'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
  'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
  'email_confirmation', 'confirmation_address', 'payment_method',
  'subscription_type', 'billing_date', 'recurring_amount', 'frequency', 'cycles',
];

export function generateSignature(data: Record<string, string>): string {
  const config = getPayfastConfig();

  // Filter to known Payfast fields, preserve insertion order, skip empty values.
  // This matches the official PHP SDK behavior exactly:
  // - Only known fields are included
  // - Empty values are excluded
  // - Insertion order is preserved (NOT alphabetical)
  // - All values are urlencode(trim(...))'d
  const pairs: string[] = [];
  for (const key of Object.keys(data)) {
    if (key === 'signature') continue;
    if (!PAYFAST_KNOWN_FIELDS.includes(key)) continue;
    const value = data[key];
    if (value == null || value.trim() === '') continue;
    pairs.push(`${key}=${phpUrlencode(value)}`);
  }

  // Append passphrase as the last field (matching PHP SDK: urlencode(trim(...)))
  if (config.passphrase && config.passphrase.length > 0) {
    pairs.push(`passphrase=${phpUrlencode(config.passphrase)}`);
  }

  const signatureString = pairs.join('&');
  const sig = crypto.createHash('md5').update(signatureString).digest('hex');

  // Debug logging
  const sanitize = (pair: string) => {
    if (pair.startsWith('passphrase=')) return 'passphrase=[REDACTED]';
    if (pair.startsWith('merchant_key=')) return 'merchant_key=[REDACTED]';
    return pair;
  };
  const sanitizedSig = pairs.map(sanitize).join('&');

  console.log('[Payfast] Signature debug:', {
    mode: config.mode,
    hasPassphrase: !!(config.passphrase && config.passphrase.length > 0),
    passphraseLength: (config.passphrase || '').length,
    fieldCount: pairs.length,
    signatureString: sanitizedSig,
    md5: sig,
  });

  return sig;
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
    amount: planPriceFormatted,
    item_name: `MozAssets ${plan} Plan - Monthly Subscription`,
  });
  
  // For ad-hoc payments, use simple form fields only
  const paymentId = `${userId}_${plan}_${Date.now()}`;
  const baseData = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: `${config.returnUrl}?userId=${userId}&plan=${plan}&paymentRef=${encodeURIComponent(paymentId)}`,
    cancel_url: `${config.cancelUrl}?userId=${userId}`,
    notify_url: `${config.itnUrl}?userId=${userId}`,
    name_first: userName.split(' ')[0] || 'Customer',
    name_last: userName.split(' ').slice(1).join(' ') || userName.split(' ')[0] || 'Customer',
    email_address: userEmail,
    m_payment_id: paymentId,
    amount: planPriceFormatted,
    item_name: `MozAssets ${plan} Plan - Monthly Subscription`,
    item_description: `Monthly subscription to MozAssets ${plan} Plan`,
    custom_str1: userId,
    custom_str2: plan,
    custom_str3: 'monthly',
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
    const userId = paymentData.custom_str1 as string;
    const planStr = paymentData.custom_str2 as string;
    const billingCycle = paymentData.custom_str3 as string;
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
    const limits = getPlanLimits(plan);

    await prisma.user.update({
      where: { id: userId },
      data: {
        plan,
        subscriptionStatus: 'ACTIVE' as SubscriptionStatus,
        billingProvider: 'PAYFAST' as BillingProvider,
        billingCustomerId,
        billingSubscriptionId,
        billingPeriodStart,
        billingPeriodEnd,
        lastPaymentAt: new Date(),
        assetLimit: limits.assetLimit,
        departmentLimit: limits.departmentLimit,
        locationLimit: limits.locationLimit,
        userLimit: limits.userLimit,
      },
    });

    // Keep Organization plan in sync with user's plan
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, organizationId: true, email: true, name: true },
    });
    if (user?.organizationId) {
      await prisma.organization.update({
        where: { id: user.organizationId },
        data: { plan, subscriptionStatus: 'ACTIVE' as SubscriptionStatus },
      });
    }

    // Create a Payment record so it shows up in billing analytics
    const planPrice = plan === 'PRO' ? 149 : plan === 'ENTERPRISE' ? 599 : 0;
    await prisma.payment.create({
      data: {
        userId,
        amount: planPrice,
        currency: 'ZAR',
        status: 'COMPLETED',
        provider: 'PAYFAST',
        providerPaymentId: paymentId,
        plan,
        periodStart: billingPeriodStart,
        periodEnd: billingPeriodEnd,
        paidAt: new Date(),
      },
    });

    await prisma.upgradeRequest.findFirst({
      where: { paymentReference: paymentId, status: 'PENDING_PAYMENT' },
    }).then(async (request) => {
      if (request) {
        await prisma.upgradeRequest.update({
          where: { id: request.id },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }
    }).catch((err) => console.error('Failed to match UpgradeRequest:', err));

    const { createNotification } = await import('@/lib/notifications');
    createNotification({
      userId,
      type: 'BILLING_SUCCESSFUL',
      title: 'Payment Confirmed',
      message: `Your ${plan} plan payment has been confirmed and your subscription is active`,
      link: '/billing',
    }).catch((err) => console.error('Failed to create notification:', err));

    const { sendNotificationEmail } = await import('@/lib/notification-email');
    sendNotificationEmail(userId, 'BILLING_SUCCESSFUL', {
      name: '',
      plan,
      amount: plan === 'PRO' ? 'R149' : 'R599',
    }).catch((err) => console.error('Failed to send notification email:', err));

    const { logPurchaseConversion } = await import('@/lib/google-ads');
    logPurchaseConversion({
      transactionId: paymentId,
      plan,
      value: planPrice,
      currency: 'ZAR',
      userId,
    }).catch((err) => console.error('Failed to log Google Ads conversion:', err));

    const { createNotificationForAdmins } = await import('@/lib/notifications');
    createNotificationForAdmins({
      type: 'BILLING_SUCCESSFUL',
      title: 'New Subscription Purchase',
      message: `Plan: ${plan} — R${planPrice}`,
      link: '/admin/billing',
      priority: 'high',
    }).catch((err) => console.error('Failed to create admin notification:', err));

    const { sendEmail } = await import('@/lib/email');
    sendEmail({
      to: process.env.ADMIN_NOTIFICATION_EMAIL || 'info@mozetech.co.za',
      subject: `New subscription purchase: ${plan} — R${planPrice}`,
      html: `<p>A new subscription has been purchased:</p><ul><li><strong>Plan:</strong> ${plan}</li><li><strong>Amount:</strong> R${planPrice}</li><li><strong>User ID:</strong> ${userId}</li><li><strong>Payment ID:</strong> ${paymentId}</li></ul>`,
      type: 'admin_purchase',
    }).catch((err) => console.error('Failed to send admin purchase email:', err));

    return { success: true };
  } catch (error) {
    console.error('Failed to update user plan:', error);

    const { createNotification } = await import('@/lib/notifications');
    createNotification({
      userId,
      type: 'BILLING_FAILED',
      title: 'Payment Failed',
      message: 'Your payment could not be processed. Please check your payment method',
      link: '/billing',
    }).catch((err) => console.error('Failed to create notification:', err));

    const { sendNotificationEmail } = await import('@/lib/notification-email');
    sendNotificationEmail(userId, 'BILLING_FAILED', {}).catch((err) => console.error('Failed to send notification email:', err));

    return { success: false, error: 'Failed to update subscription' };
  }
}

export function getPlanPrice(plan: Plan): number {
  return plan === 'PRO' ? 149 : plan === 'ENTERPRISE' ? 599 : 0;
}

export function getPlanInterval(plan: Plan): string {
  return plan === 'PRO' || plan === 'ENTERPRISE' ? 'monthly' : '';
}
