import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, MapPin } from 'lucide-react';
import Link from 'next/link';
import { LocationsClient } from '@/components/dashboard/locations-client';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
  return null;
}

export const metadata = { title: 'Locations | Asset Manager' };

export default async function LocationsPage() {
  const user = getSessionUser();
  if (!user) return null;

  const canManage = ['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role);

  const locations = await prisma.location.findMany({
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
