import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Package, 
  TrendingUp, 
  Shield, 
  Users, 
  BarChart3, 
  Download,
  Check,
  ChevronRight,
  Star,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Full Asset Tracking',
    description: 'Track every asset from acquisition to disposal with complete lifecycle management.'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Get insights with detailed reports on asset utilization, costs, and more.'
  },
  {
    icon: TrendingUp,
    title: 'Maintenance Scheduling',
    description: 'Schedule and track maintenance to extend asset lifespan and reduce downtime.'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Assign assets to team members with full audit trail and accountability.'
  },
  {
    icon: Shield,
    title: 'Security & Compliance',
    description: 'Maintain compliance with detailed audit logs and access controls.'
  },
  {
    icon: Download,
    title: 'Export & Integration',
    description: 'Export data to CSV or integrate with your existing systems.'
  }
];

const plans = [
  {
    name: 'Free',
    price: 'R0',
    description: 'Perfect for getting started',
    features: [
      'Up to 50 assets',
      '1 department',
      '1 location',
      'Basic reports',
      'Community support'
    ],
    cta: 'Start Free',
    href: '/signup',
    popular: false
  },
  {
    name: 'Pro',
    price: 'R149',
    period: '/mo',
    description: 'For growing businesses',
    features: [
      'Up to 1,000 assets',
      'Unlimited departments',
      'Unlimited locations',
      'Full reports & exports',
      'Maintenance tracking',
      'Stock verification',
      'Priority support'
    ],
    cta: 'Upgrade to Pro',
    href: '/signup?plan=pro',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'R599',
    period: '/mo',
    description: 'For large organizations',
    features: [
      'Unlimited assets',
      'Multi-branch support',
      'API access',
      'Advanced controls',
      'Dedicated support',
      'SLA guarantee',
      'On-premise option'
    ],
    cta: 'Upgrade to Enterprise',
    href: '/contact',
    popular: false
  }
];

const howItWorks = [
  {
    step: '01',
    title: 'Sign Up',
    description: 'Create your account in seconds. No credit card required.'
  },
  {
    step: '02',
    title: 'Add Assets',
    description: 'Import your existing assets or add new ones manually.'
  },
  {
    step: '03',
    title: 'Track & Manage',
    description: 'Assign, maintain, and track your assets in one place.'
  }
];

const faqs = [
  {
    question: 'How many assets can I track?',
    answer: 'It depends on your plan. Free includes up to 50 assets, Pro up to 1,000, and Enterprise is unlimited.'
  },
  {
    question: 'Can I export my data?',
    answer: 'Yes! All plans include export capabilities. Pro and Enterprise get full export features.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We use enterprise-grade security with encryption at rest and in transit.'
  },
  {
    question: 'Can I change plans later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time from your dashboard.'
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 font-bold text-xl">
              <Package className="h-6 w-6 text-primary" />
              <span>MozAssets</span>
            </Link>
            
            <nav className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Features
              </Link>
              <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                How it Works
              </Link>
              <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Pricing
              </Link>
            </nav>

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

      {/* Hero Section */}
      <section className="pt-32 pb-20 md:pt-40 md:pb-32 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Star className="h-4 w-4" />
              <span>The #1 Asset Management Solution</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Track & Manage Your Assets
              <span className="text-primary"> Effortlessly</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The complete solution for tracking, maintaining, and optimizing your organization's assets. 
              From acquisition to disposal, we've got you covered.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/signup">
                <Button size="lg" className="h-12 px-8">
                  Start Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="h-12 px-8">
                  See Features
                </Button>
              </Link>
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              No credit card required • Free plan includes 50 assets
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Manage Assets
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help businesses of all sizes track, maintain, and optimize their assets.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <Card key={i} className="border-none shadow-none bg-slate-50">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-lg text-muted-foreground">
              Three simple steps to better asset management
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {howItWorks.map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-muted-foreground">
              Choose the plan that fits your needs. Start free, upgrade anytime.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <Card 
                key={i} 
                className={`relative ${plan.popular ? 'border-primary ring-2 ring-primary' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.period && (
                        <span className="text-muted-foreground">{plan.period}</span>
                      )}
                    </div>
                    <p className="text-muted-foreground mt-2">{plan.description}</p>
                  </div>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-3">
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link href={plan.href} className="block">
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {faqs.map((faq, i) => (
              <div key={i} className="text-left">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of businesses managing their assets better.
          </p>
          <Link href="/signup">
            <Button size="lg" variant="secondary" className="h-12 px-8">
              Start Free Today
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900 text-slate-400">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 font-bold text-white mb-2">
                <Package className="h-6 w-6" />
                <span>MozAssets</span>
              </div>
              <p className="text-xs text-muted-foreground">by Mozetech</p>
              <p className="text-sm">
                The complete solution for tracking, maintaining, and optimizing your organization's assets.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Docs</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Careers</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 text-sm text-center">
            <p>© 2026 MozAssets by Mozetech. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}