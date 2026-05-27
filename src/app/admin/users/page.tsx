'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { PlanUpgradeModal } from '@/components/plan/PlanUpgradeModal';
import { 
  Search, 
  Loader2, 
  UserCheck,
  UserX,
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
  upgradeRequests: UpgradeRequest[];
}

interface UpgradeRequest {
  id: string;
  targetPlan: string;
  status: string;
  checkoutUrl: string | null;
  amount: number;
  createdAt: string;
  expiresAt: string;
}

interface LifecycleStats {
  totalFree: number;
  inactive60Days: number;
  deactivated: number;
  pendingDeletion: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
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
  const [loadingUserIds, setLoadingUserIds] = useState<Set<string>>(new Set());
  const [upgradeModal, setUpgradeModal] = useState<{
    isOpen: boolean;
    userId: string;
    userEmail: string;
    currentPlan: string;
    targetPlan: string;
    canForceManually: boolean;
  }>({ isOpen: false, userId: '', userEmail: '', currentPlan: '', targetPlan: '', canForceManually: false });

  const withUserLoading = useCallback(async (userId: string, action: () => Promise<void>) => {
    setLoadingUserIds(prev => new Set(prev).add(userId));
    try {
      await action();
    } finally {
      setLoadingUserIds(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/api/admin/users?${params}&t=${Date.now()}`, { cache: 'no-store' });
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
      const res = await fetch(`/api/admin/users/lifecycle-stats?t=${Date.now()}`, { cache: 'no-store' });
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
    await withUserLoading(userId, async () => {
      const currentUsers = [...users];
      const currentFiltered = [...filteredUsers];
      const newStatus = !currentStatus;
      const updateUser = (u: User) => u.id === userId ? { ...u, isActive: newStatus } : u;
      setUsers(users.map(updateUser));
      setFilteredUsers(filteredUsers.map(updateUser));
      
      try {
        const res = await fetch(`/api/admin/users/${userId}/toggle-active`, {
          method: 'POST',
          cache: 'no-store',
        });
        
        const data = await res.json();
        
        if (!res.ok) {
          setUsers(currentUsers);
          setFilteredUsers(currentFiltered);
          toast({ title: 'Failed', description: data.error || 'Could not update status', variant: 'destructive' });
          return;
        }
        
        toast({ title: newStatus ? 'User activated' : 'User deactivated' });
        fetchLifecycleStats();
        router.refresh();
      } catch (e) {
        console.error('Failed to toggle user status:', e);
        setUsers(currentUsers);
        setFilteredUsers(currentFiltered);
        toast({ title: 'Error', description: 'Failed to update user status', variant: 'destructive' });
      }
    });
  };

  const handleChangePlan = async (userId: string, newPlan: string, forceManually?: boolean) => {
    await withUserLoading(userId, async () => {
      const currentUsers = [...users];
      const currentFiltered = [...filteredUsers];
      const updateUser = (u: User) => u.id === userId ? { ...u, plan: newPlan } : u;
      setUsers(users.map(updateUser));
      setFilteredUsers(filteredUsers.map(updateUser));
      
      try {
        const res = await fetch(`/api/admin/users/${userId}/change-plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: newPlan, forceManually: !!forceManually }),
        });
        
        const data = await res.json();

        if (data.requiresPayment) {
          setUsers(currentUsers);
          setFilteredUsers(currentFiltered);
          const targetUser = currentUsers.find((u: User) => u.id === userId);
          setUpgradeModal({
            isOpen: true,
            userId,
            userEmail: targetUser?.email || '',
            currentPlan: data.currentPlan,
            targetPlan: data.targetPlan,
            canForceManually: !!data.canForceManually,
          });
          return;
        }
        
        if (!res.ok) {
          setUsers(currentUsers);
          setFilteredUsers(currentFiltered);
          toast({ title: 'Failed', description: data.error || 'Could not change plan', variant: 'destructive' });
          return;
        }
        
        toast({ title: 'Plan updated', description: `User plan changed to ${newPlan}` });
        fetchLifecycleStats();
        router.refresh();
      } catch (e) {
        console.error('Failed to change plan:', e);
        setUsers(currentUsers);
        setFilteredUsers(currentFiltered);
        toast({ title: 'Error', description: 'Failed to change plan', variant: 'destructive' });
      }
    });
  };

  const getUpgradeBadge = (user: User) => {
    const req = user.upgradeRequests?.[0];
    if (!req) return null;
    const isExpired = new Date(req.expiresAt) < new Date();
    const isPaid = req.status === 'PAID' || req.status === 'MANUALLY_CONFIRMED';
    const isCancelled = req.status === 'CANCELLED';
    const isPending = req.status === 'PENDING_PAYMENT' && !isExpired;

    if (isPaid) return null;
    if (isExpired && req.status === 'PENDING_PAYMENT') return null;

    if (isPending) {
      return (
        <span className="inline-flex items-center gap-1 ml-1">
          <Badge className="bg-blue-100 text-blue-700 text-xs">
            Awaiting {req.targetPlan}
          </Badge>
          <button
            onClick={(e) => {
              e.preventDefault();
              setUpgradeModal({
                isOpen: true,
                userId: user.id,
                userEmail: user.email,
                currentPlan: user.plan,
                targetPlan: req.targetPlan,
                canForceManually: false,
              });
            }}
            className="text-xs text-primary underline ml-1"
          >
            Resend
          </button>
        </span>
      );
    }

    if (isCancelled) {
      return (
        <span className="inline-flex items-center gap-1 ml-1">
          <Badge className="bg-red-100 text-red-700 text-xs">
            Payment Cancelled
          </Badge>
          <button
            onClick={(e) => {
              e.preventDefault();
              setUpgradeModal({
                isOpen: true,
                userId: user.id,
                userEmail: user.email,
                currentPlan: user.plan,
                targetPlan: req.targetPlan || 'PRO',
                canForceManually: false,
              });
            }}
            className="text-xs text-primary underline ml-1"
          >
            Resend
          </button>
        </span>
      );
    }

    return null;
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
        toast({ title: 'Failed to delete user', description: data.error || 'Could not delete user', variant: 'destructive' });
      } else {
        setUsers(users.filter(u => u.id !== deleteTarget.id));
        setFilteredUsers(filteredUsers.filter(u => u.id !== deleteTarget.id));
        fetchLifecycleStats();
        router.refresh();
        toast({ title: 'User deleted', description: `${deleteTarget.name || deleteTarget.email} has been permanently deleted` });
      }
    } catch (e) {
      console.error('Failed to delete user:', e);
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' });
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
                      {getUpgradeBadge(user)}
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
                          disabled={loadingUserIds.has(user.id)}
                        >
                          <Link href={`/admin/users/${user.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                          disabled={loadingUserIds.has(user.id)}
                        >
                          {loadingUserIds.has(user.id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : user.isActive ? (
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
                          disabled={loadingUserIds.has(user.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <select
                          value={user.plan}
                          onChange={(e) => {
                            handleChangePlan(user.id, e.target.value);
                          }}
                          className="text-xs border rounded px-2 py-1"
                          disabled={loadingUserIds.has(user.id)}
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
      <PlanUpgradeModal
        isOpen={upgradeModal.isOpen}
        onClose={() => setUpgradeModal(prev => ({ ...prev, isOpen: false }))}
        userId={upgradeModal.userId}
        userEmail={upgradeModal.userEmail}
        currentPlan={upgradeModal.currentPlan}
        targetPlan={upgradeModal.targetPlan}
        canForceManually={upgradeModal.canForceManually}
        onPlanChanged={() => {
          fetchLifecycleStats();
          router.refresh();
        }}
      />
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
