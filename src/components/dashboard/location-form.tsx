'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { createLocation, updateLocation } from '@/lib/actions';

interface LocationFormProps {
  location?: { id: string; name: string; address?: string | null; building?: string | null; floor?: string | null; room?: string | null; departmentId?: string | null };
  departments: { id: string; name: string }[];
  isEdit?: boolean;
}

export function LocationForm({ location, departments, isEdit = false }: LocationFormProps) {
  const router = useRouter();
  const [name, setName] = useState(location?.name || '');
  const [address, setAddress] = useState(location?.address || '');
  const [building, setBuilding] = useState(location?.building || '');
  const [floor, setFloor] = useState(location?.floor || '');
  const [room, setRoom] = useState(location?.room || '');
  const [departmentId, setDepartmentId] = useState(location?.departmentId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const data = { name, address: address || undefined, building: building || undefined, floor: floor || undefined, room: room || undefined, departmentId: departmentId || undefined };
      if (isEdit && location) {
        await updateLocation(location.id, data);
      } else {
        await createLocation(data);
      }
      router.push('/dashboard/locations');
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
        <CardTitle>{isEdit ? 'Edit Location' : 'Add Location'}</CardTitle>
        <CardDescription>{isEdit ? 'Update location details' : 'Create a new location'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg">{error}</div>}
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Building</Label>
              <Input value={building} onChange={(e) => setBuilding(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input value={floor} onChange={(e) => setFloor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Room</Label>
              <Input value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>
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
          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting || !name}>
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
