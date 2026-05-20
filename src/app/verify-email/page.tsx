'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const info = searchParams.get('info');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already'>('loading');
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('Missing verification token');
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          if (data.alreadyVerified) {
            setStatus('already');
          } else {
            fetch('/api/auth/verify-email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            })
              .then(res => res.json())
              .then(verifyData => {
                if (verifyData.error) {
                  setStatus('error');
                  setError(verifyData.error);
                } else {
                  setStatus('success');
                }
              })
              .catch(() => {
                setStatus('error');
                setError('Failed to verify email');
              });
          }
        } else {
          setStatus('error');
          setError(data.error || 'Invalid verification token');
        }
      })
      .catch(() => {
        setStatus('error');
        setError('Failed to verify email');
      });
  }, [token]);

  if (info === 'verify' && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
              <img src="/logo.png" alt="MozAssets" className="h-11 w-auto" />
            </Link>
          </div>
          <Card>
            <CardHeader className="text-center">
              <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
              <CardTitle className="text-xl">Verify Your Email</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Please verify your email address before accessing the dashboard.
                Check your inbox for the verification link.
              </p>
              <Button variant="outline" onClick={async () => {
                setResending(true);
                try { await fetch('/api/auth/resend-verification', { method: 'POST' }); setResendSent(true); } catch {}
                setResending(false);
              }} disabled={resending}>
                {resending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                {resendSent ? 'Email sent!' : 'Resend verification email'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl">
              <img src="/logo.png" alt="MozAssets" className="h-11 w-auto" />
            </Link>
          </div>
          <Card>
            <CardHeader className="text-center">
              <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <CardTitle className="text-xl">Verification Failed</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">{error}</p>
              {resendSent ? (
                <p className="text-sm text-green-600">Verification email resent. Check your inbox.</p>
              ) : (
                <div className="pt-4 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setResending(true);
                      try { await fetch('/api/auth/resend-verification', { method: 'POST' }); setResendSent(true); } catch {}
                      setResending(false);
                    }}
                    disabled={resending}
                  >
                    {resending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Resend verification email
                  </Button>
                  <Link href="/login">
                    <Button variant="ghost">Back to Login</Button>
                  </Link>
                </div>
              )}
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
              <img src="/logo.png" alt="MozAssets" className="h-11 w-auto" />
            </Link>
          </div>
          <Card>
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
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
              <img src="/logo.png" alt="MozAssets" className="h-11 w-auto" />
          </Link>
        </div>
        <Card>
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-xl">Email Verified!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">Your email has been successfully verified.</p>
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
