import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DepartmentForm } from '@/components/dashboard/department-form';
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

export default async function NewDepartmentPage() {
  const user = getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/departments" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Add Department</h1>
        <p className="text-muted-foreground">Create a new department</p>
      </div>
      <DepartmentForm />
    </div>
  );
}
