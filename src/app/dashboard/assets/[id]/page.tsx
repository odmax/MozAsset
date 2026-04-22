import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getAsset } from '../actions';
import { AssetDetail } from '@/components/dashboard/asset-detail';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Asset Details | Asset Manager' };

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) return null;

  const asset = await getAsset(params.id);
  if (!asset) {
    notFound();
  }

  const canManage = ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER'].includes(session.user.role);

  const [categories, departments, locations, vendors, users] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
    prisma.vendor.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { isActive: true },
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
