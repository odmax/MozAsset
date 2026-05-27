'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already'>('loading');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(2);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Missing verification token');
      return;
    }

    const verifyToken = async () => {
      try {
        const validateRes = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        const validateData = await validateRes.json();

        if (!validateData.valid) {
          setStatus('error');
          setError(validateData.error || 'Invalid verification token');
          return;
        }

        if (validateData.alreadyVerified) {
          setStatus('already');
          return;
        }

        const verifyRes = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const verifyData = await verifyRes.json();

        if (verifyData.error) {
          if (verifyData.expired) {
            setStatus('error');
            setError('This verification link has expired. Request a new one below.');
          } else {
            setStatus('error');
            setError(verifyData.error);
          }
          return;
        }

        setStatus('success');
        toast({ title: 'Email verified!', description: 'Redirecting to dashboard...' });

        const timer = setInterval(() => {
          setRedirectCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              router.push('/dashboard');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(timer);
      } catch {
        setStatus('error');
        setError('Failed to verify email. Please try again.');
      }
    };

    verifyToken();
  }, [token, router]);

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (res.ok) {
        setResendSent(true);
        toast({ title: 'Verification email sent', description: 'Check your inbox for the new link.' });
      }
    } catch {}
    setResending(false);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
            <p className="mt-4 text-muted-foreground">Verifying your email...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
              <img src="/logo1.png" alt="MozAssets" className="h-11 w-auto" />
            </Link>
          </div>
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-2xl">Email Verified!</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">Your email has been successfully verified.</p>
              <p className="text-sm text-muted-foreground">
                Redirecting to dashboard in {redirectCountdown}s...
              </p>
              <div className="pt-4">
                <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => router.push('/dashboard')}>
                  Go to Dashboard now
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (status === 'already') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
              <img src="/logo1.png" alt="MozAssets" className="h-11 w-auto" />
            </Link>
          </div>
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <CardTitle className="text-xl">Email Already Verified</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">Your email has already been verified.</p>
              <div className="pt-4">
                <Link href="/dashboard">
                  <Button className="bg-purple-600 hover:bg-purple-700">Go to Dashboard</Button>
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
            <img src="/logo1.png" alt="MozAssets" className="h-11 w-auto" />
          </Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl">Verification Failed</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <div className="pt-4 flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {resendSent ? 'Email sent!' : 'Resend verification email'}
              </Button>
              <Link href="/login">
                <Button variant="ghost">Back to Login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  );
}
