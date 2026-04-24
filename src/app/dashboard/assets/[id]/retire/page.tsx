import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { RetireForm } from '@/components/dashboard/retire-form';
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

export const metadata = { title: 'Retire Asset | Asset Manager' };

export default async function RetireAssetPage({
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
