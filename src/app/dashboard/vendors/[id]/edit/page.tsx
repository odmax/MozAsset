import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { VendorForm } from '@/components/dashboard/vendor-form';
import { BackLink } from '@/components/ui/back-button';

export default async function EditVendorPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return null;

  const vendor = await prisma.vendor.findUnique({ where: { id: params.id } });
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
