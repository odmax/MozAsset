'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Package, ArrowRight, Mail } from 'lucide-react';

const features = [
  { name: 'Up to 50 assets', included: true },
  { name: '1 department', included: true },
  { name: '1 location', included: true },
  { name: 'Basic reports', included: true },
  { name: 'Asset assignments', included: true },
  { name: 'Maintenance tracking', included: true },
  { name: 'Export to CSV', included: false },
  { name: 'Advanced analytics', included: false },
  { name: 'Stock verification', included: false },
  { name: 'Multi-branch', included: false },
  { name: 'Priority support', included: false },
  { name: 'API access', included: false },
  { name: 'Custom integrations', included: false },
  { name: 'Dedicated support', included: false },
  { name: 'SLA guarantee', included: false },
  { name: 'On-premise option', included: false },
];

const comparisonFeatures = [
  'Asset Tracking',
  'Asset Assignments',
  'Maintenance Tracking',
  'Reporting',
  'Export',
  'Support Level',
  'Asset Limits',
  'Advanced Features'
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Package className="h-6 w-6 text-primary" />
              <span>MozAssets</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm font-medium">
                Log in
              </Link>
              <Link href="/signup">
                <Button size="sm">Start Free</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Choose the perfect plan for your business. All plans include a 14-day free trial.
              No credit card required to start.
            </p>
          </div>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="pb-12 -mt-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center bg-muted p-1 rounded-full">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  billingCycle === 'monthly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  billingCycle === 'yearly'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Yearly
                <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Save 2 months
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <Card className="relative">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">Free</CardTitle>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-4xl font-bold">R0</span>
                  <span className="text-muted-foreground">/forever</span>
                </div>
                <p className="text-muted-foreground mt-2">Perfect for small teams getting started with asset management.</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={feature.included ? '' : 'text-muted-foreground'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block">
                  <Button variant="outline" className="w-full">
                    Start Free
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-primary ring-2 ring-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-4xl font-bold">
                    {billingCycle === 'monthly' ? 'R149' : 'R1 490'}
                  </span>
                  <span className="text-muted-foreground">
                    {billingCycle === 'monthly' ? '/mo' : '/yr'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-sm text-green-600 font-medium">Save R298 per year</p>
                )}
                <p className="text-muted-foreground mt-2">For growing businesses that need more power and flexibility.</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Up to 1,000 assets</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Unlimited departments</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Unlimited locations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Full reports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Asset assignments</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Maintenance tracking</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Export to CSV</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Stock verification</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <X className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Multi-branch</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <X className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">API access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <X className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Custom integrations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <X className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Dedicated support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <X className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">SLA guarantee</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <X className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">On-premise option</span>
                  </li>
                </ul>
                <Link href="/signup?plan=pro" className="block">
                  <Button className="w-full">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className="relative">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <div className="flex items-baseline justify-center gap-1 mt-2">
                  <span className="text-4xl font-bold">
                    {billingCycle === 'monthly' ? 'R599' : 'R5,990'}
                  </span>
                  <span className="text-muted-foreground">
                    {billingCycle === 'monthly' ? '/mo' : '/yr'}
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-sm text-green-600 font-medium">Save R1,198 per year</p>
                )}
                <p className="text-muted-foreground mt-2">For large organizations with advanced requirements.</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Unlimited assets</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Unlimited departments</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Unlimited locations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Full reports</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Asset assignments</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Maintenance tracking</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Export to CSV</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Stock verification</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>API access</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Multi-branch</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Custom integrations</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>Dedicated support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>SLA guarantee</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>On-premise option</span>
                  </li>
                </ul>
                <Link href="/contact" className="block">
                  <Button variant="outline" className="w-full">
                    Contact Sales
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Compare Plans</h2>
            <p className="text-muted-foreground">See which plan is right for you</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full max-w-4xl mx-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">Free</th>
                  <th className="text-center py-4 px-4 font-semibold">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-4 px-4">Asset Limit</td>
                  <td className="text-center py-4 px-4">50</td>
                  <td className="text-center py-4 px-4">1,000</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Departments</td>
                  <td className="text-center py-4 px-4">1</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Locations</td>
                  <td className="text-center py-4 px-4">1</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                  <td className="text-center py-4 px-4">Unlimited</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">CSV Export</td>
                  <td className="text-center py-4 px-4"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Advanced Reports</td>
                  <td className="text-center py-4 px-4"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Stock Verification</td>
                  <td className="text-center py-4 px-4"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">API Access</td>
                  <td className="text-center py-4 px-4"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="text-center py-4 px-4"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4">Multi-branch</td>
                  <td className="text-center py-4 px-4"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="text-center py-4 px-4"><X className="h-4 w-4 mx-auto text-muted-foreground" /></td>
                  <td className="text-center py-4 px-4"><Check className="h-4 w-4 mx-auto text-green-500" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <Card className="bg-slate-900 text-white border-none">
            <CardContent className="p-12 text-center">
              <h2 className="text-3xl font-bold mb-4">
                Need a Custom Solution?
              </h2>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                For large organizations with specific requirements, we offer custom Enterprise plans 
                with dedicated support, SLA guarantees, and on-premise options.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" variant="secondary" className="h-12 px-8">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact Sales
                </Button>
                <Link href="/signup">
                  <Button size="lg" variant="ghost" className="h-12 px-8 text-white">
                    Start Free
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <span>© 2026 MozAssets by Mozetech</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-foreground">Privacy</Link>
              <Link href="#" className="hover:text-foreground">Terms</Link>
              <Link href="/" className="hover:text-foreground">Back to Home</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}