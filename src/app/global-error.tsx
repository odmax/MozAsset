'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);

  return (
    <html>
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif', background: '#f4f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 48, maxWidth: 480, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.6, margin: '0 0 24px' }}>Our team has been notified. Please try refreshing the page.</p>
          <button onClick={reset} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '12px 32px', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Try Again</button>
        </div>
      </body>
    </html>
  );
}
