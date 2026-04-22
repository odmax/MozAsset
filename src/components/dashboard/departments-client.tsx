'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Edit, Trash2, Building2, Users, AlertCircle } from 'lucide-react';
import { deleteDepartment } from '@/lib/actions';

interface DepartmentWithCount {
  id: string;
  name: string;
  code: string;
  description: string | null;
  _count: { users: number; assets: number };
  manager: { id: string; name: string } | null;
}

interface DepartmentsClientProps {
  initialDepartments: DepartmentWithCount[];
  canManage: boolean;
}

export function DepartmentsClient({ initialDepartments, canManage }: DepartmentsClientProps) {
  const router = useRouter();
  const [departments, setDepartments] = useState(initialDepartments);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentWithCount | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!selectedDepartment) return;
    setLoading(true);
    try {
      await deleteDepartment(selectedDepartment.id);
      setDeleteDialogOpen(false);
      setSelectedDepartment(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete department');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (dept: DepartmentWithCount) => {
    setSelectedDepartment(dept);
    setDeleteDialogOpen(true);
  };

  if (departments.length === 0) return null;

  return (
    <>
      {error && (
        <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Card key={dept.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{dept.name}</CardTitle>
                </div>
                <Badge variant="outline">{dept.code}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{dept.description || 'No description'}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {dept._count.users} users</span>
                <span>{dept._count.assets} assets</span>
              </div>
              {dept.manager && (
                <p className="text-sm mb-3">Manager: {dept.manager.name}</p>
              )}
              {canManage && (
                <div className="flex gap-1">
                  <Link href={`/dashboard/departments/${dept.id}/edit`}>
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500"
                    onClick={() => openDeleteDialog(dept)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Department</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedDepartment?.name}"?
              {selectedDepartment && (selectedDepartment._count.users > 0 || selectedDepartment._count.assets > 0) && (
                <span className="block mt-2 text-red-500">
                  This department has {selectedDepartment._count.users} user(s) and {selectedDepartment._count.assets} asset(s). 
                  Please reassign them first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            {selectedDepartment && selectedDepartment._count.users === 0 && selectedDepartment._count.assets === 0 && (
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Department'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}