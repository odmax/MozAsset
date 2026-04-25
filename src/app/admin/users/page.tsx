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
  Search, 
  Loader2, 
  MoreHorizontal,
  UserCheck,
  UserX,
  Crown,
  Mail,
  Calendar,
  Eye,
  Pencil
} from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  plan: string;
  isActive: boolean;
  emailVerified: Date | null;
  createdAt: Date;
  department: { name: string } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    console.log('[admin-users-page] Fetching users...');
    fetch('/api/admin/users')
      .then(res => {
        console.log('[admin-users-page] Response status:', res.status);
        if (res.status === 401 || res.status === 403) {
          redirect('/dashboard');
        }
        return res.json();
      })
      .then(data => {
        console.log('[admin-users-page] Response data:', data);
        if (data?.error) {
          setError(data.error);
        } else {
          setUsers(data);
          setFilteredUsers(data);
        }
      })
      .catch(err => {
        console.error('[admin-users-page] Fetch error:', err);
        setError('Failed to load users');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = users.filter(u => 
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [search, users]);

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
      
      console.log('Toggle active response:', res.status, data);
      
      if (!res.ok) {
        console.error('Toggle active failed:', data.error);
        setUsers(currentUsers);
        alert(`Failed: ${data.error}`);
      } else {
        console.log('User is now:', data.isActive ? 'Active' : 'Inactive');
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
      
      console.log('Change plan response:', res.status, data);
      
      if (!res.ok) {
        console.error('Change plan failed:', data.error);
        setUsers(currentUsers);
        alert(`Failed: ${data.error}`);
      } else {
        console.log('Plan updated to:', data.plan);
        // Refetch to ensure sync
        const refetch = await fetch('/api/admin/users');
        if (refetch.ok) {
          const fresh = await refetch.json();
          setUsers(fresh);
        }
      }
    } catch (e) {
      console.error('Failed to change plan:', e);
      setUsers(currentUsers);
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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
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
                      {user.department?.name || '-'}
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
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
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
    </div>
  );
}
