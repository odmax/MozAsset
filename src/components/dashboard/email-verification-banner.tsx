'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, X, RefreshCw } from 'lucide-react';

export default function EmailVerificationBanner({ initiallyVerified }: { initiallyVerified: boolean }) {
  const [dismissed, setDismissed] = useState(false);
  const [verified, setVerified] = useState(initiallyVerified);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (verified) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch('/api/auth/verification-status');
        if (r.ok) {
          const d = await r.json();
          if (d.verified) setVerified(true);
        }
      } catch { /* ignore */ }
    }, 12000);
    return () => clearInterval(interval);
  }, [verified]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  if (verified || dismissed) return null;

  const handleResend = async () => {
    if (countdown > 0 || resending) return;
    setResending(true);
    try {
      await fetch('/api/auth/resend-verification', { method: 'POST' });
      setCountdown(60);
    } catch { /* ignore */ } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">Please verify your email to secure your account</p>
        <p className="text-xs text-amber-600 mt-0.5">Check your inbox or request a new verification email.</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={handleResend} disabled={countdown > 0 || resending} className="gap-1.5 h-8">
          {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {countdown > 0 ? `Resend (${countdown}s)` : 'Resend email'}
        </Button>
        <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-amber-600">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
