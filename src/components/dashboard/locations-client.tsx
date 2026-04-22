'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash2, MapPin, AlertCircle } from 'lucide-react';
import { deleteLocation } from '@/lib/actions';

interface LocationWithCount {
  id: string;
  name: string;
  address: string | null;
  building: string | null;
  floor: string | null;
  room: string | null;
  department: { id: string; name: string } | null;
  _count: { assets: number };
}

interface LocationsClientProps {
  initialLocations: LocationWithCount[];
  canManage: boolean;
}

export function LocationsClient({ initialLocations, canManage }: LocationsClientProps) {
  const router = useRouter();
  const [locations, setLocations] = useState(initialLocations);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithCount | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!selectedLocation) return;
    setLoading(true);
    try {
      await deleteLocation(selectedLocation.id);
      setDeleteDialogOpen(false);
      setSelectedLocation(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete location');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (location: LocationWithCount) => {
    setSelectedLocation(location);
    setDeleteDialogOpen(true);
  };

  if (locations.length === 0) return null;

  return (
    <>
      {error && (
        <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Building / Floor / Room</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Assets</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((loc) => (
              <TableRow key={loc.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{loc.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {[loc.building, loc.floor, loc.room].filter(Boolean).join(' / ') || '-'}
                </TableCell>
                <TableCell>{loc.department?.name || '-'}</TableCell>
                <TableCell><Badge variant="secondary">{loc._count.assets}</Badge></TableCell>
                {canManage && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/dashboard/locations/${loc.id}/edit`}>
                        <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500"
                        onClick={() => openDeleteDialog(loc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedLocation?.name}"?
              {selectedLocation && selectedLocation._count.assets > 0 && (
                <span className="block mt-2 text-red-500">
                  This location has {selectedLocation._count.assets} asset(s). 
                  Please reassign them first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            {selectedLocation && selectedLocation._count.assets === 0 && (
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Location'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}