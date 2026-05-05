import { notFound, redirect } from 'next/navigation';
import { VendorForm } from '@/components/dashboard/vendor-form';
import { BackLink } from '@/components/ui/back-button';
import { getCurrentUserContext } from '@/lib/user-context';
import prisma from '@/lib/prisma';

export default async function EditVendorPage({ params }: { params: { id: string } }) {
  const context = await getCurrentUserContext();
  if (!context) redirect('/login');

  const where: any = { id: params.id };
  if (!context.isInternalAdmin) {
    where.organizationId = context.organizationId || 'never-match';
  }

  const vendor = await prisma.vendor.findUnique({ where });
  if (!vendor) notFound();

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/vendors" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Edit Vendor</h1>
        <p className="text-muted-foreground">Update vendor details</p>
      </div>
      <VendorForm vendor={vendor} isEdit />
    </div>
  );
}
