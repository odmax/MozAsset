import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { DepartmentForm } from '@/components/dashboard/department-form';
import { BackLink } from '@/components/ui/back-button';

export default async function EditDepartmentPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const department = await prisma.department.findUnique({ where: { id: params.id } });
  if (!department) notFound();

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/departments" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Edit Department</h1>
        <p className="text-muted-foreground">Update department details</p>
      </div>
      <DepartmentForm department={department} isEdit />
    </div>
  );
}
