'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  DollarSign, 
  Wrench, 
  AlertTriangle,
  Activity,
  Crown
} from 'lucide-react';
import { ReportsAd } from '@/components/dashboard/ads';

export default function ReportsPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userPlan, setUserPlan] = useState('FREE');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reports/access')
      .then(res => {
        if (res.ok) {
          setIsAuthorized(true);
          res.json().then(data => setUserPlan(data.plan || 'FREE'));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analytics and reporting dashboard</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-4 bg-muted rounded w-1/2"></div></CardHeader>
              <CardContent><div className="h-20 bg-muted rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Analytics and reporting dashboard</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Access Restricted</h3>
            <p className="text-muted-foreground">
              Only Super Admin and Asset Manager roles can access reports.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const reportCards = [
    {
      title: 'Asset Overview',
      description: 'Comprehensive overview with charts, status, and activity',
      href: '/dashboard/reports/overview',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Asset List',
      description: 'Complete inventory report with all assets, their status, and assignments',
      href: '/dashboard/reports/assets',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Financial Report',
      description: 'Purchase costs, depreciation estimates, and asset value analysis',
      href: '/dashboard/reports/financial',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Maintenance Report',
      description: 'Maintenance history, costs, and upcoming scheduled maintenance',
      href: '/dashboard/reports/maintenance',
      icon: Wrench,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Audit Logs',
      description: 'Complete activity history with user actions and changes',
      href: '/dashboard/audit-logs',
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">Analytics and reporting dashboard</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {reportCards.map((report) => {
          const Icon = report.icon;
          return (
            <Link key={report.href} href={report.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-4 pb-2">
                  <div className={`p-2 rounded-lg ${report.bgColor}`}>
                    <Icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{report.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {userPlan === 'FREE' && <ReportsAd userPlan={userPlan} />}
    </div>
  );
}