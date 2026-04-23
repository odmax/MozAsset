'use client';

import { useRouter } from 'next/navigation';

export type PlanType = 'PRO' | 'ENTERPRISE';

interface CheckoutResult {
  success: boolean;
  error?: string;
}

export async function startPayfastCheckout(
  plan: PlanType,
  router: ReturnType<typeof useRouter>
): Promise<CheckoutResult> {
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