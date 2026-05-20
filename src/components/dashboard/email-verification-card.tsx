'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, Mail, RefreshCw, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VerificationStatus {
  verified: boolean;
  pending: boolean;
  lastSentAt: string | null;
}

export default function EmailVerificationCard({
  userId,
  initiallyVerified,
}: {
  userId?: string;
  initiallyVerified: boolean;
}) {
  const router = useRouter();
  const [verified, setVerified] = useState(initiallyVerified);
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [lastSentAt, setLastSentAt] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/verification-status');
      if (!res.ok) return;
      const data: VerificationStatus = await res.json();
      setVerified(data.verified);
      setPending(data.pending);
      if (data.lastSentAt) setLastSentAt(data.lastSentAt);
    } catch {}
  }, []);

  useEffect(() => {
    if (verified) return;

    checkStatus();

    const interval = setInterval(checkStatus, 12000);
    return () => clearInterval(interval);
  }, [verified, checkStatus]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCountdown(60);
        setPending(true);
        if (data.lastSentAt) setLastSentAt(data.lastSentAt);
        toast({ title: 'Verification email sent', description: 'Check your inbox for the new link.' });
      } else {
        toast({ title: 'Failed to resend', description: data.error || 'Please try again later.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Failed to resend', description: 'Something went wrong.', variant: 'destructive' });
    }
    setResending(false);
  };

  if (verified) {
    return (
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="rounded-full bg-green-100 p-1.5">
          <CheckCircle className="h-5 w-5 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">Email verified</p>
          <p className="text-xs text-green-600">Your email address has been verified.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-amber-100 p-1.5 mt-0.5">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800">Email not verified</p>
          <p className="text-xs text-amber-600 mt-0.5">
            {pending
              ? 'Waiting for verification...'
              : 'Please verify your email address to access all features.'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => router.push('/verify-email/pending')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Verify Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleResend}
          disabled={countdown > 0 || resending}
        >
          {resending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {countdown > 0 ? `Resend (${countdown}s)` : 'Resend verification'}
        </Button>
      </div>
      {pending && (
        <div className="flex items-center gap-2 text-xs text-amber-600">
          <Loader2 className="h-3 w-3 animate-spin" />
          Auto-refreshing status...
        </div>
      )}
    </div>
  );
}
