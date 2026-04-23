import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { AssetForm } from '@/components/dashboard/asset-form';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Add Asset | Asset Manager' };

export default async function NewAssetPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

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
