import { auth } from '@/lib/auth';
import { VendorForm } from '@/components/dashboard/vendor-form';
import { BackLink } from '@/components/ui/back-button';

export default async function NewVendorPage() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <div className="space-y-6">
      <div>
        <BackLink href="/dashboard/vendors" />
        <h1 className="text-3xl font-bold tracking-tight mt-2">Add Vendor</h1>
        <p className="text-muted-foreground">Create a new vendor</p>
      </div>
      <VendorForm />
    </div>
  );
}
