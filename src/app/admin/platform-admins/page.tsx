'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROLE_BADGE_COLORS, ROLE_LABELS } from '@/lib/admin-permissions';
import { 
  UserCog, 
  Shield,
  Plus,
  Trash2,
  Pencil,
  Mail,
} from 'lucide-react';
import LogoutButton from '../logout-button';

interface PlatformAdmin {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

async function getPlatformAdmins() {
  const admins = await fetch('/api/admin/internal-admins').then(r => r.json());
  return admins;
}

export default function PlatformAdminsPage() {
  // Admin session verified by layout (admin/layout.tsx)
  // This page assumes user is authorized

  const [admins, setAdmins] = useState<PlatformAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getPlatformAdmins().then(data => {
      if (data?.error) {
        setError(data.error);
      } else {
        setAdmins(data);
      }
      setLoading(false);
    }).catch(err => {
      setError('Failed to load platform admins');
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this admin?')) return;
    
    const res = await fetch(`/api/admin/internal-admins/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAdmins(admins.filter(a => a.id !== id));
    } else {
      alert('Failed to delete admin');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Admins</h1>
          <p className="text-muted-foreground">Manage platform administrator accounts</p>
        </div>
        <Link href="/admin/platform-admins/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Admin
          </Button>
        </Link>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Platform Admins</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : admins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No platform admins found. <Link href="/admin/platform-admins/new" className="text-primary">Add one</Link>
            </div>
          ) : (
            <div className="space-y-4">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserCog className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{admin.name || admin.email}</p>
                      <p className="text-sm text-muted-foreground">{admin.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_BADGE_COLORS[admin.role] || 'bg-slate-100 text-slate-700'}`}>
                      {ROLE_LABELS[admin.role] || admin.role}
                    </span>
                    <Badge variant={admin.isActive ? 'default' : 'destructive'}>
                      {admin.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {admin.lastLogin && (
                      <span className="text-xs text-muted-foreground">
                        Last login: {new Date(admin.lastLogin).toLocaleDateString()}
                      </span>
                    )}
                    <Link href={`/admin/platform-admins/${admin.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    {admin.role !== 'OWNER' && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(admin.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
