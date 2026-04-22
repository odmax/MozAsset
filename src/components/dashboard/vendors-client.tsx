'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Edit, Trash2, Truck, Mail, Phone, Globe, AlertCircle } from 'lucide-react';
import { deleteVendor } from '@/lib/actions';

interface VendorWithCount {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  website: string | null;
  notes: string | null;
  _count: { assets: number };
}

interface VendorsClientProps {
  initialVendors: VendorWithCount[];
  canManage: boolean;
}

export function VendorsClient({ initialVendors, canManage }: VendorsClientProps) {
  const router = useRouter();
  const [vendors, setVendors] = useState(initialVendors);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorWithCount | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!selectedVendor) return;
    setLoading(true);
    try {
      await deleteVendor(selectedVendor.id);
      setDeleteDialogOpen(false);
      setSelectedVendor(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete vendor');
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  const openDeleteDialog = (vendor: VendorWithCount) => {
    setSelectedVendor(vendor);
    setDeleteDialogOpen(true);
  };

  if (vendors.length === 0) return null;

  return (
    <>
      {error && (
        <div className="p-3 mb-4 text-sm text-red-500 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vendors.map((vendor) => (
          <Card key={vendor.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{vendor.name}</CardTitle>
                </div>
                <Badge variant="secondary">{vendor._count.assets} assets</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {vendor.contactName && <p className="text-sm">{vendor.contactName}</p>}
              {vendor.email && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {vendor.email}
                </p>
              )}
              {vendor.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {vendor.phone}
                </p>
              )}
              {vendor.website && (
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Globe className="h-3 w-3" /> {vendor.website}
                </p>
              )}
              {canManage && (
                <div className="flex gap-1 pt-2">
                  <Link href={`/dashboard/vendors/${vendor.id}/edit`}>
                    <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500"
                    onClick={() => openDeleteDialog(vendor)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Vendor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedVendor?.name}"?
              {selectedVendor && selectedVendor._count.assets > 0 && (
                <span className="block mt-2 text-red-500">
                  This vendor has {selectedVendor._count.assets} asset(s). 
                  Please reassign them first.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            {selectedVendor && selectedVendor._count.assets === 0 && (
              <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Delete Vendor'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}