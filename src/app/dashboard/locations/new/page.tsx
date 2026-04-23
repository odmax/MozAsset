import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { LocationForm } from '@/components/dashboard/location-form';
import { BackLink } from '@/components/ui/back-button';

export default async function NewLocationPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/locations" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Add Location</h1>
        <p className="text-muted-foreground">Create a new location</p>
      </div>
      <LocationForm departments={departments} />
    </div>
  );
}
