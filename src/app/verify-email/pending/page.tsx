'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2, Mail, RefreshCw, HelpCircle, AtSign } from 'lucide-react';

export default function VerifyEmailPendingPage() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
      if (res.ok) {
        setResendSent(true);
        setCountdown(60);
      }
    } catch {}
    setResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
            <img src="/logo.png" alt="MozAssets" className="h-11 w-auto" />
          </Link>
          <p className="text-sm text-muted-foreground mt-1">by Mozetech</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Account created!</CardTitle>
            <CardDescription className="text-base mt-2">
              Check your inbox to verify your email
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                We&apos;ve sent a verification link to your email. Please click the link to activate your account.
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleResend}
                disabled={countdown > 0 || resending}
              >
                {resending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {resendSent
                  ? `Resend again (${countdown}s)`
                  : 'Resend verification email'}
              </Button>

              <Link href="mailto:support@mozetech.co.za" className="w-full">
                <Button variant="ghost" className="w-full gap-2">
                  <AtSign className="h-4 w-4" />
                  Change email address
                </Button>
              </Link>

              <Link href="mailto:support@mozetech.co.za" className="w-full">
                <Button variant="ghost" className="w-full gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Need help? Contact support
                </Button>
              </Link>
            </div>

            {resendSent && (
              <p className="text-sm text-green-600 text-center">
                Verification email resent successfully
              </p>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Didn&apos;t receive the email? Check your spam folder or try again later.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
