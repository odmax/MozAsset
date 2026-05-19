'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, Clock } from 'lucide-react';

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const plan = searchParams.get('plan');
  const userId = searchParams.get('userId');
  const [status, setStatus] = useState<'processing' | 'pending' | 'confirmed'>('processing');

  useEffect(() => {
    let cancelled = false;

    async function pollForUpgrade() {
      // Poll billing API until plan is updated or timeout
      for (let i = 0; i < 30; i++) {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, 2000));
        try {
          const res = await fetch('/api/billing');
          const data = await res.json();
          if (data.plan && data.plan !== 'FREE') {
            // Plan upgraded Ã¢â‚¬â€ refresh session cookie
            if (userId) {
              await fetch('/api/auth/refresh-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
              });
            }
            if (!cancelled) setStatus('confirmed');
            return;
          }
        } catch {}
      }
      if (!cancelled) setStatus('pending');
    }

    pollForUpgrade();
    return () => { cancelled = true; };
  }, [plan, userId, router]);

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
            <p className="mt-4 text-muted-foreground">Processing your payment...</p>
            <p className="text-sm text-muted-foreground mt-2">Waiting for payment confirmation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'confirmed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
            <img src="/logo.png" alt="MozAssets" className="h-10 w-auto" />
          </Link>
          </div>
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-xl">Upgrade Complete!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Your account has been upgraded to {plan === 'PRO' ? 'Pro' : plan === 'ENTERPRISE' ? 'Enterprise' : plan}!
              </p>
              <div className="pt-4">
                <Link href="/dashboard">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
            <img src="/logo.png" alt="MozAssets" className="h-10 w-auto" />
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <CardTitle className="text-xl">Payment Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your payment is being processed. This may take a few moments.
            </p>
            <p className="text-sm text-muted-foreground">
              You will receive a confirmation email once the payment is verified.
            </p>
            <div className="pt-4">
              <Link href="/dashboard">
                <Button className="w-full bg-purple-600 hover:bg-purple-700">
                  Go to Dashboard
                </Button>
              </Link>
              <p className="text-xs text-muted-foreground mt-4">
                Your plan will be upgraded automatically once payment is confirmed.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
    }>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
