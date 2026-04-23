'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPlanDetails, formatLimit, getUpgradeTarget } from '@/lib/billing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UpgradePlanModal } from '@/components/plan/UpgradePlanModal';
import { 
  Package, 
  Crown, 
  Check, 
  CreditCard, 
  Zap, 
  Loader2, 
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowLeft,
  Mail,
  Building2
} from 'lucide-react';

interface UsageStats {
  assets: number;
  departments: number;
  locations: number;
  users: number;
}

interface BillingData {
  plan: string;
  subscriptionStatus: string;
  billingProvider: string;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  canceledAt: string | null;
  assetLimit: number;
  departmentLimit: number;
  locationLimit: number;
  userLimit: number;
  usage: UsageStats;
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percentage = limit === -1 || limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
  const displayLimit = limit === -1 || limit === Infinity ? 'Unlimited' : limit.toLocaleString();
  const isNearLimit = percentage >= 70 && percentage < 90;
  const isAtLimit = percentage >= 90;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-medium ${isAtLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : ''}`}>
          {used.toLocaleString()} / {displayLimit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all ${
            isAtLimit ? 'bg-red-500' : 
            isNearLimit ? 'bg-yellow-500' : 
            'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

const featureLabels: Record<string, string> = {
  exports: 'CSV Export',
  advancedReports: 'Advanced Reports',
  stockVerification: 'Stock Verification',
  apiAccess: 'API Access',
  multiBranch: 'Multi-Branch',
  prioritySupport: 'Priority Support',
  sla: 'SLA Guarantee',
  onPremise: 'On-Premise Option',
};

export default function BillingPage() {
  const router = useRouter();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/billing')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
        } else {
          setBillingData(data);
        }
      })
      .catch(() => setError('Failed to load billing data'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access at the end of your billing period.')) {
      return;
    }

    setCanceling(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to cancel');
      } else {
        setSuccess('Subscription canceled. You will have access until the end of your billing period.');
        router.refresh();
      }
    } catch {
      setError('An error occurred');
    } finally {
      setCanceling(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !billingData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={handleBack} className="mb-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const plan = (billingData?.plan || 'FREE') as 'FREE' | 'PRO' | 'ENTERPRISE';
  const planDetails = getPlanDetails(plan);
  const usage = billingData?.usage || { assets: 0, departments: 0, locations: 0, users: 0 };
  const upgradeTarget = getUpgradeTarget(plan);

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={handleBack} className="mb-2">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* A. Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          {planDetails.name} Plan — {plan === 'FREE' ? 'Free forever' : plan === 'PRO' ? 'R149/month' : 'R599/month'}
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span>{success}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* B. Current Plan */}
      <Card className={plan === 'PRO' ? 'border-primary' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {plan === 'PRO' || plan === 'ENTERPRISE' ? (
                <Crown className="h-6 w-6 text-primary" />
              ) : (
                <Package className="h-6 w-6 text-muted-foreground" />
              )}
              <div>
                <CardTitle className="text-xl">{planDetails.name} Plan</CardTitle>
                <CardDescription>
                  {plan === 'FREE' 
                    ? 'Free forever - limited features' 
                    : plan === 'PRO'
                    ? 'R149/month'
                    : 'Custom pricing'
                  }
                </CardDescription>
              </div>
            </div>
            <Badge variant={plan === 'FREE' ? 'secondary' : plan === 'PRO' ? 'default' : 'outline'}>
              {plan === 'FREE' ? 'Free' : plan === 'PRO' ? 'Active' : 'Enterprise'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {plan !== 'FREE' && billingData?.billingPeriodEnd ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>
                    {billingData.canceledAt 
                      ? `Access until ${new Date(billingData.billingPeriodEnd).toLocaleDateString()}`
                      : `Renews: ${new Date(billingData.billingPeriodEnd).toLocaleDateString()}`
                    }
                  </span>
                </div>
              ) : (
                <span>Billing cycle: Monthly</span>
              )}
            </div>
            {plan === 'FREE' && upgradeTarget && (
              <Button 
                className="bg-primary"
                onClick={() => setUpgradeModalOpen(true)}
                disabled={loading}
              >
                <Zap className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            )}
            {plan === 'PRO' && (
              <Button 
                className="bg-primary"
                onClick={() => setUpgradeModalOpen(true)}
                disabled={loading}
              >
                <Zap className="h-4 w-4 mr-2" />
                Upgrade to Enterprise
              </Button>
            )}
            {plan === 'ENTERPRISE' && (
              <div className="text-sm text-muted-foreground">You are on the Enterprise plan</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* C. Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Current Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <UsageBar label="Assets" used={usage.assets} limit={billingData?.assetLimit ?? planDetails.assets} />
          <UsageBar label="Departments" used={usage.departments} limit={billingData?.departmentLimit ?? planDetails.departments} />
          <UsageBar label="Locations" used={usage.locations} limit={billingData?.locationLimit ?? planDetails.locations} />
          <UsageBar label="Users" used={usage.users} limit={billingData?.userLimit ?? planDetails.users} />
        </CardContent>
      </Card>

      {/* D. Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Free */}
            <div className={`p-4 rounded-lg border-2 ${plan === 'FREE' ? 'border-primary bg-muted/50' : 'border-muted'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Free</h3>
                {plan === 'FREE' && <Badge variant="default">Current</Badge>}
              </div>
              <p className="text-2xl font-bold mb-1">R0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground mb-4">50 assets, 1 dept, 1 loc</p>
              {plan !== 'FREE' && plan !== 'PRO' && plan !== 'ENTERPRISE' && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setUpgradeModalOpen(true)}>
                  Upgrade
                </Button>
              )}
            </div>

            {/* Pro */}
            <div className={`p-4 rounded-lg border-2 ${plan === 'PRO' ? 'border-primary bg-muted/50' : 'border-muted'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Pro</h3>
                {plan === 'PRO' && <Badge variant="default">Current</Badge>}
              </div>
              <p className="text-2xl font-bold mb-1">R149<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground mb-4">1,000 assets, unlimited depts & locs</p>
              {plan === 'FREE' && (
                <Button size="sm" className="w-full" onClick={() => setUpgradeModalOpen(true)}>
                  Upgrade
                </Button>
              )}
              {plan === 'ENTERPRISE' && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setUpgradeModalOpen(true)}>
                  Upgrade to Enterprise
                </Button>
              )}
            </div>

            {/* Enterprise */}
            <div className={`p-4 rounded-lg border-2 ${plan === 'ENTERPRISE' ? 'border-primary bg-muted/50' : 'border-muted'}`}>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Enterprise</h3>
                {plan === 'ENTERPRISE' && <Badge variant="default">Current</Badge>}
              </div>
              <p className="text-2xl font-bold mb-1">R599<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-sm text-muted-foreground mb-4">Unlimited everything</p>
              {plan === 'FREE' && (
                <Button size="sm" className="w-full" onClick={() => setUpgradeModalOpen(true)}>
                  Upgrade
                </Button>
              )}
              {plan === 'PRO' && (
                <Button size="sm" className="w-full" onClick={() => setUpgradeModalOpen(true)}>
                  Upgrade
                </Button>
              )}
              {plan === 'ENTERPRISE' && (
                <Button size="sm" className="w-full" disabled>
                  Current Plan
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* E. Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Billing History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No billing history yet</p>
          </div>
        </CardContent>
      </Card>

      {/* F. Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 border rounded-lg">
            <Building2 className="h-8 w-8 text-muted-foreground" />
            <div>
              <p className="font-medium">Payfast</p>
              <p className="text-sm text-muted-foreground">Payment provider</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* G. Support */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Contact us for billing questions or support</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/contact">
            <Button variant="outline">
              <Mail className="h-4 w-4 mr-2" />
              Contact Billing Support
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Cancel Subscription (for paid plans) */}
      {plan !== 'FREE' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-500">Cancel Subscription</CardTitle>
            <CardDescription>
              Cancel your subscription. You'll lose access at the end of your billing period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={handleCancel}
              disabled={canceling}
            >
              {canceling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Canceling...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      <UpgradePlanModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentPlan={plan}
      />
    </div>
  );
}