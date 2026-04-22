import { auth } from '@/lib/auth';
import { CategoryForm } from '@/components/dashboard/category-form';
import { BackLink } from '@/components/ui/back-button';

export default async function NewCategoryPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/categories" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Add Category</h1>
        <p className="text-muted-foreground">Create a new asset category</p>
      </div>
      <CategoryForm />
    </div>
  );
}
