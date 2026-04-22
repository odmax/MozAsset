'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { createUser, updateUser } from '@/lib/actions';

interface UserFormProps {
  user?: { id: string; name: string | null; email: string; role: string; departmentId?: string | null; isActive: boolean };
  departments: { id: string; name: string }[];
  isEdit?: boolean;
}

export function UserForm({ user, departments, isEdit = false }: UserFormProps) {
  const router = useRouter();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'EMPLOYEE');
  const [departmentId, setDepartmentId] = useState(user?.departmentId || '');
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const data: any = { name, email, role, departmentId: departmentId || undefined, isActive };
      if (password) data.password = password;
      if (isEdit && user) {
        await updateUser(user.id, data);
      } else {
        await createUser({ ...data, password });
      }
      router.push('/dashboard/users');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Edit User' : 'Add User'}</CardTitle>
        <CardDescription>{isEdit ? 'Update user details' : 'Create a new user'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">{error}</div>}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required={!isEdit} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select onValueChange={setRole} defaultValue={role}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ASSET_MANAGER">Asset Manager</SelectItem>
                  <SelectItem value="DEPARTMENT_MANAGER">Department Manager</SelectItem>
                  <SelectItem value="EMPLOYEE">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select onValueChange={setDepartmentId} defaultValue={departmentId}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
              Active
            </Label>
          </div>
          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting || !name || !email}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
