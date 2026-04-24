import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { AssignForm } from '@/components/dashboard/assign-form';
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

export const metadata = { title: 'Assign Asset | Asset Manager' };

export default async function AssignAssetPage({
  params,
}: {
  params: { id: string };
}) {
  const user = getSessionUser();
  if (!user) redirect('/login');

  const asset = await prisma.asset.findUnique({
    where: { id: params.id },
    include: { department: true },
  });

  if (!asset) {
    notFound();
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
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
