'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench,
  DollarSign,
  Users,
  Building,
  MapPin,
  PackageX
} from 'lucide-react';
import { BackLink } from '@/components/ui/back-button';
import { formatCurrency } from '@/lib/utils';
import { StatusPieChart, DepartmentBarChart, CategoryBarChart } from '@/components/dashboard/charts';

interface OverviewData {
  totalAssets: number;
  totalValue: number;
  assetsByStatus: { name: string; value: number; color: string }[];
  assetsByCondition: { name: string; value: number; color: string }[];
  assetsByCategory: { name: string; value: number }[];
  assetsByDepartment: { name: string; value: number }[];
  assetsByLocation: { name: string; value: number }[];
  recentActivity: { id: string; action: string; description: string; date: string }[];
}

const statusColors: Record<string, string> = {
  AVAILABLE: '#22c55e',
  ASSIGNED: '#3b82f6',
  IN_REPAIR: '#f59e0b',
  RETIRED: '#6b7280',
  DISPOSED: '#ef4444',
  LOST: '#dc2626',
};

const conditionColors: Record<string, string> = {
  NEW: '#22c55e',
  GOOD: '#3b82f6',
  FAIR: '#f59e0b',
  POOR: '#ef4444',
  CONDEMNED: '#dc2626',
};

export default function AssetOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/reports/overview')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <BackLink href="/dashboard/reports" />
          <h1 className="text-3xl font-bold tracking-tight mt-2">Asset Overview</h1>
          <p className="text-muted-foreground">Comprehensive overview of your asset inventory</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div>
          <BackLink href="/dashboard/reports" />
          <h1 className="text-3xl font-bold tracking-tight mt-2">Asset Overview</h1>
          <p className="text-muted-foreground">Comprehensive overview of your asset inventory</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Unable to Load</h3>
            <p className="text-muted-foreground">{error || 'Please try again later'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/reports" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Asset Overview</h1>
        <p className="text-muted-foreground">Comprehensive overview of your asset inventory</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAssets}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.assetsByDepartment.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.assetsByLocation.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.assetsByStatus.length > 0 ? (
              <StatusPieChart data={data.assetsByStatus} />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No assets yet
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assets by Condition</CardTitle>
          </CardHeader>
          <CardContent>
            {data.assetsByCondition.length > 0 ? (
              <StatusPieChart data={data.assetsByCondition} />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No assets yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Assets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {data.assetsByCategory.length > 0 ? (
              <CategoryBarChart data={data.assetsByCategory} />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No assets yet
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Assets by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {data.assetsByDepartment.length > 0 ? (
              <DepartmentBarChart data={data.assetsByDepartment} />
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No assets yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {data.recentActivity && data.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest asset changes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.slice(0, 10).map(activity => (
                <div key={activity.id} className="flex items-center gap-4">
                  {activity.action === 'CREATE' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {activity.action === 'UPDATE' && <Clock className="h-4 w-4 text-blue-500" />}
                  {activity.action === 'TRANSFER' && <TrendingUp className="h-4 w-4 text-purple-500" />}
                  {activity.action === 'MAINTENANCE' && <Wrench className="h-4 w-4 text-orange-500" />}
                  {activity.action === 'RETIRE' && <PackageX className="h-4 w-4 text-gray-500" />}
                  <div className="flex-1">
                    <p className="text-sm">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}