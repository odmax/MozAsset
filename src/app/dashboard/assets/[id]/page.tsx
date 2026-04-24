import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { getAsset } from '../actions';
import { AssetDetail } from '@/components/dashboard/asset-detail';
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

export const metadata = { title: 'Asset Details | Asset Manager' };

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = getSessionUser();
  if (!user) redirect('/login');

  const asset = await getAsset(params.id);
  if (!asset) {
    notFound();
  }

  const canManage = ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER'].includes(user.role);

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
