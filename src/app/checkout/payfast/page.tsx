'use client';

import { useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PayfastRedirectPage() {
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  const rawData = searchParams.get('data');
  const payfastUrl = searchParams.get('url');

  let payfastData: Record<string, string> | null = null;

  if (rawData) {
    try {
      const decoded = atob(rawData);
      payfastData = JSON.parse(decoded);
    } catch {
      // Invalid data
    }
  }

  useEffect(() => {
    if (formRef.current && payfastData && payfastUrl && !submitted.current) {
      submitted.current = true;
      formRef.current.submit();
    }
  }, [payfastData, payfastUrl]);

  if (!payfastUrl || !payfastData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Invalid Checkout Data</h1>
          <p className="text-muted-foreground">
            No payment data received. Please go back and try again.
          </p>
          <a href="/dashboard" className="text-primary hover:underline">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-lg font-medium">Redirecting to Payfast...</p>
        <p className="text-sm text-muted-foreground">
          Please wait while we redirect you to the secure payment page.
        </p>

        <form ref={formRef} method="POST" action={payfastUrl} className="hidden">
          {Object.entries(payfastData).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
        </form>

        <noscript>
          <div className="mt-4">
            <form method="POST" action={payfastUrl}>
              {Object.entries(payfastData).map(([key, value]) => (
                <input key={key} type="hidden" name={key} value={value} />
              ))}
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Proceed to Payfast
              </button>
            </form>
          </div>
        </noscript>
      </div>
    </div>
  );
}
