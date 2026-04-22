import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, Package, ArrowRight, Crown, Zap, Download, BarChart3, Users, Shield, Globe } from 'lucide-react';

const features = [
  {
    name: 'Asset Limit',
    free: '50',
    pro: '1,000',
    enterprise: 'Unlimited',
  },
  {
    name: 'Departments',
    free: '1',
    pro: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    name: 'Locations',
    free: '1',
    pro: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    name: 'Users',
    free: 'Unlimited',
    pro: 'Unlimited',
    enterprise: 'Unlimited',
  },
  {
    name: 'CSV Export',
    free: <X className="h-4 w-4 text-muted-foreground" />,
    pro: <Check className="h-4 w-4 text-green-500" />,
    enterprise: <Check className="h-4 w-4 text-green-500" />,
  },
  {
    name: 'Advanced Reports',
    free: <X className="h-4 w-4 text-muted-foreground" />,
    pro: <Check className="h-4 w-4 text-green-500" />,
    enterprise: <Check className="h-4 w-4 text-green-500" />,
  },
  {
    name: 'Stock Verification',
    free: <X className="h-4 w-4 text-muted-foreground" />,
    pro: <Check className="h-4 w-4 text-green-500" />,
    enterprise: <Check className="h-4 w-4 text-green-500" />,
  },
  {
    name: 'Maintenance Tracking',
    free: <Check className="h-4 w-4 text-green-500" />,
    pro: <Check className="h-4 w-4 text-green-500" />,
    enterprise: <Check className="h-4 w-4 text-green-500" />,
  },
  {
    name: 'Multi-branch',
    free: <X className="h-4 w-4 text-muted-foreground" />,
    pro: <X className="h-4 w-4 text-muted-foreground" />,
    enterprise: <Check className="h-4 w-4 text-green-500" />,
  },
  {
    name: 'API Access',
    free: <X className="h-4 w-4 text-muted-foreground" />,
    pro: <X className="h-4 w-4 text-muted-foreground" />,
    enterprise: <Check className="h-4 w-4 text-green-500" />,
  },
  {
    name: 'Priority Support',
    free: <X className="h-4 w-4 text-muted-foreground" />,
    pro: <Check className="h-4 w-4 text-green-500" />,
    enterprise: <Check className="h-4 w-4 text-green-500" />,
  },
  {
    name: 'SLA Guarantee',
    free: <X className="h-4 w-4 text-muted-foreground" />,
    pro: <X className="h-4 w-4 text-muted-foreground" />,
    enterprise: <Check className="h-4 w-4 text-green-500" />,
  },
];

const plans = [
  {
    name: 'Free',
    price: 'R0',
    period: 'forever',
    description: 'Perfect for small teams getting started.',
    popular: false,
  },
  {
    name: 'Pro',
    price: 'R149',
    period: '/mo',
    description: 'For growing businesses that need more power.',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'R599',
    period: '/mo',
    description: 'For large organizations with advanced needs.',
    popular: false,
  },
];

const reasons = [
  {
    icon: Package,
    title: 'More Assets',
    description: 'Move from 50 to 1,000 assets (or unlimited with Enterprise)'
  },
  {
    icon: Zap,
    title: 'Remove Ads',
    description: 'Enjoy an ad-free experience with no distractions'
  },
  {
    icon: Download,
    title: 'CSV Export',
    description: 'Export your asset data for analysis'
  },
  {
    icon: BarChart3,
    title: 'Advanced Reports',
    description: 'Get detailed financial analysis'
  },
  {
    icon: Users,
    title: 'Stock Verification',
    description: 'Verify physical inventory with scanning tools'
  },
  {
    icon: Shield,
    title: 'SLA Guarantee',
    description: 'Get enterprise-grade reliability and support'
  },
];

export default function UpgradePage() {
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
      <section className="pt-32 pb-16 bg-gradient-to-b from-purple-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium mb-6">
              <Crown className="h-4 w-4" />
              <span>Upgrade Your Plan</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Unlock the Full Power of{' '}
              <span className="text-purple-600">MozAssets</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Get more assets, remove ads, and access premium features with Pro.
            </p>
          </div>
        </div>
      </section>

      {/* Reasons to Upgrade */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">
            Why Upgrade to Pro?
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {reasons.map((reason, i) => (
              <Card key={i} className="bg-slate-50 border-none">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <reason.icon className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">{reason.title}</h3>
                  <p className="text-sm text-muted-foreground">{reason.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <Card 
                key={i} 
                className={`relative ${plan.popular ? 'border-purple-500 ring-2 ring-purple-500' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-sm font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-1 mt-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-muted-foreground">/{plan.period}</span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-2">{plan.description}</p>
                </CardHeader>
                <CardContent>
                  <Link 
                    href={plan.name === 'Free' ? '/signup' : plan.name === 'Pro' ? '/signup?plan=pro' : '/contact'}
                    className="block"
                  >
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.name === 'Free' ? 'Start Free' : plan.name === 'Pro' ? 'Upgrade to Pro' : 'Contact Sales'}
                      {plan.popular && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">
            Compare Plans
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full max-w-3xl mx-auto">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4 font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold">Free</th>
                  <th className="text-center py-4 px-4 font-semibold text-purple-600">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {features.map((feature, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 px-4">{feature.name}</td>
                    <td className="text-center py-3 px-4">{feature.free}</td>
                    <td className="text-center py-3 px-4 font-medium text-purple-600">{feature.pro}</td>
                    <td className="text-center py-3 px-4">{feature.enterprise}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-slate-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold mb-2">Can I cancel anytime?</h3>
              <p className="text-sm text-muted-foreground">Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold mb-2">What payment methods do you accept?</h3>
              <p className="text-sm text-muted-foreground">We accept all major credit cards, and Enterprise customers can pay via invoice.</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-sm text-muted-foreground">Yes! Pro includes a 14-day free trial. No credit card required to start.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              <span>© 2026 MozAssets</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
              <Link href="/login" className="hover:text-foreground">Login</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}