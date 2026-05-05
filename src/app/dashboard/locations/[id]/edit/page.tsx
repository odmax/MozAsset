import { notFound } from 'next/navigation';
import { LocationForm } from '@/components/dashboard/location-form';
import { BackLink } from '@/components/ui/back-button';
import { getCurrentUserContext } from '@/lib/user-context';
import prisma from '@/lib/prisma';

export default async function EditLocationPage({ params }: { params: { id: string } }) {
  const context = await getCurrentUserContext();
  if (!context) return null;

  const where: any = { id: params.id };
  if (!context.isInternalAdmin) {
    where.organizationId = context.organizationId || 'never-match';
  }

  const location = await prisma.location.findUnique({ where });
  if (!location) notFound();

  const deptWhere: any = {};
  if (!context.isInternalAdmin) {
    deptWhere.organizationId = context.organizationId || 'never-match';
  }

  const departments = await prisma.department.findMany({ where: deptWhere, orderBy: { name: 'asc' }, select: { id: true, name: true } });

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
