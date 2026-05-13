import prisma from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Crown } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/utils';
import { BackLink } from '@/components/ui/back-button';
import { getCurrentUserContext } from '@/lib/user-context';
import { getPlanDetails } from '@/lib/billing';
import type { Plan } from '@prisma/client';

export default async function MaintenanceReportsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const context = await getCurrentUserContext();
  if (!context) return null;

  const canAccess = ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'].includes(context.role);
  if (!canAccess) return null;

  const userPlan = (context.plan || 'FREE') as Plan;
  const planDetails = getPlanDetails(userPlan);
  const canViewReport = planDetails.features.advancedReports;

  if (!canViewReport) {
    return (
      <div className="space-y-6">
        <BackLink href="/dashboard/reports" />
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Crown className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Maintenance Reports</CardTitle>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Get detailed maintenance history, cost analysis, and export capabilities.
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

  const page = Number(searchParams.page) || 1;
  const limit = 50;
  const type = searchParams.type as string || '';

  const where: any = {};
  if (!context.isInternalAdmin) {
    where.asset = { organizationId: context.organizationId || 'never-match' };
  }
  if (type) where.type = type;

  const [maintenances, total, totalCost, byType] = await Promise.all([
    prisma.maintenance.findMany({
      where,
      include: {
        asset: { select: { assetTag: true, name: true } },
        performedByUser: { select: { name: true } },
      },
      orderBy: { performedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.maintenance.count({ where }),
    prisma.maintenance.aggregate({ _sum: { cost: true }, where }),
    prisma.maintenance.groupBy({ by: ['type'], _count: true, _sum: { cost: true }, where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <BackLink href="/dashboard/reports" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance Report</h1>
          <p className="text-muted-foreground">Maintenance history and costs</p>
        </div>
        <Link href="/api/export/maintenance">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Records</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{total}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Cost</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-600">{formatCurrency(totalCost._sum.cost || 0)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Repairs</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{byType.find(t => t.type === 'REPAIR')?._count || 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inspections</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{byType.find(t => t.type === 'INSPECTION')?._count || 0}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {byType.map(t => (
          <Card key={t.type}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{t.type}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{t._count}</span>
                <span className="text-muted-foreground">{formatCurrency(t._sum.cost || 0)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Maintenance Records ({total})</CardTitle></CardHeader>
        <CardContent>
          <form className="flex gap-2 mb-4">
            <select name="type" defaultValue={type} className="px-3 py-2 border rounded-md text-sm">
              <option value="">All Types</option>
              <option value="REPAIR">Repair</option>
              <option value="INSPECTION">Inspection</option>
              <option value="CALIBRATION">Calibration</option>
              <option value="CLEANING">Cleaning</option>
              <option value="UPGRADE">Upgrade</option>
            </select>
            <Button type="submit" variant="secondary" size="sm">Filter</Button>
          </form>

          <div className="rounded-md border">
            <div className="grid grid-cols-6 gap-2 p-3 font-medium text-sm bg-muted/50">
              <div>Date</div>
              <div>Asset</div>
              <div>Type</div>
              <div>Performed By</div>
              <div>Cost</div>
              <div>Description</div>
            </div>
            {maintenances.map(m => (
              <div key={m.id} className="grid grid-cols-6 gap-2 p-3 border-t text-sm">
                <div className="text-muted-foreground">{formatDate(m.performedAt)}</div>
                <div className="font-medium">{m.asset?.assetTag || '-'}</div>
                <div><Badge variant="outline">{m.type}</Badge></div>
                <div>{m.performedByUser?.name || '-'}</div>
                <div>{m.cost ? formatCurrency(m.cost) : '-'}</div>
                <div className="truncate max-w-[200px]">{m.description}</div>
              </div>
            ))}
            {maintenances.length === 0 && <div className="p-8 text-center text-muted-foreground">No maintenance records</div>}
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