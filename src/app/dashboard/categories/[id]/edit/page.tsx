import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { notFound, redirect } from 'next/navigation';
import { CategoryForm } from '@/components/dashboard/category-form';
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

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const user = getSessionUser();
  if (!user) redirect('/login');

  const category = await prisma.category.findUnique({ where: { id: params.id } });
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/categories" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Edit Category</h1>
        <p className="text-muted-foreground">Update category details</p>
      </div>
      <CategoryForm category={category} isEdit />
    </div>
  );
}
