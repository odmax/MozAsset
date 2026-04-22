'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { transferAsset } from '@/app/dashboard/assets/actions';

interface TransferFormProps {
  assetId: string;
  departments: { id: string; name: string }[];
  locations: { id: string; name: string; departmentId: string | null }[];
  users: { id: string; name: string; email: string }[];
}

export function TransferForm({ assetId, departments, locations, users }: TransferFormProps) {
  const router = useRouter();
  const [toDepartmentId, setToDepartmentId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [toUserId, setToUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSubmitting(true);
    setError('');

    try {
      await transferAsset(assetId, {
        toDepartmentId: toDepartmentId || undefined,
        toLocationId: toLocationId || undefined,
        toUserId: toUserId || undefined,
        notes,
      });
      router.push(`/dashboard/assets/${assetId}`);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to transfer asset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredLocations = toDepartmentId
    ? locations.filter((l) => l.departmentId === toDepartmentId || !l.departmentId)
    : locations;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Asset</CardTitle>
        <CardDescription>Move asset to new department, location, or assign to different user</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label>To Department</Label>
            <Select onValueChange={setToDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To Location</Label>
            <Select onValueChange={setToLocationId}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {filteredLocations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>To User</Label>
            <Select onValueChange={setToUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for transfer..."
            />
          </div>
          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
