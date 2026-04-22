'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft,
  Edit,
  UserPlus,
  ArrowRightLeft,
  Check,
  Wrench,
  Archive,
  MapPin,
  Building2,
  Package,
  Calendar,
  DollarSign,
  Shield,
  User,
} from 'lucide-react';
import { checkInAsset } from '@/app/dashboard/assets/actions';

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

interface AssetDetailProps {
  asset: any;
  canManage: boolean;
  categories: { id: string; name: string }[];
  departments: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  vendors: { id: string; name: string }[];
  users: { id: string; name: string; email: string }[];
}

export function AssetDetail({
  asset,
  canManage,
  categories,
  departments,
  locations,
  vendors,
  users,
}: AssetDetailProps) {
  const router = useRouter();
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    try {
      await checkInAsset(asset.id);
      router.refresh();
    } catch (error) {
      console.error('Failed to check in:', error);
    }
    setIsCheckingIn(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/assets">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{asset.name}</h1>
              <Badge className={statusColors[asset.status]}>
                {asset.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {asset.assetTag} {asset.brand && asset.model && `• ${asset.brand} ${asset.model}`}
            </p>
          </div>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link href={`/dashboard/assets/${asset.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Asset Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Asset Tag</p>
                    <p className="font-medium">{asset.assetTag}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{asset.department?.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{asset.location?.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned To</p>
                    <p className="font-medium">
                      {asset.assignedTo?.name || '-'}
                      {asset.assignedTo?.email && (
                        <span className="text-sm text-muted-foreground ml-1">
                          ({asset.assignedTo.email})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Date</p>
                    <p className="font-medium">
                      {asset.purchaseDate ? formatDate(asset.purchaseDate) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Purchase Cost</p>
                    <p className="font-medium">
                      {asset.purchaseCost ? formatCurrency(asset.purchaseCost) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Warranty Expiry</p>
                    <p className="font-medium">
                      {asset.warrantyExpiry ? formatDate(asset.warrantyExpiry) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className={conditionColors[asset.condition]}>
                    {asset.condition}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Condition</span>
                </div>
              </div>
            </div>

            {asset.description && (
              <>
                <Separator className="my-6" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p>{asset.description}</p>
                </div>
              </>
            )}

            {asset.notes && (
              <>
                <Separator className="my-6" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="whitespace-pre-wrap">{asset.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {canManage && (
                <>
                  <Link href={`/dashboard/assets/${asset.id}/assign`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign Asset
                    </Button>
                  </Link>
                  <Link href={`/dashboard/assets/${asset.id}/transfer`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Transfer Asset
                    </Button>
                  </Link>
                  <Link href={`/dashboard/assets/${asset.id}/maintenance`} className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Wrench className="mr-2 h-4 w-4" />
                      Add Maintenance
                    </Button>
                  </Link>
                  {asset.status === 'ASSIGNED' && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={handleCheckIn}
                      disabled={isCheckingIn}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      {isCheckingIn ? 'Checking In...' : 'Check In'}
                    </Button>
                  )}
                  <Link href={`/dashboard/assets/${asset.id}/retire`} className="block">
                    <Button variant="outline" className="w-full justify-start text-orange-600">
                      <Archive className="mr-2 h-4 w-4" />
                      Retire Asset
                    </Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{asset.category?.name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vendor</span>
                <span className="font-medium">{asset.vendor?.name || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Serial Number</span>
                <span className="font-medium">{asset.serialNumber || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Model</span>
                <span className="font-medium">{asset.model || '-'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Brand</span>
                <span className="font-medium">{asset.brand || '-'}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{formatDate(asset.createdAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">{formatDate(asset.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="history" className="w-full">
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {asset.auditLogs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No history available</p>
              ) : (
                <div className="space-y-4">
                  {asset.auditLogs.map((log: any) => (
                    <div key={log.id} className="flex items-start gap-4">
                      <div className="mt-1">
                        <Badge variant="outline">{log.action}</Badge>
                      </div>
                      <div className="flex-1">
                        <p>
                          <span className="font-medium">{log.user.name || log.user.email}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(log.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {asset.maintenances.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No maintenance records</p>
              ) : (
                <div className="space-y-4">
                  {asset.maintenances.map((m: any) => (
                    <div key={m.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge>{m.type}</Badge>
                          <p className="mt-1">{m.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {formatDate(m.performedAt)}
                          </p>
                          {m.cost && (
                            <p className="text-sm font-medium">
                              {formatCurrency(m.cost)}
                            </p>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        By {m.performedByUser.name}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {asset.assignments.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No assignments</p>
              ) : (
                <div className="space-y-4">
                  {asset.assignments.map((a: any) => (
                    <div key={a.id} className="border-b pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{a.user.name}</p>
                          <p className="text-sm text-muted-foreground">{a.user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {formatDate(a.assignedAt)}
                          </p>
                          {a.returnedAt && (
                            <Badge variant="outline" className="mt-1">
                              Returned {formatDate(a.returnedAt)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
