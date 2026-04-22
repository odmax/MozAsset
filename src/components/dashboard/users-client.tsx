'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Edit, Trash2, Users, Power, Key, AlertCircle, Search, ArrowUpDown, ArrowUp, ArrowDown 
} from 'lucide-react';
import Link from 'next/link';
import { deleteUser, toggleUserActive, resetUserPassword } from '@/lib/actions';
import { getInitials } from '@/lib/utils';

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800',
  ASSET_MANAGER: 'bg-purple-100 text-purple-800',
  DEPARTMENT_MANAGER: 'bg-blue-100 text-blue-800',
  EMPLOYEE: 'bg-green-100 text-green-800',
};

interface UserWithCount {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  department: { id: string; name: string } | null;
  _count: { assets: number };
}

interface UsersClientProps {
  initialUsers: UserWithCount[];
  currentUserId: string;
  totalCount: number;
}

export function UsersClient({ initialUsers, currentUserId, totalCount }: UsersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [users, setUsers] = useState(initialUsers);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Dialog states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithCount | null>(null);
  const [newPassword, setNewPassword] = useState('');
  
  // Filter & sort state
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'name');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const limit = 10;
  const totalPages = Math.ceil(totalCount / limit);

  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortBy(column);
    setSortOrder(newOrder);
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', column);
    params.set('sortOrder', newOrder);
    router.push(`/dashboard/users?${params.toString()}`);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-3 w-3 ml-1" />;
    return sortOrder === 'desc' ? <ArrowDown className="h-3 w-3 ml-1" /> : <ArrowUp className="h-3 w-3 ml-1" />;
  };

  // Delete
  const handleDelete = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await deleteUser(selectedUser.id);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Toggle active
  const handleToggleActive = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await toggleUserActive(selectedUser.id);
      setActivateDialogOpen(false);
      setSelectedUser(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await resetUserPassword(selectedUser.id, newPassword);
      setResetDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (user: UserWithCount) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const openActivateDialog = (user: UserWithCount) => {
    setSelectedUser(user);
    setActivateDialogOpen(true);
  };

  const openResetDialog = (user: UserWithCount) => {
    setSelectedUser(user);
    setResetDialogOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    params.set('page', '1');
    router.push(`/dashboard/users?${params.toString()}`);
  };

  const getSortValue = (user: UserWithCount, column: string) => {
    switch (column) {
      case 'name': return user.name || '';
      case 'email': return user.email;
      case 'role': return user.role;
      case 'department': return user.department?.name || '';
      case 'status': return user.isActive ? 'active' : 'inactive';
      default: return '';
    }
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = getSortValue(a, sortBy);
    const bVal = getSortValue(b, sortBy);
    const cmp = String(aVal).localeCompare(String(bVal));
    return sortOrder === 'asc' ? cmp : -cmp;
  });

  if (users.length === 0) return null;

  return (
    <>
      {error && (
        <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-[300px]"
        />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </form>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">
                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('name')}>
                  User {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('role')}>
                  Role {getSortIcon('role')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('department')}>
                  Department {getSortIcon('department')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('status')}>
                  Status {getSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead className="text-right">Assets</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{getInitials(user.name || user.email)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.name || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={roleColors[user.role]}>{user.role.replace('_', ' ')}</Badge>
                </TableCell>
                <TableCell>{user.department?.name || '-'}</TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? 'default' : 'secondary'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{user._count.assets}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/dashboard/users/${user.id}/edit`}>
                      <Button variant="ghost" size="icon" title="Edit">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                      onClick={() => openActivateDialog(user)}
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      title="Reset Password"
                      onClick={() => openResetDialog(user)}
                    >
                      <Key className="h-4 w-4" />
                    </Button>
                    {user.id !== currentUserId && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500"
                        title="Delete"
                        onClick={() => openDeleteDialog(user)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages} ({totalCount} total)
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/dashboard/users?page=${page - 1}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}`}>
                  <Button variant="outline" size="sm">Previous</Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/dashboard/users?page=${page + 1}&search=${search}&sortBy=${sortBy}&sortOrder=${sortOrder}`}>
                  <Button variant="outline" size="sm">Next</Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedUser?.name || selectedUser?.email}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate/Deactivate Confirmation Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedUser?.isActive ? 'Deactivate' : 'Activate'} User</DialogTitle>
            <DialogDescription>
              Are you sure you want to {selectedUser?.isActive ? 'deactivate' : 'activate'} {selectedUser?.name || selectedUser?.email}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleToggleActive} disabled={loading}>
              {loading ? 'Processing...' : selectedUser?.isActive ? 'Deactivate' : 'Activate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter a new password for {selectedUser?.name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium">New Password</label>
            <Input 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">Password must be at least 6 characters</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleResetPassword} disabled={loading || newPassword.length < 6}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}