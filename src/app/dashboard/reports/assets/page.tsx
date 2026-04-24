import { cookies } from 'next/headers';
import type { Plan } from '@prisma/client';
import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Package, Filter, Crown } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getPlanDetails } from '@/lib/billing';
import { BackLink } from '@/components/ui/back-button';

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

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_REPAIR: 'bg-yellow-100 text-yellow-800',
  RETIRED: 'bg-gray-100 text-gray-800',
  DISPOSED: 'bg-red-100 text-red-800',
  LOST: 'bg-orange-100 text-orange-800',
};

export default async function AssetReportsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = getSessionUser();
  if (!user) return null;

  const canAccess = ['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role);
  if (!canAccess) return null;

  const userPlan = (user.plan || 'FREE') as Plan;
  const planDetails = getPlanDetails(userPlan);
  const canExport = planDetails.features.exports;

  // FREE users see locked card
  if (!canExport) {
    return (
      <div className="space-y-6">
        <BackLink href="/dashboard/reports" />
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Crown className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Advanced Asset Reports</CardTitle>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Get detailed asset analysis including status breakdowns, category summaries, and export capabilities.
            </p>
          </CardHeader>
          <CardContent className="text-center pt-0">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
              <span>Available on PRO and above</span>
            </div>
            <Link href="/billing">
              <Button>Upgrade to PRO</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // PRO/ENTERPRISE users see full report
  const page = Number(searchParams.page) || 1;
  const limit = 50;
  const status = searchParams.status as string || '';
  const categoryId = searchParams.categoryId as string || '';

  const where: any = {};
  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;

  const [assets, total, categories, totalValue] = await Promise.all([
    prisma.asset.findMany({
      where,
      include: {
        category: true,
        department: true,
        location: true,
        assignedTo: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.asset.count({ where }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.asset.aggregate({ _sum: { purchaseCost: true } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Asset Report</h1>
          <p className="text-muted-foreground">Complete asset inventory report</p>
        </div>
        <Link href={`/api/export/assets?status=${status}&categoryId=${categoryId}`}>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Assets</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Value</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(totalValue._sum.purchaseCost || 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Available</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{assets.filter(a => a.status === 'AVAILABLE').length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Assigned</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{assets.filter(a => a.status === 'ASSIGNED').length}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Asset List ({total})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex gap-2 mb-4">
            <select name="status" defaultValue={status} className="px-3 py-2 border rounded-md text-sm">
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_REPAIR">In Repair</option>
              <option value="RETIRED">Retired</option>
              <option value="DISPOSED">Disposed</option>
            </select>
            <select name="categoryId" defaultValue={categoryId} className="px-3 py-2 border rounded-md text-sm">
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <Button type="submit" variant="secondary" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </form>

          <div className="rounded-md border">
            <div className="grid grid-cols-7 gap-2 p-3 font-medium text-sm bg-muted/50">
              <div>Asset Tag</div>
              <div>Name</div>
              <div>Category</div>
              <div>Status</div>
              <div>Assigned To</div>
              <div>Location</div>
              <div>Value</div>
            </div>
            {assets.map(asset => (
              <div key={asset.id} className="grid grid-cols-7 gap-2 p-3 border-t text-sm">
                <div className="font-medium">{asset.assetTag}</div>
                <div>{asset.name}</div>
                <div>{asset.category?.name || '-'}</div>
                <div><Badge className={statusColors[asset.status]}>{asset.status}</Badge></div>
                <div>{asset.assignedTo?.name || '-'}</div>
                <div>{asset.location?.name || asset.department?.name || '-'}</div>
                <div>{asset.purchaseCost ? formatCurrency(asset.purchaseCost) : '-'}</div>
              </div>
            ))}
            {assets.length === 0 && <div className="p-8 text-center text-muted-foreground">No assets found</div>}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                {page > 1 && <Link href={`?page=${page - 1}`}><Button variant="outline" size="sm">Previous</Button></Link>}
                {page < totalPages && <Link href={`?page=${page + 1}`}><Button variant="outline" size="sm">Next</Button></Link>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}