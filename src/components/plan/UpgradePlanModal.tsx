'use client';

import { useState, useRef, useEffect } from 'react';
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
      '5 departments',
      '5 locations',
      'CSV Export',
      'Advanced Reports',
      'Stock Verification',
      'Priority Support',
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
      'Unlimited assets',
      'API Access',
      'Multi-branch',
      'Custom Integrations',
      'Dedicated Support',
      'SLA Guarantee',
      'On-premise Option',
    ],
  },
];

export function UpgradePlanModal({ isOpen, onClose, currentPlan }: UpgradePlanModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState<Plan | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState('');
  const [payfastUrl, setPayfastUrl] = useState('');
  const [payfastData, setPayfastData] = useState<Record<string, string> | null>(null);
  const autoFormRef = useRef<HTMLFormElement>(null);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
    };
  }, []);

  // Auto-submit the Payfast form when it becomes available in the DOM
  useEffect(() => {
    if (redirecting && autoFormRef.current) {
      console.log('[Payfast] Auto-submit: form ref available, submitting...');
      requestAnimationFrame(() => {
        try {
          autoFormRef.current?.submit();
          console.log('[Payfast] Auto-submit: form.submit() called successfully');
        } catch (err) {
          console.error('[Payfast] Auto-submit: form.submit() threw:', err);
        }
      });

      // Log if we're still here after 3s (submit likely didn't navigate)
      const stuckCheck = setTimeout(() => {
        console.log('[Payfast] WARNING: component still mounted 3s after submit - navigation blocked');
      }, 3000);
      return () => clearTimeout(stuckCheck);
    }
  }, [redirecting]);

  const handleUpgrade = async (plan: Plan) => {
    setLoading(plan);
    setError('');
    setPayfastUrl('');
    setPayfastData(null);

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'checkout', plan }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        const msg = data.error || 'Failed to start checkout';
        setError(msg);
        setLoading(null);
        toast({ variant: 'destructive', title: 'Checkout Failed', description: msg });
        return;
      }

      if (data.checkoutUrl && data.checkoutData) {
        setPayfastUrl(data.checkoutUrl);
        setPayfastData(data.checkoutData);
        setRedirecting(true);

        // Fallback: after 15s show manual button
        fallbackTimer.current = setTimeout(() => {
          setRedirecting(false);
          setLoading(null);
          setError('Redirect did not complete. Click the button below to proceed to Payfast.');
          toast({ variant: 'destructive', title: 'Redirect Issue', description: 'Use the manual button to proceed.' });
        }, 15000);
      } else {
        setError('Invalid checkout response');
        setLoading(null);
        toast({ variant: 'destructive', title: 'Checkout Error', description: 'Invalid response from server.' });
      }
    } catch {
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
    if (currentPlan === 'PRO') return [PLAN_OPTIONS[1]]; // Only Enterprise
    return []; // No upgrades for Enterprise
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

        {/* Hidden auto-submit form — declarative, rendered in React tree */}
        {redirecting && payfastUrl && payfastData && (
          <form ref={autoFormRef} method="POST" action={payfastUrl} style={{ display: 'none' }}>
            {Object.entries(payfastData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>
        )}

        {error && (
          <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-lg text-center">
            {error}
            {payfastUrl && payfastData && (
              <form method="POST" action={payfastUrl} className="mt-3">
                {Object.entries(payfastData).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
                <Button type="submit" size="sm" variant="outline" className="gap-2">
                  <ExternalLink className="h-3 w-3" />
                  Proceed to Payfast Manually
                </Button>
              </form>
            )}
          </div>
        )}

        {redirecting && (
          <div className="mb-4 p-4 text-sm text-primary bg-primary/5 rounded-lg text-center space-y-2">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            <p className="font-medium">Redirecting to secure checkout...</p>
            <p className="text-xs text-muted-foreground">You will be redirected to Payfast to complete payment</p>
          </div>
        )}

        {!redirecting && availablePlans.length > 0 && (
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
                      {p.plan === 'PRO' ? 'Most Popular' : 'Best Value'}
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
        )}

        {!redirecting && availablePlans.length === 0 && (
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
  // This hook can be used to manage the modal state
  // Usage: const { openModal, closeModal, UpgradeModalComponent } = useUpgradeModal();
  return {};
}