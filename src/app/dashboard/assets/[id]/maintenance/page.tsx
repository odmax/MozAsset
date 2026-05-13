import { getSimpleUserSession } from '@/lib/customer-session';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { MaintenanceForm } from '@/components/dashboard/maintenance-form';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Asset Maintenance | Asset Manager' };

export default async function MaintenancePage({
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

  const vendors = await prisma.vendor.findMany({
    where: { organizationId: orgId },
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/dashboard/assets/${params.id}`} />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Add Maintenance</h1>
        <p className="text-muted-foreground">
          Record maintenance for {asset.assetTag} - {asset.name}
        </p>
      </div>

      <MaintenanceForm assetId={asset.id} vendors={vendors} />
    </div>
  );
}
