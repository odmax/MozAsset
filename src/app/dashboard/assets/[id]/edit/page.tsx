import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { AssetForm } from '@/components/dashboard/asset-form';
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

export const metadata = { title: 'Edit Asset | Asset Manager' };

export default async function EditAssetPage({
  params,
}: {
  params: { id: string };
}) {
  const user = getSessionUser();
  if (!user) redirect('/login');

  const asset = await prisma.asset.findUnique({
    where: { id: params.id },
  });

  if (!asset) {
    notFound();
  }

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
        <BackLink href={`/dashboard/assets/${params.id}`} />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Edit Asset</h1>
        <p className="text-muted-foreground">
          Update asset information for {asset.assetTag}
        </p>
      </div>

      <AssetForm
        categories={categories}
        departments={departments}
        locations={locations}
        vendors={vendors}
        users={users.map((u) => ({ ...u, name: u.name || 'Unknown' }))}
        initialData={{
          assetTag: asset.assetTag,
          name: asset.name,
          description: asset.description || undefined,
          serialNumber: asset.serialNumber || undefined,
          model: asset.model || undefined,
          brand: asset.brand || undefined,
          status: asset.status,
          condition: asset.condition,
          categoryId: asset.categoryId || undefined,
          locationId: asset.locationId || undefined,
          departmentId: asset.departmentId || undefined,
          assignedToId: asset.assignedToId || undefined,
          vendorId: asset.vendorId || undefined,
          purchaseDate: asset.purchaseDate || undefined,
          purchaseCost: asset.purchaseCost ? Number(asset.purchaseCost) : undefined,
          warrantyExpiry: asset.warrantyExpiry || undefined,
          notes: asset.notes || undefined,
        }}
        assetId={asset.id}
        isEdit
      />
    </div>
  );
}
