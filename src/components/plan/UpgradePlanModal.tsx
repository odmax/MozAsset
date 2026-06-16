'use client';

import { useState } from 'react';
import type { Plan } from '@prisma/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Zap, Building2, Shield, Star, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UpgradePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: Plan;
}

const PLAN_OPTIONS = [
  {
    plan: 'PRO' as Plan,
    name: 'Pro',
    price: 149,
    priceDisplay: 'R149',
    period: 'month',
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200 hover:border-purple-400',
    ringColor: 'ring-purple-500',
    features: [
      'Up to 500 assets',
      '5 departments & locations',
      'CSV & advanced reports',
      'Stock verification tools',
      'Asset labels & QR codes',
      'Priority support',
    ],
  },
  {
    plan: 'ENTERPRISE' as Plan,
    name: 'Enterprise',
    price: 599,
    priceDisplay: 'R599',
    period: 'month',
    icon: Building2,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200 hover:border-amber-400',
    ringColor: 'ring-amber-500',
    features: [
      'Unlimited assets, departments & locations',
      'Multi-branch management',
      'API access & custom integrations',
      'Advanced analytics & reports',
      'Stock verification & audits',
      'Depreciation & lifecycle tracking',
      'Procurement & purchase orders',
      'Approval workflows',
      'Custom branding',
      'Dedicated account manager & SLA',
    ],
  },
];

export function UpgradePlanModal({ isOpen, onClose, currentPlan }: UpgradePlanModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [error, setError] = useState('');

  const handleUpgrade = async (plan: Plan) => {
    setLoading(plan);
    setError('');

    try {
      console.log('[Payfast] Upgrade clicked:', plan);

      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', plan }),
      });

      console.log('[Payfast] API response status:', res.status);
      const data = await res.json();
      console.log('[Payfast] API response:', { checkoutUrl: data.checkoutUrl, hasData: !!data.checkoutData, error: data.error });

      if (!res.ok || data.error) {
        const msg = data.error || 'Failed to start checkout';
        console.error('[Payfast] API error:', msg);
        setError(msg);
        setLoading(null);
        toast({ variant: 'destructive', title: 'Checkout Failed', description: msg });
        return;
      }

      if (!data.checkoutUrl || !data.checkoutData) {
        const msg = 'Invalid checkout response from server';
        console.error('[Payfast] Missing checkoutUrl or checkoutData');
        setError(msg);
        setLoading(null);
        toast({ variant: 'destructive', title: 'Checkout Error', description: msg });
        return;
      }

      // Validate the checkout URL is a known Payfast host
      try {
        const parsed = new URL(data.checkoutUrl);
        const allowedHosts = ['www.payfast.co.za', 'sandbox.payfast.co.za', 'payfast.co.za'];
        const isAllowed = allowedHosts.some(h => parsed.hostname === h || parsed.hostname.endsWith('.' + h));
        if (!isAllowed) {
          throw new Error(`Untrusted host: ${parsed.hostname}`);
        }
      } catch (e) {
        console.error('[Payfast] Invalid checkoutUrl:', data.checkoutUrl, e);
        setError('Invalid payment URL configuration');
        setLoading(null);
        toast({ variant: 'destructive', title: 'Checkout Error', description: 'Invalid payment URL' });
        return;
      }

      // Close modal before navigation
      onClose();
      setLoading(null);

      // Navigate to the Payfast redirect page which handles form submission
      let encoded: string;
      try {
        encoded = btoa(JSON.stringify(data.checkoutData));
      } catch {
        // btoa can fail on non-Latin1 characters; fall back to direct redirect
        console.error('[Payfast] btoa failed, falling back to direct URL redirect');
        window.location.href = data.checkoutUrl;
        return;
      }

      const encodedUrl = encodeURIComponent(data.checkoutUrl);
      const redirectUrl = `/checkout/payfast?data=${encoded}&url=${encodedUrl}`;
      console.log('[Payfast] Redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
    } catch (e) {
      console.error('[Payfast] Checkout error:', e);
      const msg = 'Failed to process checkout';
      setError(msg);
      setLoading(null);
      toast({ variant: 'destructive', title: 'Checkout Error', description: msg });
    }
  };

  const getTitle = () => {
    if (currentPlan === 'FREE') return 'Choose Your Plan';
    if (currentPlan === 'PRO') return 'Upgrade to Enterprise';
    return 'Enterprise Plan';
  };

  const getDescription = () => {
    if (currentPlan === 'FREE') return 'Select a plan to unlock more features and remove limits.';
    if (currentPlan === 'PRO') return 'Get unlimited assets and advanced features for your organization.';
    return 'You\'re on the Enterprise plan with all features unlocked.';
  };

  const getAvailablePlans = () => {
    if (currentPlan === 'FREE') return PLAN_OPTIONS;
    if (currentPlan === 'PRO') return [PLAN_OPTIONS[1]];
    return [];
  };

  const availablePlans = getAvailablePlans();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl">{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-lg text-center">
            {error}
          </div>
        )}

        {availablePlans.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {availablePlans.map((p) => {
              const Icon = p.icon;
              const isLoading = loading === p.plan;

              return (
                <div
                  key={p.plan}
                  className={`relative border-2 rounded-xl p-6 flex flex-col transition-all ${p.borderColor}`}
                >
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 ${p.bgColor} px-3 py-1 rounded-full flex items-center gap-1`}>
                    <Icon className={`h-3 w-3 ${p.color}`} />
                    <span className={`text-xs font-medium ${p.color}`}>
                      {p.plan === 'PRO' ? 'Most Popular' : 'All Features'}
                    </span>
                  </div>

                  <div className="text-center mb-4 mt-2">
                    <h3 className="text-xl font-bold">{p.name}</h3>
                    <div className="flex items-baseline justify-center gap-1 mt-2">
                      <span className="text-3xl font-bold">{p.priceDisplay}</span>
                      <span className="text-sm text-muted-foreground">/{p.period}</span>
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {p.features.map((feature, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <Check className={`h-4 w-4 ${p.color} shrink-0 mt-0.5`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => handleUpgrade(p.plan)}
                    disabled={isLoading || loading !== null}
                    className={`w-full ${
                      p.plan === 'PRO'
                        ? 'bg-primary hover:bg-primary/90'
                        : 'bg-amber-600 hover:bg-amber-700'
                    }`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Upgrade to ${p.name}`
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <p className="text-muted-foreground">
              You&apos;re on the Enterprise plan with all features unlocked.
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t text-center">
          <p className="text-xs text-muted-foreground">
            Secure payment powered by Payfast. Cancel anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useUpgradeModal() {
  return {};
}
