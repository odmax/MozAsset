'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Edit, Eye, Trash2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { deleteAsset } from '@/app/dashboard/assets/actions';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_REPAIR: 'bg-yellow-100 text-yellow-800',
  RETIRED: 'bg-gray-100 text-gray-800',
  DISPOSED: 'bg-red-100 text-red-800',
  LOST: 'bg-orange-100 text-orange-800',
};

const conditionColors: Record<string, string> = {
  EXCELLENT: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  FAIR: 'bg-yellow-100 text-yellow-800',
  POOR: 'bg-orange-100 text-orange-800',
  NEEDS_REPAIR: 'bg-red-100 text-red-800',
};

interface AssetListProps {
  assets: any[];
  totalPages: number;
  currentPage: number;
  canManage: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function AssetList({ assets, totalPages, currentPage, canManage, sortBy = 'createdAt', sortOrder = 'desc' }: AssetListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentPath, setCurrentPath] = useState('');

  useEffect(() => {
    setCurrentPath(window.location.pathname);
  }, []);

  const handleSort = (column: string) => {
    const newOrder = sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc';
    const params = new URLSearchParams(searchParams.toString());
    params.set('sortBy', column);
    params.set('sortOrder', newOrder);
    router.push(`/dashboard/assets?${params.toString()}`);
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortOrder === 'desc' ? <ArrowDown className="h-4 w-4 ml-1" /> : <ArrowUp className="h-4 w-4 ml-1" />;
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      try {
        await deleteAsset(id);
        router.refresh();
      } catch (error) {
        console.error('Failed to delete:', error);
      }
    }
  };

  if (assets.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center">
        <p className="text-muted-foreground mb-4">No assets found</p>
        {canManage && (
          <Link href="/dashboard/assets/new">
            <Button>Add your first asset</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">
                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('assetTag')}>
                  Asset Tag {getSortIcon('assetTag')}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('name')}>
                  Name {getSortIcon('name')}
                </Button>
              </TableHead>
              <TableHead>Category</TableHead>
              <TableHead>
                <Button variant="ghost" className="p-0 hover:bg-transparent" onClick={() => handleSort('status')}>
                  Status {getSortIcon('status')}
                </Button>
              </TableHead>
              <TableHead>Condition</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell className="font-medium">{asset.assetTag}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{asset.name}</div>
                    {asset.brand && asset.model && (
                      <div className="text-xs text-muted-foreground">
                        {asset.brand} {asset.model}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{asset.category?.name || '-'}</TableCell>
                <TableCell>
                  <Badge className={statusColors[asset.status]}>
                    {asset.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={conditionColors[asset.condition]}>
                    {asset.condition}
                  </Badge>
                </TableCell>
                <TableCell>
                  {asset.assignedTo ? (
                    <div>
                      <div className="text-sm">{asset.assignedTo.name}</div>
                      <div className="text-xs text-muted-foreground">{asset.assignedTo.email}</div>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{asset.location?.name || asset.department?.name || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link href={`/dashboard/assets/${asset.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                    {canManage && (
                      <>
                        <Link href={`/dashboard/assets/${asset.id}/edit`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(asset.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between py-4">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Link href={`/dashboard/assets?page=${currentPage - 1}`}>
              <Button variant="outline" disabled={currentPage <= 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/dashboard/assets?page=${currentPage + 1}`}>
              <Button variant="outline" disabled={currentPage >= totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
