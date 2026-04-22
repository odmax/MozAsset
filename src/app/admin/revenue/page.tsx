'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CreditCard
} from 'lucide-react';

interface RevenueData {
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  mrr: number;
  arr: number;
  revenueByPlan: Array<{ plan: string; revenue: number }>;
  revenueOverTime: Array<{ month: string; revenue: number }>;
  planDistribution: Array<{ plan: string; count: number }>;
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, []);

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/revenue');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error('Error fetching revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Revenue</h1>
        <p className="text-muted-foreground">Financial overview and analytics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(data?.totalRevenue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(data?.monthlyRevenue || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(data?.mrr || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ARR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatAmount(data?.arr || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.revenueByPlan?.length ? (
              <div className="space-y-3">
                {data.revenueByPlan.map((item) => (
                  <div key={item.plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.plan}</Badge>
                    </div>
                    <div className="font-medium">{formatAmount(item.revenue)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No revenue data</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Plan Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {data?.planDistribution?.length ? (
              <div className="space-y-3">
                {data.planDistribution.map((item) => (
                  <div key={item.plan} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{item.plan}</Badge>
                      <span className="text-muted-foreground">{item.count} users</span>
                    </div>
                    <div className="font-medium">
                      {((item.count / (data.planDistribution.reduce((s, d) => s + d.count, 0) || 1)) * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No plan data</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.revenueOverTime?.length ? (
            <div className="h-64 flex items-end gap-2">
              {data.revenueOverTime.map((item, index) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className="w-full bg-primary rounded-t" 
                    style={{ 
                      height: `${Math.max(
                        (item.revenue / (Math.max(...data.revenueOverTime.map(r => r.revenue)) || 1)) * 200,
                        4
                      )}px` 
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{item.month}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No revenue history</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}