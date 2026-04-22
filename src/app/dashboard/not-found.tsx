import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Package, XCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The requested resource could not be found.
        </p>
        <Link href="/dashboard">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}