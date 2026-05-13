import { getSimpleUserSession } from '@/lib/customer-session';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { TransferForm } from '@/components/dashboard/transfer-form';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Transfer Asset | Asset Manager' };

export default async function TransferAssetPage({
  params,
}: {
  params: { id: string };
}) {
  const user = getSimpleUserSession();
  if (!user) redirect('/login');

  const orgId = user.organizationId || '';

  const asset = await prisma.asset.findFirst({
    where: { id: params.id, organizationId: orgId },
  });

  if (!asset) {
    notFound();
  }

  const [departments, locations, users] = await Promise.all([
    prisma.department.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } }),
    prisma.location.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } }),
    prisma.user.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/dashboard/assets/${params.id}`} />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Transfer Asset</h1>
        <p className="text-muted-foreground">
          Transfer {asset.assetTag} - {asset.name}
        </p>
      </div>

      <TransferForm
        assetId={asset.id}
        departments={departments}
        locations={locations}
        users={users.map((u) => ({ ...u, name: u.name || 'Unknown' }))}
      />
    </div>
  );
}
