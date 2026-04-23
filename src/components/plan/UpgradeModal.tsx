'use client';

import { useRouter } from 'next/navigation';
import type { Plan } from '@prisma/client';
import type { Feature } from '@/lib/plan';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const PLAN_DETAILS = [
  {
    plan: 'FREE' as Plan,
    name: 'Free',
    price: 'R0',
    period: 'forever',
    description: 'Perfect for getting started',
    features: [
      'Up to 50 assets',
      'Basic asset tracking',
      '1 department, 1 location',
      'Community support',
    ],
    popular: false,
  },
  {
    plan: 'PRO' as Plan,
    name: 'Pro',
    price: 'R149',
    period: 'per month',
    description: 'For growing businesses',
    features: [
      'Up to 1,000 assets',
      'Unlimited departments & locations',
      'Advanced reports',
      'CSV export',
      'Stock verification',
      'Priority support',
    ],
    popular: true,
  },
  {
    plan: 'ENTERPRISE' as Plan,
    name: 'Enterprise',
    price: 'R599',
    period: 'per month',
    description: 'For large organizations',
    features: [
      'Unlimited assets',
      'API access',
      'Multi-branch',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
    ],
    popular: false,
  },
];

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: Feature;
  reason?: 'assetLimit' | 'export' | 'report' | 'api';
}

export function UpgradeModal({ isOpen, onClose, feature, reason }: UpgradeModalProps) {
  const getReasonMessage = () => {
    if (feature) {
      const messages: Record<Feature, string> = {
        EXPORTS: 'Export functionality',
        ADVANCED_REPORTS: 'Advanced reports',
        STOCK_VERIFICATION: 'Stock verification',
        BULK_IMPORT: 'Bulk import',
        API_ACCESS: 'API access',
      };
      return `${messages[feature]} is available on PRO and Enterprise plans.`;
    }
    if (reason === 'assetLimit') {
      return 'You have reached your asset limit. Upgrade to add more assets.';
    }
    if (reason === 'export') {
      return 'Export functionality is available on PRO and Enterprise plans.';
    }
    if (reason === 'report') {
      return 'Advanced reports are available on PRO and Enterprise plans.';
    }
    if (reason === 'api') {
      return 'API access is available on Enterprise plans only.';
    }
    return 'Upgrade to PRO or Enterprise to unlock more features.';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">Upgrade Your Plan</DialogTitle>
          <DialogDescription className="text-center">
            {getReasonMessage()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {PLAN_DETAILS.map((p) => (
            <div
              key={p.plan}
              className={`border rounded-lg p-4 flex flex-col ${
                p.popular ? 'border-primary ring-2 ring-primary' : ''
              }`}
            >
              {p.popular && (
                <span className="self-start text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full mb-2">
                  Popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <div className="mt-1 mb-2">
                <span className="text-2xl font-bold">{p.price}</span>
                {p.price !== 'Custom' && (
                  <span className="text-sm text-muted-foreground">/{p.period}</span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4">{p.description}</p>
              
              <ul className="space-y-2 mb-4 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="text-sm flex items-center gap-2">
                    <svg className="h-4 w-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              
              <Link href={p.plan === 'FREE' ? '/billing' : p.plan === 'PRO' ? '/upgrade' : '/contact'}>
                <Button
                  className="w-full"
                  variant={p.popular ? 'default' : 'outline'}
                >
                  {p.plan === 'FREE' ? 'Current Plan' : `Upgrade to ${p.name}`}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}