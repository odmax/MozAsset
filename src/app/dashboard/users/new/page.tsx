import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { UserForm } from '@/components/dashboard/user-form';
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

export default async function NewUserPage() {
  const user = getSessionUser();
  if (!user) redirect('/login');

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
