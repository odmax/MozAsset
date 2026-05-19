import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { CategoriesClient } from '@/components/dashboard/categories-client';
import { getCurrentUserContext } from '@/lib/user-context';
import prisma from '@/lib/prisma';

export const metadata = { title: 'Categories | Asset Manager' };

export default async function CategoriesPage() {
  const context = await getCurrentUserContext();
  if (!context?.userId) return null;

  const canManage = ['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role);
  const isPlatformAdmin = context.isPlatformAdmin || context.isInternalAdmin;

  const categories = await prisma.category.findMany({
    where: isPlatformAdmin ? {} : { organizationId: context.organizationId },
    orderBy: { name: 'asc' },
    include: { _count: { select: { assets: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage asset categories
          </p>
        </div>
        {canManage && (
          <Link href="/dashboard/categories/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </Link>
        )}
      </div>

      <CategoriesClient initialCategories={categories} canManage={canManage} />
    </div>
  );
}
