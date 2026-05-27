'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CREATABLE_ROLES, ROLE_LABELS } from '@/lib/admin-permissions';
import { ArrowLeft, Shield } from 'lucide-react';
import { BackButton } from '@/components/ui/back-button';

interface FormData {
  name: string;
  email: string;
  password: string;
  role: string;
  isActive: boolean;
}

export default function EditAdminPage({ params }: { params: { adminId: string } }) {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    role: 'PLATFORM_ADMIN',
    isActive: true,
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/admin/internal-admins/${params.adminId}`)
      .then(res => res.json())
      .then(data => {
        if (data?.error) {
          setError(data.error);
        } else {
          setFormData({
            name: data.name || '',
            email: data.email || '',
            password: '',
            role: data.role || 'SUPER_ADMIN',
            isActive: data.isActive ?? true,
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load admin');
        setLoading(false);
      });
  }, [params.adminId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/internal-admins/${params.adminId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Failed to update');
        setIsSaving(false);
        return;
      }

      router.push('/admin/platform-admins');
    } catch {
      setError('An error occurred');
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <BackButton defaultHref="/admin/platform-admins" />
        </div>
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
            <Shield className="h-8 w-8 text-primary" />
            <img src="/logo1.png" alt="MozAssets" className="h-9 w-auto" />
            <span>Admin</span>
          </Link>
          <p className="text-sm text-muted-foreground mt-1">Edit platform admin</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Edit Admin</CardTitle>
            <CardDescription>Update admin account details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">New Password (leave blank to keep current)</Label>
                <PasswordInput
                  id="password"
                  placeholder="New password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {CREATABLE_ROLES.filter(r => r !== 'OWNER').map(role => (
                      <SelectItem key={role} value={role}>{ROLE_LABELS[role] || role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
              <Button type="submit" className="w-full" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              Back to{' '}
              <Link href="/admin/platform-admins" className="text-primary hover:underline font-medium">
                Platform Admins
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
