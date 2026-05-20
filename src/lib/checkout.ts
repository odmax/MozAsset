'use client';

export type PlanType = 'PRO' | 'ENTERPRISE';

export interface CheckoutResult {
  success: boolean;
  error?: string;
  checkoutUrl?: string;
}

export async function startPayfastCheckout(plan: PlanType): Promise<CheckoutResult> {
  try {
    const res = await fetch('/api/billing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'checkout', plan }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      return { success: false, error: data.error || 'Failed to start checkout' };
    }

    if (data.checkoutUrl && data.checkoutData) {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = data.checkoutUrl;

      Object.entries(data.checkoutData).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value as string;
        form.appendChild(input);
      });

      document.body.appendChild(form);

      setTimeout(() => {
        if (document.body.contains(form)) {
          console.warn('[Checkout] Form not submitted within timeout');
        }
      }, 5000);

      form.submit();
      return { success: true };
    }

    return { success: false, error: 'Invalid checkout response' };
  } catch {
    return { success: false, error: 'Failed to process checkout' };
  }
}

export function getPlanPrice(plan: PlanType): number {
  return plan === 'PRO' ? 149 : 599;
}

export function getPlanDisplayName(plan: PlanType): string {
  return plan === 'PRO' ? 'Pro' : 'Enterprise';
}
