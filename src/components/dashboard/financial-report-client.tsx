'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { DepartmentBarChart, StatusPieChart, CategoryBarChart } from '@/components/dashboard/charts';
import { FeatureLock } from '@/components/ui/feature-lock';
import { AdContainer } from '@/components/ad-container';

interface FinancialData {
  totalAssets: number;
  totalValue: number;
  categoryData: { name: string; value: number }[];
  departmentData: { name: string; value: number }[];
  statusData: { name: string; value: number; color: string }[];
  conditionData: { name: string; value: number }[];
  topValueAssets: { id: string; assetTag: string; name: string; purchaseCost: number | null; category?: { name: string } }[];
}

interface Props {
  userPlan: string;
}

export function FinancialReportClient({ userPlan }: Props) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/reports/financial-data')
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Report</h1>
            <p className="text-muted-foreground">Asset value analysis and financial overview</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader><div className="h-4 bg-muted rounded w-1/2"></div></CardHeader>
              <CardContent><div className="h-8 bg-muted rounded"></div></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const canAccessAdvanced = userPlan === 'PRO' || userPlan === 'ENTERPRISE';

  if (!data || error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Report</h1>
          <p className="text-muted-foreground">Asset value analysis and financial overview</p>
        </div>
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Unable to load report data
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Report</h1>
          <p className="text-muted-foreground">Asset value analysis and financial overview</p>
        </div>
        {canAccessAdvanced && (
          <Link href="/api/export/assets?financial=1">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Financial Data
            </Button>
          </Link>
        )}
      </div>

      {canAccessAdvanced ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Assets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.totalAssets}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(data.totalValue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Value/Asset</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.totalAssets > 0 ? formatCurrency(Number(data.totalValue) / data.totalAssets) : '-'}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.categoryData.length}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Value by Department</CardTitle></CardHeader>
              <CardContent>
                <DepartmentBarChart data={data.departmentData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Value by Category</CardTitle></CardHeader>
              <CardContent>
                <CategoryBarChart data={data.categoryData} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Assets by Status</CardTitle></CardHeader>
              <CardContent>
                <StatusPieChart data={data.statusData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Top 10 Assets by Value</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.topValueAssets.map((asset, i) => (
                    <div key={asset.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-6">{i + 1}.</span>
                        <span className="font-medium">{asset.assetTag}</span>
                        <span className="text-muted-foreground">({asset.name})</span>
                      </div>
                      <span className="font-medium">{formatCurrency(asset.purchaseCost || 0)}</span>
                    </div>
                  ))}
                  {data.topValueAssets.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No asset cost data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <FeatureLock
          featureName="Advanced Financial Reports"
          featureDescription="Get detailed financial analysis including value by department, value by category, top value assets, and export capabilities."
          requiredPlan="PRO"
          currentPlan={userPlan}
        />
      )}

      <AdContainer position="footer" userPlan={userPlan} />
    </div>
  );
}