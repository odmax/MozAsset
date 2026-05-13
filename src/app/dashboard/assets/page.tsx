import { getSimpleUserSession } from '@/lib/customer-session';
import prisma from '@/lib/prisma';
import { getAssets } from './actions';
import { AssetList } from '@/components/dashboard/asset-list';
import { AssetFilters } from '@/components/dashboard/asset-filters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AdContainer } from '@/components/ad-container';

export const metadata = { title: 'Assets | Asset Manager' };

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = getSimpleUserSession();
  if (!user) redirect('/login');

  const orgId = user.organizationId || '';
  const canManage = user.role === 'SUPER_ADMIN' || user.role === 'ASSET_MANAGER' || user.role === 'DEPARTMENT_MANAGER';

  const page = Number(searchParams.page) || 1;
  const search = searchParams.search as string || '';
  const status = (searchParams.status as string) || '';
  const condition = (searchParams.condition as string) || '';
  const categoryId = searchParams.categoryId as string || '';
  const departmentId = searchParams.departmentId as string || '';
  const sortBy = searchParams.sortBy as string || 'createdAt';
  const sortOrder = searchParams.sortOrder as 'asc' | 'desc' || 'desc';

  const [{ data: assets, total, totalPages }, categories, departments] = await Promise.all([
    getAssets({ page, limit: 10, search, status, condition, categoryId, departmentId, sortBy, sortOrder }),
    prisma.category.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } }),
    prisma.department.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assets</h1>
          <p className="text-muted-foreground">
            Manage and track your organization&apos;s assets
          </p>
        </div>
        {canManage && (
          <Link href="/dashboard/assets/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <AssetFilters
            categories={categories}
            departments={departments}
            canManage={canManage}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Assets ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <AssetList
            assets={assets}
            totalPages={totalPages}
            currentPage={page}
            canManage={canManage}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </CardContent>
      </Card>

      <AdContainer position="inline" userPlan={user.plan || 'FREE'} />
    </div>
  );
}
