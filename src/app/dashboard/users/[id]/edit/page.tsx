import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { UserForm } from '@/components/dashboard/user-form';
import { BackLink } from '@/components/ui/back-button';

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({ where: { id: params.id }, select: { id: true, name: true, email: true, role: true, departmentId: true, isActive: true } });
  if (!user) notFound();

  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });

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
