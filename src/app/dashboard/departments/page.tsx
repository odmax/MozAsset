import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Building2 } from 'lucide-react';
import Link from 'next/link';
import { DepartmentsClient } from '@/components/dashboard/departments-client';

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

export const metadata = { title: 'Departments | Asset Manager' };

export default async function DepartmentsPage() {
  const user = getSessionUser();
  if (!user) return null;

  const canManage = ['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role);

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { users: true, assets: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
          <p className="text-muted-foreground">Manage organizational departments</p>
        </div>
        {canManage && (
          <Link href="/dashboard/departments/new">
            <Button><Plus className="mr-2 h-4 w-4" />Add Department</Button>
          </Link>
        )}
      </div>

      <DepartmentsClient initialDepartments={departments.map(d => ({ ...d, manager: null }))} canManage={canManage} />

      {departments.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No departments yet</p>
            {canManage && <Link href="/dashboard/departments/new"><Button>Add your first department</Button></Link>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
