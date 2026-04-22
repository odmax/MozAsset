import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Truck } from 'lucide-react';
import Link from 'next/link';
import { VendorsClient } from '@/components/dashboard/vendors-client';

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

export const metadata = { title: 'Vendors | Asset Manager' };

export default async function VendorsPage() {
  const user = getSessionUser();
  if (!user) return null;

  const canManage = ['SUPER_ADMIN', 'ASSET_MANAGER'].includes(user.role);

  const vendors = await prisma.vendor.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { assets: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
          <p className="text-muted-foreground">Manage asset vendors and suppliers</p>
        </div>
        {canManage && (
          <Link href="/dashboard/vendors/new">
            <Button><Plus className="mr-2 h-4 w-4" />Add Vendor</Button>
          </Link>
        )}
      </div>

      <VendorsClient initialVendors={vendors} canManage={canManage} />

      {vendors.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No vendors yet</p>
            {canManage && <Link href="/dashboard/vendors/new"><Button>Add your first vendor</Button></Link>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
