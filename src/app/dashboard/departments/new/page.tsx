import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DepartmentForm } from '@/components/dashboard/department-form';
import { BackLink } from '@/components/ui/back-button';

export default async function NewDepartmentPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

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
