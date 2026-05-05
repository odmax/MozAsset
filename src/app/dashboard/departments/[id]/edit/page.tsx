import { notFound, redirect } from 'next/navigation';
import { DepartmentForm } from '@/components/dashboard/department-form';
import { BackLink } from '@/components/ui/back-button';
import { getCurrentUserContext } from '@/lib/user-context';
import prisma from '@/lib/prisma';

export default async function EditDepartmentPage({ params }: { params: { id: string } }) {
  const context = await getCurrentUserContext();
  if (!context) redirect('/login');

  const where: any = { id: params.id };
  if (!context.isInternalAdmin) {
    where.organizationId = context.organizationId || 'never-match';
  }

  const department = await prisma.department.findUnique({ where });
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
