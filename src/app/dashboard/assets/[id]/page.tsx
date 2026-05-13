import { getSimpleUserSession } from '@/lib/customer-session';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getAsset } from '../actions';
import { AssetDetail } from '@/components/dashboard/asset-detail';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Asset Details | Asset Manager' };

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = getSimpleUserSession();
  if (!user) redirect('/login');

  const orgId = user.organizationId || '';

  const asset = await getAsset(params.id);
  if (!asset) {
    notFound();
  }

  const canManage = ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER'].includes(user.role);

  const [categories, departments, locations, vendors, users] = await Promise.all([
    prisma.category.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } }),
    prisma.department.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } }),
    prisma.location.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } }),
    prisma.vendor.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <BackLink href="/dashboard/assets" />
      <AssetDetail
        asset={asset}
        canManage={canManage}
        categories={categories}
        departments={departments}
        locations={locations}
        vendors={vendors}
        users={users.map((u) => ({ ...u, name: u.name || 'Unknown' }))}
      />
    </div>
  );
}
