import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Users } from 'lucide-react';
import Link from 'next/link';
import { UsersClient } from '@/components/dashboard/users-client';

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

export const metadata = { title: 'Users | Asset Manager' };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = getSessionUser();
  if (!user || user.role !== 'SUPER_ADMIN') return null;

  const page = Number(searchParams.page) || 1;
  const search = searchParams.search as string || '';
  const sortBy = searchParams.sortBy as string || 'name';
  const sortOrder = searchParams.sortOrder as 'asc' | 'desc' || 'asc';
  const limit = 10;

  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        _count: { select: { assets: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage system users and roles</p>
        </div>
        <Link href="/dashboard/users/new">
          <Button><Plus className="mr-2 h-4 w-4" />Add User</Button>
        </Link>
      </div>

      {users.length === 0 && !search ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No users yet</p>
            <Link href="/dashboard/users/new"><Button>Add your first user</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <UsersClient 
          initialUsers={users} 
          currentUserId={user.id}
          totalCount={total}
        />
      )}

      {users.length === 0 && search && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No users found matching "{search}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}