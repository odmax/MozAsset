import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, MapPin } from 'lucide-react';
import Link from 'next/link';
import { LocationsClient } from '@/components/dashboard/locations-client';
import { getCurrentUserContext } from '@/lib/user-context';
import prisma from '@/lib/prisma';

export const metadata = { title: 'Locations | Asset Manager' };

export default async function LocationsPage() {
  const context = await getCurrentUserContext();
  if (!context?.userId) return null;

  const canManage = ['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role);
  const isPlatformAdmin = context.isPlatformAdmin || context.isInternalAdmin;

  const locations = await prisma.location.findMany({
    where: isPlatformAdmin ? {} : { organizationId: context.organizationId },
    orderBy: { name: 'asc' },
    include: {
      department: { select: { id: true, name: true } },
      _count: { select: { assets: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Manage asset locations</p>
        </div>
        {canManage && (
          <Link href="/dashboard/locations/new">
            <Button><Plus className="mr-2 h-4 w-4" />Add Location</Button>
          </Link>
        )}
      </div>

      <LocationsClient initialLocations={locations} canManage={canManage} />

      {locations.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No locations yet</p>
            {canManage && <Link href="/dashboard/locations/new"><Button>Add your first location</Button></Link>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
