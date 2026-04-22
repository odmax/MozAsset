import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { MaintenanceForm } from '@/components/dashboard/maintenance-form';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Add Maintenance | Asset Manager' };

export default async function MaintenancePage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) return null;

  const asset = await prisma.asset.findUnique({
    where: { id: params.id },
  });

  if (!asset) {
    notFound();
  }

  const vendors = await prisma.vendor.findMany({
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
