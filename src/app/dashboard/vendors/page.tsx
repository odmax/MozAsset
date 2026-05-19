import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { VendorsClient } from '@/components/dashboard/vendors-client';
import { getCurrentUserContext } from '@/lib/user-context';
import prisma from '@/lib/prisma';

export const metadata = { title: 'Vendors | Asset Manager' };

export default async function VendorsPage() {
  const context = await getCurrentUserContext();
  if (!context?.userId) return null;

  const canManage = ['SUPER_ADMIN', 'ASSET_MANAGER'].includes(context.role);
  const isPlatformAdmin = context.isPlatformAdmin || context.isInternalAdmin;

  const vendors = await prisma.vendor.findMany({
    where: isPlatformAdmin ? {} : { organizationId: context.organizationId },
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
    </div>
  );
}
