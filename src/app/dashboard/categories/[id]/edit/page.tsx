import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { CategoryForm } from '@/components/dashboard/category-form';
import { BackLink } from '@/components/ui/back-button';

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return null;

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
