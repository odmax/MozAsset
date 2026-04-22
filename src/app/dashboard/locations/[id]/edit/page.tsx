import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { LocationForm } from '@/components/dashboard/location-form';
import { BackLink } from '@/components/ui/back-button';

export default async function EditLocationPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const location = await prisma.location.findUnique({ where: { id: params.id } });
  if (!location) notFound();

  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/locations" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Edit Location</h1>
        <p className="text-muted-foreground">Update location details</p>
      </div>
      <LocationForm location={location} departments={departments} isEdit />
    </div>
  );
}
