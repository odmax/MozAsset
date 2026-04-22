'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Package, AlertCircle } from 'lucide-react';
import { deleteCategory } from '@/lib/actions';

interface CategoryWithCount {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  _count: { assets: number };
}

interface CategoriesClientProps {
  initialCategories: CategoryWithCount[];
  canManage: boolean;
}

export function CategoriesClient({ initialCategories, canManage }: CategoriesClientProps) {
  const router = useRouter();
  const [categories, setCategories] = useState(initialCategories);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithCount | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!selectedCategory) return;
    setLoading(true);
    try {
      await deleteCategory(selectedCategory.id);
      setDeleteDialogOpen(false);
      setSelectedCategory(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete category');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (category: CategoryWithCount) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  if (categories.length === 0) return null;

  return (
    <>
      {error && (
        <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <Card key={category.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{category.name}</CardTitle>
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                {category.description || 'No description'}
              </p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary">
                  {category._count.assets} asset{category._count.assets !== 1 ? 's' : ''}
                </Badge>
                {canManage && (
                  <div className="flex gap-1">
                    <Link href={`/dashboard/categories/${category.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500"
                      onClick={() => openDeleteDialog(category)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"?
              {selectedCategory && selectedCategory._count.assets > 0 && (
                <span className="block mt-2 text-red-500">
                  This category has {selectedCategory._count.assets} asset(s). 
                  Please reassign or delete them first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            {selectedCategory && selectedCategory._count.assets === 0 && (
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Category'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}