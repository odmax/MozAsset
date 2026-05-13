import { getSimpleUserSession } from '@/lib/customer-session';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { RetireForm } from '@/components/dashboard/retire-form';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Retire Asset | Asset Manager' };

export default async function RetireAssetPage({
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
