import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { RetireForm } from '@/components/dashboard/retire-form';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Retire Asset | Asset Manager' };

export default async function RetireAssetPage({
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

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/dashboard/assets/${params.id}`} />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Retire Asset</h1>
        <p className="text-muted-foreground">
          Retire or dispose of {asset.assetTag}
        </p>
      </div>

      <RetireForm
        assetId={asset.id}
        assetTag={asset.assetTag}
        assetName={asset.name}
      />
    </div>
  );
}
