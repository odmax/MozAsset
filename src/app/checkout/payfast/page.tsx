'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function PayfastRedirectForm() {
  const searchParams = useSearchParams();
  const formSubmitted = useRef(false);
  const [manualUrl, setManualUrl] = useState('');
  const [error, setError] = useState(false);

  const rawData = searchParams.get('data');
  const payfastUrl = searchParams.get('url') ? decodeURIComponent(searchParams.get('url')!) : '';

  useEffect(() => {
    if (formSubmitted.current || !rawData || !payfastUrl) {
      if (!rawData || !payfastUrl) setError(true);
      return;
    }
    formSubmitted.current = true;

    let payfastData: Record<string, string> | null = null;
    try {
      const decoded = atob(rawData);
      payfastData = JSON.parse(decoded);
    } catch (e) {
      console.error('[Payfast] Failed to decode checkout data:', e);
      setError(true);
      return;
    }

    if (!payfastData) {
      console.error('[Payfast] No checkout data after decode');
      setError(true);
      return;
    }

    console.log('[Payfast] Submitting form to:', payfastUrl);
    console.log('[Payfast] Fields:', Object.keys(payfastData).join(', '));

    // Create a form dynamically and submit it (avoids Next.js hydration issues)
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = payfastUrl;
    form.style.display = 'none';

    for (const [key, value] of Object.entries(payfastData)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = String(value);
      form.appendChild(input);
    }

    document.body.appendChild(form);

    try {
      form.submit();
    } catch (e) {
      console.error('[Payfast] form.submit() failed:', e);
      setManualUrl(payfastUrl);
      return;
    }

    // If still here after 5s, show the manual button
    setTimeout(() => {
      if (document.body.contains(form)) {
        console.log('[Payfast] Form did not navigate, showing manual button');
        setManualUrl(payfastUrl);
      }
    }, 5000);
  }, [rawData, payfastUrl]);

  if (error || !rawData || !payfastUrl) {
    return (
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', margin: '0 0 0.5rem' }}>Invalid Checkout Data</h1>
        <p style={{ color: '#666', margin: '0 0 1rem' }}>No payment data received. Please go back and try again.</p>
        <a href="/dashboard" style={{ color: '#0066cc', textDecoration: 'underline' }}>Return to Dashboard</a>
      </div>
    );
  }

  if (manualUrl) {
    let payfastData: Record<string, string> | null = null;
    try {
      const decoded = atob(rawData!);
      payfastData = JSON.parse(decoded);
    } catch { /* ignore */ }

    return (
      <>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Redirect to Payfast</h1>
          <p style={{ fontSize: '0.875rem', color: '#666', margin: 0 }}>Click the button below to proceed to the secure payment page.</p>
        </div>

        <form method="POST" action={manualUrl}>
          {payfastData && Object.entries(payfastData).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <button type="submit" style={{ padding: '0.875rem 2rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
            Proceed to Payfast
          </button>
        </form>
      </>
    );
  }

  return (
    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Redirecting to Payfast...</h1>
      <p style={{ fontSize: '0.875rem', color: '#666', margin: 0 }}>Please wait while you are redirected.</p>
    </div>
  );
}

export default function PayfastRedirectPage() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', flexDirection: 'column', padding: '1rem' }}>
      <Suspense fallback={
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Loading...</h1>
        </div>
      }>
        <PayfastRedirectForm />
      </Suspense>
    </div>
  );
}
