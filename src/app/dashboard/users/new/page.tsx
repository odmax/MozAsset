import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { UserForm } from '@/components/dashboard/user-form';
import { BackLink } from '@/components/ui/back-button';

export default async function NewUserPage() {
  const session = await auth();
  if (!session?.user) return null;

  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } });

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/users" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Add User</h1>
        <p className="text-muted-foreground">Create a new user</p>
      </div>
      <UserForm departments={departments} />
    </div>
  );
}
