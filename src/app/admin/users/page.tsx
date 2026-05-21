'use client';

import { useEffect, useState } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Search, 
  Loader2, 
  MoreHorizontal,
  UserCheck,
  UserX,
  Crown,
  Mail,
  Calendar,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  isActive: boolean;
  isDeactivated: boolean;
  deactivatedAt: string | null;
  scheduledDeletionAt: string | null;
  lastActiveAt: string | null;
  emailVerified: string | null;
  createdAt: string;
  organization: { name: string } | null;
}

interface LifecycleStats {
  totalFree: number;
  inactive60Days: number;
  deactivated: number;
  pendingDeletion: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [lifecycleStats, setLifecycleStats] = useState<LifecycleStats | null>(null);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      if (!data.success || data.error) {
        setError(data.error || 'Failed to load users');
      } else {
        setUsers(data.users || []);
        setFilteredUsers(data.users || []);
      }
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchLifecycleStats = async () => {
    try {
      const res = await fetch('/api/admin/users/lifecycle-stats');
      const data = await res.json();
      if (data.success) setLifecycleStats(data.stats);
    } catch {}
  };

  useEffect(() => { fetchUsers(); fetchLifecycleStats(); }, []);

  useEffect(() => {
    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [search, filterStatus]);

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    const currentUsers = [...users];
    setUsers(users.map(u => 
      u.id === userId ? { ...u, isActive: !currentStatus } : u
    ));
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-active`, {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setUsers(currentUsers);
        alert(`Failed: ${data.error}`);
      }
    } catch (e) {
      console.error('Failed to toggle user status:', e);
      setUsers(currentUsers);
    }
  };

  const handleChangePlan = async (userId: string, newPlan: string) => {
    const currentUsers = [...users];
    setUsers(users.map(u => 
      u.id === userId ? { ...u, plan: newPlan } : u
    ));
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/change-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setUsers(currentUsers);
        alert(`Failed: ${data.error}`);
      } else {
        const refetch = await fetch('/api/admin/users');
        if (refetch.ok) {
          const fresh = await refetch.json();
          if (fresh.success) {
            setUsers(fresh.users);
          }
        }
      }
    } catch (e) {
      console.error('Failed to change plan:', e);
      setUsers(currentUsers);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`Failed to delete user: ${data.error}`);
      } else {
        setUsers(users.filter(u => u.id !== deleteTarget.id));
        setFilteredUsers(filteredUsers.filter(u => u.id !== deleteTarget.id));
      }
    } catch (e) {
      console.error('Failed to delete user:', e);
      alert('Failed to delete user');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage all registered users on the platform</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-red-500">{error}</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        <p className="text-muted-foreground">Manage all registered users on the platform</p>
      </div>

      {lifecycleStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <p className="text-2xl font-bold">{lifecycleStats.totalFree}</p>
            <p className="text-xs text-muted-foreground mt-1">Total FREE accounts</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-2xl font-bold text-purple-600">{users.filter(u => u.plan === 'PRO').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Pro accounts</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-2xl font-bold text-amber-600">{users.filter(u => u.plan === 'ENTERPRISE').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Enterprise accounts</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-2xl font-bold text-amber-600">{lifecycleStats.inactive60Days}</p>
            <p className="text-xs text-muted-foreground mt-1">Inactive 60+ days</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-2xl font-bold text-red-600">{lifecycleStats.deactivated}</p>
            <p className="text-xs text-muted-foreground mt-1">Deactivated (read-only)</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-2xl font-bold text-red-800">{lifecycleStats.pendingDeletion}</p>
            <p className="text-xs text-muted-foreground mt-1">Pending permanent deletion</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            <div className="flex items-center gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="h-9 rounded-lg border bg-background px-3 text-sm"
              >
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deactivated">Deactivated</option>
              </select>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-300px)]">
            <table className="w-full">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-sm font-medium">User</th>
                  <th className="text-left p-3 text-sm font-medium">Organization</th>
                  <th className="text-left p-3 text-sm font-medium">Role</th>
                  <th className="text-left p-3 text-sm font-medium">Plan</th>
                  <th className="text-left p-3 text-sm font-medium">Status</th>
                  <th className="text-left p-3 text-sm font-medium">Lifecycle</th>
                  <th className="text-left p-3 text-sm font-medium">Verified</th>
                  <th className="text-left p-3 text-sm font-medium">Joined</th>
                  <th className="text-left p-3 text-sm font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {user.name?.charAt(0) || user.email.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{user.name || 'No name'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-sm">
                      {user.organization?.name || '-'}
                    </td>
                    <td className="p-3 text-sm">
                      <Badge variant="outline">{user.role}</Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={
                        user.plan === 'PRO' ? 'bg-purple-100 text-purple-700' :
                        user.plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-700' :
                        'bg-muted text-muted-foreground'
                      }>
                        {user.plan}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {user.isActive ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      {user.isDeactivated ? (
                        <div className="text-xs space-y-0.5">
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Deactivated
                          </Badge>
                          {user.scheduledDeletionAt && (
                            <p className="text-red-600 mt-1">
                              Deletion: {new Date(user.scheduledDeletionAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : user.plan === 'FREE' && user.lastActiveAt && (
                        <span className="text-xs text-muted-foreground">
                          Last active: {new Date(user.lastActiveAt).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {user.emailVerified ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Pending
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          asChild
                        >
                          <Link href={`/admin/users/${user.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          asChild
                        >
                          <Link href={`/admin/users/${user.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                        >
                          {user.isActive ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setDeleteTarget(user);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <select
                          value={user.plan}
                          onChange={(e) => {
                            console.log('Plan changed:', user.id, e.target.value);
                            handleChangePlan(user.id, e.target.value);
                          }}
                          className="text-xs border rounded px-2 py-1"
                          disabled={loading}
                        >
                          <option value="FREE">FREE</option>
                          <option value="PRO">PRO</option>
                          <option value="ENTERPRISE">ENTERPRISE</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Permanently Delete User
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-3">
              <p>
                Are you sure you want to permanently delete <strong>{deleteTarget?.name || deleteTarget?.email}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <p className="font-medium mb-1">This action cannot be undone.</p>
                <ul className="list-disc pl-4 space-y-1 text-red-600">
                  <li>The user account will be permanently removed</li>
                  <li>All associated data (tickets, notifications, files) will be deleted</li>
                  {deleteTarget?.organization && (
                    <li>The organization &quot;{deleteTarget.organization.name}&quot; and all its data will be deleted</li>
                  )}
                  <li>Assets assigned to this user will be unassigned</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Permanently Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
