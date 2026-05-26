import prisma from '@/lib/prisma';

const GADS_ID = process.env.NEXT_PUBLIC_GADS_ID || '';
const GADS_PURCHASE_LABEL = process.env.NEXT_PUBLIC_GADS_PURCHASE_LABEL || '';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

export function trackPurchaseConversion(params: {
  value: number;
  currency: string;
  transactionId: string;
  plan: string;
}): void {
  if (typeof window === 'undefined') return;
  if (!GADS_ID || !GADS_PURCHASE_LABEL) return;

  const gtag = window.gtag;
  if (!gtag) {
    console.warn('[GADS] gtag not available on window');
    return;
  }

  gtag('event', 'conversion', {
    send_to: `${GADS_ID}/${GADS_PURCHASE_LABEL}`,
    value: params.value,
    currency: params.currency,
    transaction_id: params.transactionId,
  });

  console.log('[GADS] Conversion tracked:', {
    transactionId: params.transactionId,
    plan: params.plan,
    value: params.value,
    currency: params.currency,
  });
}

export async function logPurchaseConversion(params: {
  transactionId: string;
  plan: string;
  value: number;
  currency?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.googleConversionLog.findUnique({
      where: { transactionId: params.transactionId },
      select: { id: true },
    });

    if (existing) {
      return { success: false, error: 'Duplicate conversion - already logged' };
    }

    await prisma.googleConversionLog.create({
      data: {
        transactionId: params.transactionId,
        plan: params.plan,
        value: params.value,
        currency: params.currency || 'ZAR',
        status: 'sent',
      },
    });

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
