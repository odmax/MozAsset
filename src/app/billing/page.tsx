'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPlanDetails, formatLimit, getUpgradeTarget } from '@/lib/billing';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UpgradePlanModal } from '@/components/plan/UpgradePlanModal';
import { CancelSubscriptionModal } from '@/components/billing/CancelSubscriptionModal';
import { 
  Crown, Check, CreditCard, Zap, Loader2, AlertTriangle,
  CheckCircle, Clock, ArrowLeft, Mail, Building2, 
  ShieldCheck, TrendingUp, Users, MapPin, Package, Layers,
  ChevronRight, Sparkles, BarChart3, HeadphonesIcon
} from 'lucide-react';

interface UsageStats {
  assets: number; departments: number; locations: number; users: number;
}

interface BillingData {
  plan: string; subscriptionStatus: string; billingProvider: string;
  billingPeriodStart: string | null; billingPeriodEnd: string | null;
  canceledAt: string | null; assetLimit: number; departmentLimit: number;
  locationLimit: number; userLimit: number; usage: UsageStats;
}

function UsageBar({ label, used, limit, icon: Icon }: { label: string; used: number; limit: number; icon: any }) {
  const percentage = limit === -1 || limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
  const displayLimit = limit === -1 || limit === Infinity ? 'Unlimited' : limit.toLocaleString();
  const isNearLimit = percentage >= 70 && percentage < 90;
  const isAtLimit = percentage >= 90;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <span className={`text-sm font-medium tabular-nums ${isAtLimit ? 'text-red-500' : isNearLimit ? 'text-amber-500' : 'text-foreground'}`}>
          {used.toLocaleString()} <span className="text-muted-foreground font-normal">/</span> {displayLimit}
        </span>
      </div>
      <div className="h-2 bg-muted/60 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${
          isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-gradient-to-r from-primary/70 to-primary'
        }`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function PayfastLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="40" rx="6" fill="#f0f0f0"/>
      <text x="12" y="26" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="16" fill="#333">Pay</text>
      <text x="42" y="26" fontFamily="Arial, sans-serif" fontWeight="300" fontSize="16" fill="#666">fast</text>
    </svg>
  );
}

const planMeta = {
  FREE: { title: 'Free Plan', subtitle: 'Free forever', badge: 'Free', badgeVariant: 'secondary' as const, color: 'text-slate-500', gradient: 'from-slate-50 to-slate-100/50' },
  PRO: { title: 'Pro Plan', subtitle: 'R149/month', badge: 'Active', badgeVariant: 'default' as const, color: 'text-primary', gradient: 'from-primary/5 via-primary/[0.02] to-transparent' },
  ENTERPRISE: { title: 'Enterprise', subtitle: 'R599/month', badge: 'Enterprise', badgeVariant: 'outline' as const, color: 'text-amber-600', gradient: 'from-amber-50/80 via-amber-50/30 to-transparent' },
};

export default function BillingPage() {
  const router = useRouter();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/billing').then(r => r.json()).then(d => {
      if (d.error) setError(d.error); else setBillingData(d);
    }).catch(() => setError('Failed to load billing data')).finally(() => setLoading(false));
  }, []);

  const handleBack = () => { if (window.history.length > 1) router.back(); else router.push('/dashboard'); };

  if (loading) return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={handleBack} className="mb-2"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
      <Card><CardContent className="py-16"><div className="flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></CardContent></Card>
    </div>
  );

  if (error && !billingData) return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={handleBack} className="mb-2"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button>
      <Card><CardContent className="py-16 text-center"><AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" /><p className="text-red-500 font-medium">{error}</p></CardContent></Card>
    </div>
  );

  const plan = (billingData?.plan || 'FREE') as 'FREE' | 'PRO' | 'ENTERPRISE';
  const planDetails = getPlanDetails(plan);
  const usage = billingData?.usage || { assets: 0, departments: 0, locations: 0, users: 0 };
  const upgradeTarget = getUpgradeTarget(plan);
  const meta = planMeta[plan];
  const isCanceled = !!billingData?.canceledAt;

  return (
    <div className="space-y-6 pb-8">
      {/* Back */}
      <Button variant="ghost" onClick={handleBack} className="mb-2 -ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-2" />Back
      </Button>

      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and usage</p>
        </div>
      </div>

      {/* Success / Error */}
      {success && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
          <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
          {success}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {/* ═══ Current Plan ═══ */}
      <Card className={`overflow-hidden border ${plan === 'PRO' ? 'border-primary/30 shadow-md shadow-primary/5' : plan === 'ENTERPRISE' ? 'border-amber-200 shadow-md shadow-amber-100/30' : ''}`}>
        <div className={`bg-gradient-to-r ${meta.gradient} px-6 pt-5 pb-4`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${
                plan === 'FREE' ? 'bg-slate-100' :
                plan === 'PRO' ? 'bg-primary/10' : 'bg-amber-100'
              }`}>
                {plan === 'FREE' ? <Package className={`h-6 w-6 ${meta.color}`} /> :
                 plan === 'PRO' ? <Crown className="h-6 w-6 text-primary" /> :
                 <Sparkles className="h-6 w-6 text-amber-600" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-xl">{meta.title}</CardTitle>
                  <Badge variant={meta.badgeVariant} className={`text-xs ${isCanceled ? 'bg-slate-100 text-slate-500 border-slate-200' : ''}`}>
                    {isCanceled ? 'Canceled' : meta.badge}
                  </Badge>
                </div>
                <CardDescription className="mt-0.5">{meta.subtitle}</CardDescription>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="pt-4 pb-5 px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-wrap gap-4 text-sm">
              {plan !== 'FREE' && billingData?.billingPeriodEnd ? (
                <div className={`flex items-center gap-1.5 ${isCanceled ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  <Clock className="h-4 w-4" />
                  <span>{isCanceled ? `Access until ${new Date(billingData.billingPeriodEnd).toLocaleDateString()}` : `Renews ${new Date(billingData.billingPeriodEnd).toLocaleDateString()}`}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Billing cycle: Monthly</span>
                </div>
              )}
              {plan !== 'FREE' && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>{billingData?.billingProvider === 'PAYSTACK' ? 'Payfast' : billingData?.billingProvider || 'Not set'}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {plan === 'FREE' && upgradeTarget && (
                <Button onClick={() => setUpgradeModalOpen(true)} className="shadow-sm">
                  <Zap className="h-4 w-4 mr-2" />Upgrade Plan
                </Button>
              )}
              {plan === 'PRO' && (
                <Button onClick={() => setUpgradeModalOpen(true)} className="shadow-sm">
                  <TrendingUp className="h-4 w-4 mr-2" />Upgrade to Enterprise
                </Button>
              )}
              {plan === 'ENTERPRISE' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-2 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  Highest plan
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Subscription Details ═══ */}
      {plan !== 'FREE' && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Subscription Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Status', value: isCanceled ? 'Canceled' : billingData?.subscriptionStatus === 'TRIALING' ? 'Trialing' : billingData?.subscriptionStatus === 'PAST_DUE' ? 'Past Due' : 'Active',
                  badge: true, color: isCanceled ? 'bg-slate-100 text-slate-600 border-slate-200' : billingData?.subscriptionStatus === 'PAST_DUE' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                { label: 'Billing cycle', value: 'Monthly' },
                { label: isCanceled ? 'Access ends' : 'Renewal date', value: billingData?.billingPeriodEnd ? new Date(billingData.billingPeriodEnd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A' },
                { label: 'Payment method', value: billingData?.billingProvider === 'PAYSTACK' ? 'Payfast' : billingData?.billingProvider || 'Not set', isPayfast: true },
              ].map((item, i) => (
                <div key={i} className="space-y-1.5 p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{item.label}</p>
                  {'badge' in item && item.badge ? (
                    <Badge className={`text-xs font-medium border ${(item as any).color}`} variant="outline">{item.value}</Badge>
                  ) : 'isPayfast' in item && item.isPayfast ? (
                    <div className="flex items-center gap-2">
                      <PayfastLogo className="h-7 w-auto" />
                    </div>
                  ) : (
                    <p className="text-sm font-medium">{item.value}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ═══ Usage ═══ */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Current Usage</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <UsageBar label="Assets" used={usage.assets} limit={billingData?.assetLimit ?? planDetails.assets} icon={Package} />
          <UsageBar label="Departments" used={usage.departments} limit={billingData?.departmentLimit ?? planDetails.departments} icon={Layers} />
          <UsageBar label="Locations" used={usage.locations} limit={billingData?.locationLimit ?? planDetails.locations} icon={MapPin} />
          <UsageBar label="Users" used={usage.users} limit={billingData?.userLimit ?? planDetails.users} icon={Users} />
        </CardContent>
      </Card>

      {/* ═══ Plans Comparison ═══ */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Crown className="h-5 w-5 text-primary" />Available Plans</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Free */}
            <div className={`relative p-5 rounded-xl border-2 transition-all ${
              plan === 'FREE' ? 'border-primary/40 bg-gradient-to-b from-primary/[0.03] to-transparent shadow-sm' : 'border-border hover:border-muted-foreground/20'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Free</h3>
                {plan === 'FREE' && <Badge className="text-[10px]">Current</Badge>}
              </div>
              <p className="text-3xl font-bold mb-1">R0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground mb-4">50 assets, 1 dept, 1 location</p>
              <ul className="space-y-2 mb-5 text-sm">
                <li className="flex items-center gap-2 text-muted-foreground"><Check className="h-3.5 w-3.5 text-muted-foreground/40" />Basic asset tracking</li>
                <li className="flex items-center gap-2 text-muted-foreground"><Check className="h-3.5 w-3.5 text-muted-foreground/40" />Simple reports</li>
              </ul>
              {plan !== 'FREE' && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setUpgradeModalOpen(true)} disabled>Downgrade</Button>
              )}
            </div>

            {/* Pro */}
            <div className={`relative p-5 rounded-xl border-2 transition-all ${
              plan === 'PRO' ? 'border-primary shadow-md shadow-primary/5 bg-gradient-to-b from-primary/[0.04] to-transparent' :
              plan === 'FREE' ? 'border-primary/30 ring-2 ring-primary/10 shadow-sm bg-gradient-to-b from-primary/[0.02] to-transparent' : 'border-border hover:border-muted-foreground/20'
            }`}>
              {plan === 'FREE' && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-white text-[10px] font-semibold px-3 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />RECOMMENDED
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg">Pro</h3>
                {plan === 'PRO' && <Badge className="text-[10px]">Current</Badge>}
              </div>
              <p className="text-3xl font-bold mb-1">R149<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground mb-4">1,000 assets, unlimited depts &amp; locations</p>
              <ul className="space-y-2 mb-5 text-sm">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" />Advanced reports &amp; charts</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" />CSV exports</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" />Priority support</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-primary" />Stock verification</li>
              </ul>
              {plan === 'FREE' && (
                <Button size="sm" className="w-full shadow-sm" onClick={() => setUpgradeModalOpen(true)}>
                  <Zap className="h-3.5 w-3.5 mr-1.5" />Upgrade to Pro
                </Button>
              )}
              {plan === 'ENTERPRISE' && (
                <Button variant="outline" size="sm" className="w-full" onClick={() => setUpgradeModalOpen(true)}>Downgrade</Button>
              )}
            </div>

            {/* Enterprise */}
            <div className={`relative p-5 rounded-xl border-2 transition-all ${
              plan === 'ENTERPRISE' ? 'border-amber-300 shadow-md shadow-amber-100/30 bg-gradient-to-b from-amber-50/50 to-transparent' : 'border-border hover:border-muted-foreground/20'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-lg flex items-center gap-1.5">
                  Enterprise
                  <Sparkles className="h-4 w-4 text-amber-500" />
                </h3>
                {plan === 'ENTERPRISE' && <Badge className="text-[10px]">Current</Badge>}
              </div>
              <p className="text-3xl font-bold mb-1">R599<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground mb-4">Unlimited everything</p>
              <ul className="space-y-2 mb-5 text-sm">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-600" />Unlimited assets</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-600" /><span className="text-amber-600 text-xs font-bold">∞</span> All Pro features + more</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-600" />API access</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-600" />Multi-branch support</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-600" />SLA + on-premise option</li>
              </ul>
              {(plan === 'FREE' || plan === 'PRO') && (
                <Button size="sm" className="w-full shadow-sm" variant={plan === 'PRO' ? 'default' : 'outline'} onClick={() => setUpgradeModalOpen(true)}>
                  {plan === 'PRO' ? <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> : <Zap className="h-3.5 w-3.5 mr-1.5" />}
                  {plan === 'PRO' ? 'Upgrade to Enterprise' : 'Upgrade'}
                </Button>
              )}
              {plan === 'ENTERPRISE' && (
                <Button size="sm" className="w-full" variant="outline" disabled>
                  <CheckCircle className="h-3.5 w-3.5 mr-1.5" />Current Plan
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Payment Method ═══ */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" />Payment Method</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-xl border bg-gradient-to-r from-slate-50/50 to-transparent">
            <div className="w-14 h-10 rounded-lg bg-white border shadow-sm flex items-center justify-center overflow-hidden">
              <PayfastLogo className="h-7 w-auto" />
            </div>
            <div>
              <p className="font-medium">Payfast</p>
              <p className="text-xs text-muted-foreground">Secure payment processing</p>
            </div>
            <Badge variant="outline" className="ml-auto text-[10px] text-muted-foreground">Default</Badge>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Billing History ═══ */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />Billing History</CardTitle></CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <CreditCard className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">No billing history yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Your invoices will appear here once processed</p>
          </div>
        </CardContent>
      </Card>

      {/* ═══ Need Help ═══ */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><HeadphonesIcon className="h-5 w-5 text-primary" />Need Help?</CardTitle></CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-muted-foreground">Contact our support team for billing questions or assistance.</p>
          <Link href="/contact">
            <Button variant="outline" className="shrink-0">
              <Mail className="h-4 w-4 mr-2" />Contact Support
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* ═══ Cancel Subscription ═══ */}
      {plan !== 'FREE' && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50/30 to-transparent overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" />Cancel Subscription</CardTitle>
            <CardDescription>Once canceled, you&apos;ll lose premium features and be downgraded to Free.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700" onClick={() => setCancelModalOpen(true)}>
              Cancel Subscription
            </Button>
          </CardContent>
        </Card>
      )}

      <UpgradePlanModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} currentPlan={plan} />
      <CancelSubscriptionModal isOpen={cancelModalOpen} onClose={() => { setCancelModalOpen(false); router.refresh(); }} currentPlan={plan} billingPeriodEnd={billingData?.billingPeriodEnd || null} />
    </div>
  );
}
