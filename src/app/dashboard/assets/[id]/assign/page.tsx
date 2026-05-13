import { getSimpleUserSession } from '@/lib/customer-session';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { AssignForm } from '@/components/dashboard/assign-form';
import { BackLink } from '@/components/ui/back-button';

export const metadata = { title: 'Assign Asset | Asset Manager' };

export default async function AssignAssetPage({
  params,
}: {
  params: { id: string };
}) {
  const user = getSimpleUserSession();
  if (!user) redirect('/login');

  const orgId = user.organizationId || '';

  const asset = await prisma.asset.findFirst({
    where: { id: params.id, organizationId: orgId },
    include: { department: true },
  });

  if (!asset) {
    notFound();
  }

  const users = await prisma.user.findMany({
    where: { organizationId: orgId, isActive: true },
    select: { id: true, name: true, email: true, department: { select: { name: true } } },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <BackLink href={`/dashboard/assets/${params.id}`} />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Assign Asset</h1>
        <p className="text-muted-foreground">
          Assign {asset.assetTag} - {asset.name}
        </p>
      </div>

      <AssignForm
        assetId={asset.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name || 'Unknown',
          email: u.email,
          department: u.department?.name,
        }))}
      />
    </div>
  );
}
