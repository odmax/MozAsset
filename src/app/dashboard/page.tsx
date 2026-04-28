import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Wrench,
  Archive,
  DollarSign,
  Crown,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AssetStatus } from '@prisma/client';
import { StatusPieChart, DepartmentBarChart, CategoryBarChart } from '@/components/dashboard/charts';
import { UpgradePlanModal } from '@/components/plan/UpgradePlanModal';
import { UpgradeButton } from '@/components/dashboard/UpgradeButton';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
  return null;
}

async function getDashboardData() {
  const [
    totalAssets,
    availableAssets,
    assignedAssets,
    inRepairAssets,
    retiredAssets,
    assetsByCategory,
    assetsByDepartment,
    assetsByStatus,
    totalValue,
    expiringWarranties,
    recentActivity,
  ] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { status: AssetStatus.AVAILABLE } }),
    prisma.asset.count({ where: { status: AssetStatus.ASSIGNED } }),
    prisma.asset.count({ where: { status: AssetStatus.IN_REPAIR } }),
    prisma.asset.count({ where: { status: AssetStatus.RETIRED } }),
    prisma.asset.groupBy({
      by: ['categoryId'],
      _count: true,
      where: { category: { isNot: null } },
    }),
    prisma.asset.groupBy({
      by: ['departmentId'],
      _count: true,
      where: { department: { isNot: null } },
    }),
    prisma.asset.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.asset.aggregate({
      _sum: { purchaseCost: true },
    }),
    prisma.asset.count({
      where: {
        warrantyExpiry: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        asset: { select: { assetTag: true, name: true } },
      },
    }),
  ]);

  const categories = await prisma.category.findMany({
    where: { id: { in: assetsByCategory.map((c) => c.categoryId).filter(Boolean) as string[] } },
    select: { id: true, name: true },
  });

  const departments = await prisma.department.findMany({
    where: { id: { in: assetsByDepartment.map((d) => d.departmentId).filter(Boolean) as string[] } },
    select: { id: true, name: true },
  });

  const categoryChartData = assetsByCategory.map((c) => {
    const cat = categories.find((cat) => cat.id === c.categoryId);
    return { name: cat?.name || 'Uncategorized', value: c._count };
  });

  const departmentChartData = assetsByDepartment.map((d) => {
    const dept = departments.find((dept) => dept.id === d.departmentId);
    return { name: dept?.name || 'Unassigned', value: d._count };
  });

  const statusChartData = assetsByStatus.map((s) => ({
    name: s.status,
    value: s._count,
    color: s.status === 'AVAILABLE' ? '#22c55e' :
           s.status === 'ASSIGNED' ? '#3b82f6' :
           s.status === 'IN_REPAIR' ? '#f59e0b' : '#6b7280',
  }));

  return {
    totalAssets,
    availableAssets,
    assignedAssets,
    inRepairAssets,
    retiredAssets,
    categoryChartData,
    departmentChartData,
    statusChartData,
    totalValue: totalValue._sum.purchaseCost || 0,
    expiringWarranties,
    recentActivity,
  };
}

export default async function DashboardPage() {
  const user = getSessionUser();
  
  if (!user) {
    redirect('/login');
  }
  
  const plan = user.plan || 'FREE';
  const showAds = plan === 'FREE';
  
  try {
    const data = await getDashboardData();
    
    const stats = [
      { title: 'Total Assets', value: data.totalAssets, icon: Package, color: 'text-blue-600' },
      { title: 'Available', value: data.availableAssets, icon: CheckCircle, color: 'text-green-600' },
      { title: 'Assigned', value: data.assignedAssets, icon: TrendingUp, color: 'text-blue-600' },
      { title: 'In Repair', value: data.inRepairAssets, icon: Wrench, color: 'text-yellow-600' },
      { title: 'Retired', value: data.retiredAssets, icon: Archive, color: 'text-gray-600' },
      { title: 'Total Value', value: formatCurrency(data.totalValue), icon: DollarSign, color: 'text-purple-600' },
    ];
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {user.name || user.email}
            </p>
          </div>
          <Link href="/dashboard/assets/new">
            <Button>
              <Package className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </Link>
        </div>

        {!showAds && plan !== 'FREE' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="flex items-center gap-4 p-4">
              <Crown className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  {plan === 'ENTERPRISE' ? 'Enterprise Plan' : 'Pro Plan'} Active
                </p>
                <p className="text-sm text-green-700">
                  You have access to all premium features
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {showAds && <UpgradeButton userPlan={plan} />}

        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  <span className="text-sm text-muted-foreground">{stat.title}</span>
                </div>
                <p className="text-2xl font-bold mt-2">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Assets by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <CategoryBarChart data={data.categoryChartData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assets by Department</CardTitle>
            </CardHeader>
            <CardContent>
              <DepartmentBarChart data={data.departmentChartData} />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Assets by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusPieChart data={data.statusChartData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.recentActivity.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No recent activity</p>
                ) : (
                  data.recentActivity.slice(0, 10).map((log: any) => (
                    <div key={log.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium">
                          {log.user?.name?.charAt(0) || log.user?.email?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{log.user?.name || log.user?.email}</span>
                          {' '}{log.action.toLowerCase()} 
                          {log.asset && (
                            <Link href={`/dashboard/assets/${log.assetId}`} className="text-primary hover:underline">
                              {log.asset.name}
                            </Link>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {data.expiringWarranties > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">
                  {data.expiringWarranties} asset(s) have warranties expiring in the next 30 days
                </p>
                <Link href="/dashboard/assets?warranty=expiring" className="text-sm text-yellow-700 hover:underline">
                  View assets
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  } catch (error) {
    console.error('Dashboard error:', error);
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500">Failed to load dashboard data</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
