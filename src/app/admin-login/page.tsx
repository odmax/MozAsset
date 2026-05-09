'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type DebugStep = {
  label: string;
  status: 'pending' | 'running' | 'ok' | 'error';
  detail?: string;
};

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debug, setDebug] = useState<DebugStep[]>([]);
  const [debugMode, setDebugMode] = useState(false);
  const debugIdRef = useRef(0);

  useEffect(() => {
    console.log('ADMIN LOGIN PAGE LOADED - JS IS RUNNING');
    if (typeof window !== 'undefined' && window.location.search.includes('debug=true')) {
      setDebugMode(true);
      addStep('Page loaded, JS running', 'ok');
    }
  }, []);

  function addStep(label: string, status: DebugStep['status'], detail?: string) {
    const id = ++debugIdRef.current;
    setDebug(prev => [...prev, { label, status, detail }]);
    const emoji = status === 'ok' ? '✅' : status === 'error' ? '❌' : status === 'running' ? '⏳' : '⬜';
    console.log(`[DEBUG ${id}] ${emoji} ${label}${detail ? ': ' + detail : ''}`);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    console.log('=== FORM SUBMITTED ===');
    console.log('1. preventDefault called');
    e.preventDefault();
    console.log('2. preventDefault completed');
    setIsLoading(true);
    setError('');
    addStep('Form submitted, preventDefault() ran', 'ok');

    try {
      addStep('Calling POST /api/admin/login', 'running');
      console.log('3. Starting fetch to /api/admin/login');

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      console.log('4. Fetch completed, status:', res.status);
      addStep('API responded', 'ok', `Status ${res.status}`);

      const data = await res.json();
      console.log('5. Response JSON:', JSON.stringify(data));
      addStep('Response parsed', 'ok', JSON.stringify(data));

      if (!res.ok || data.error) {
        const errorMsg = data.error || `Login failed (${res.status})`;
        console.log('6. Login FAILED:', errorMsg);
        addStep('API returned error', 'error', errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      if (data.success) {
        console.log('6. Login SUCCESS');
        addStep('Login API success', 'ok');

        addStep('Checking /api/admin/session-check', 'running');
        console.log('7. Calling session-check...');
        const checkRes = await fetch('/api/admin/session-check');
        const checkData = await checkRes.json();
        console.log('8. Session-check response:', JSON.stringify(checkData));
        addStep('Session check responded', checkData.valid ? 'ok' : 'error', JSON.stringify(checkData));

        if (checkData.valid) {
          console.log('9. Session valid, redirecting to /admin');
          addStep('Redirecting to /admin', 'ok');
          window.location.href = '/admin';
        } else {
          console.error('9. adminSession cookie NOT valid after login');
          addStep('Session invalid - cookie may be rejected', 'error');
          setError('Session could not be established. The browser rejected the adminSession cookie. Check if the site uses HTTPS or try clearing cookies.');
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('CATCH BLOCK:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addStep('JavaScript error', 'error', msg);
      setError('An error occurred: ' + msg);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl text-white">
            <Package className="h-8 w-8" />
            <span>MozAssets</span>
          </Link>
          <p className="text-slate-400 text-sm mt-1">Platform Admin</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Admin Sign In</CardTitle>
            <CardDescription>Authorized personnel only</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg whitespace-pre-wrap break-words">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-4">
          Append <code className="text-slate-400">?debug=true</code> to URL to show debug panel
        </p>
      </div>

      {debugMode && debug.length > 0 && (
        <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto bg-slate-950 border border-slate-700 rounded-lg p-4 text-xs font-mono z-50">
          <p className="text-slate-400 font-bold mb-2">Debug Steps:</p>
          {debug.map((step, i) => (
            <div key={i} className={`mb-1 ${step.status === 'error' ? 'text-red-400' : step.status === 'ok' ? 'text-green-400' : step.status === 'running' ? 'text-yellow-400' : 'text-slate-500'}`}>
              <span>
                {step.status === 'ok' ? '✅' : step.status === 'error' ? '❌' : step.status === 'running' ? '⏳' : '⬜'}
              </span>
              {' '}{step.label}
              {step.detail && <span className="text-slate-400"> — {step.detail}</span>}
            </div>
          ))}
          {debug.length === 0 && <p className="text-slate-500">No steps yet</p>}
        </div>
      )}
    </div>
  );
}
