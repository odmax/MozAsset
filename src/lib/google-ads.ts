import prisma from '@/lib/prisma';

const GADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || '';
const CONVERSION_LABEL = '0hQUCO61o7IcEJrJkN9D';

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
  if (!GADS_ID) return;

  const gtag = window.gtag;
  if (!gtag) {
    console.warn('[GADS] gtag not available on window');
    return;
  }

  gtag('event', 'conversion', {
    send_to: `${GADS_ID}/${CONVERSION_LABEL}`,
    value: params.value,
    currency: params.currency,
    transaction_id: params.transactionId,
  });

  console.log('[GADS] Conversion tracked:', {
    send_to: `${GADS_ID}/${CONVERSION_LABEL}`,
    transactionId: params.transactionId,
    plan: params.plan,
    value: params.value,
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

    console.log('[GADS] Conversion logged to DB:', params.transactionId);

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: message };
  }
}
