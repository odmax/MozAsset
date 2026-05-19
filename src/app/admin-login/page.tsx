'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  useEffect(() => {
    console.log('ADMIN LOGIN PAGE MOUNTED - JS IS RUNNING');
    addDebug('Page loaded, JS running');
  }, []);

  function addDebug(msg: string) {
    console.log('[ADMIN-LOGIN]', msg);
    setDebugLog(prev => [...prev, msg]);
  }

  const doLogin = async () => {
    addDebug('doLogin started');
    setIsLoading(true);
    setError('');

    try {
      addDebug('Fetching POST /api/admin/login...');
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      addDebug(`API responded status ${res.status}`);
      const data = await res.json();
      addDebug(`Response: ${JSON.stringify(data)}`);

      if (!res.ok || data.error) {
        addDebug(`Error: ${data.error}`);
        setError(data.error || 'Login failed');
        setIsLoading(false);
        return;
      }

      if (data.success) {
        addDebug('Login API success, redirecting to /admin');
        window.location.href = '/admin';
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      addDebug(`CATCH: ${msg}`);
      setError('An error occurred: ' + msg);
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addDebug('Form onSubmit fired (Enter key)');
    doLogin();
  };

  const handleButtonClick = () => {
    addDebug('Button clicked');
    doLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 font-bold text-2xl text-white">
            <img src="/logo.png" alt="MozAssets" className="h-11 w-auto" />
          </Link>
          <p className="text-slate-400 text-sm mt-1">Platform Admin</p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Admin Sign In</CardTitle>
            <CardDescription>Authorized personnel only</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg break-words">
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
                  placeholder="ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="button" className="w-full" disabled={isLoading} onClick={handleButtonClick}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-4 text-xs text-slate-500 text-center">
          {debugLog.length > 0 && (
            <details>
              <summary className="cursor-pointer hover:text-slate-300">Debug ({debugLog.length} steps)</summary>
              <div className="text-left mt-2 max-h-32 overflow-y-auto bg-slate-950 rounded p-2">
                {debugLog.map((msg, i) => (
                  <div key={i} className={`mb-0.5 ${msg.includes('ERROR') || msg.includes('Error') || msg.includes('CATCH') ? 'text-red-400' : msg.includes('valid') ? 'text-green-400' : 'text-slate-400'}`}>
                    {i + 1}. {msg}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
