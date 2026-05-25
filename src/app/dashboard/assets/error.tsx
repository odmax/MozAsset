'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function AssetsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Assets error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-semibold mb-2">Error loading assets</h2>
      <p className="text-muted-foreground mb-6 max-w-md">
        Something went wrong while loading asset data. This may be caused by invalid or missing data. Please try again or contact support.
      </p>
      <div className="flex gap-4">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => window.location.href = '/dashboard/assets'}>
          Go to Assets
        </Button>
      </div>
    </div>
  );
}
