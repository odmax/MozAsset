import { getSimpleUserSession } from '@/lib/customer-session';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { AssetForm } from '@/components/dashboard/asset-form';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Add Asset | Asset Manager' };

export default async function NewAssetPage() {
  const user = getSimpleUserSession();
  if (!user) redirect('/login');

  const orgId = user.organizationId || '';

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
      <div>
        <BackLink href="/dashboard/assets" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Add New Asset</h1>
        <p className="text-muted-foreground">
          Create a new asset in the inventory
        </p>
      </div>

      <AssetForm
        categories={categories}
        departments={departments}
        locations={locations}
        vendors={vendors}
        users={users.map((u) => ({ ...u, name: u.name || 'Unknown' }))}
      />
    </div>
  );
}
