import { notFound } from 'next/navigation';
import { UserForm } from '@/components/dashboard/user-form';
import { BackLink } from '@/components/ui/back-button';
import { getCurrentUserContext } from '@/lib/user-context';
import prisma from '@/lib/prisma';

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const context = await getCurrentUserContext();
  if (!context) return null;

  const userWhere: any = { id: params.id };
  if (!context.isInternalAdmin) {
    userWhere.organizationId = context.organizationId || 'never-match';
  }

  const user = await prisma.user.findUnique({ where: userWhere, select: { id: true, name: true, email: true, role: true, departmentId: true, isActive: true } });
  if (!user) notFound();

  const deptWhere: any = {};
  if (!context.isInternalAdmin) {
    deptWhere.organizationId = context.organizationId || 'never-match';
  }

  const departments = await prisma.department.findMany({ where: deptWhere, orderBy: { name: 'asc' }, select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/users" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Edit User</h1>
        <p className="text-muted-foreground">Update user details</p>
      </div>
      <UserForm user={user} departments={departments} isEdit />
    </div>
  );
}
