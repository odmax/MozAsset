import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { TransferForm } from '@/components/dashboard/transfer-form';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Transfer Asset | Asset Manager' };

export default async function TransferAssetPage({
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

  const [departments, locations, users] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: 'asc' } }),
    prisma.location.findMany({ orderBy: { name: 'asc' } }),
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
