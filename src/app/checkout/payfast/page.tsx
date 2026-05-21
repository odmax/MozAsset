export const dynamic = 'force-dynamic';

export default function PayfastRedirectPage({
  searchParams,
}: {
  searchParams: { data?: string; url?: string };
}) {
  const rawData = searchParams.data;
  const payfastUrl = searchParams.url ? decodeURIComponent(searchParams.url) : '';

  let payfastData: Record<string, string> | null = null;

  if (rawData) {
    try {
      const decoded = atob(rawData);
      payfastData = JSON.parse(decoded);
    } catch {
      // Invalid data
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', flexDirection: 'column', padding: '1rem' }}>
      {payfastUrl && payfastData ? (
        <>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, margin: '0 0 0.5rem' }}>Redirecting to Payfast...</h1>
            <p style={{ fontSize: '0.875rem', color: '#666', margin: 0 }}>Click the button below if you are not redirected automatically.</p>
          </div>

          <form method="POST" action={payfastUrl}>
            {Object.entries(payfastData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
            <button type="submit" style={{ padding: '0.875rem 2rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '0.5rem', fontSize: '1rem', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Proceed to Payfast
            </button>
          </form>

          <p style={{ fontSize: '0.75rem', color: '#999', marginTop: '1rem' }}>
            You will be redirected to Payfast&apos;s secure payment page.
          </p>

          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var form = document.querySelector('form');
                    if (form) {
                      setTimeout(function() { form.submit(); }, 500);
                    }
                  } catch(e) {
                    console.error('Payfast auto-submit error:', e);
                  }
                })();
              `,
            }}
          />
        </>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', margin: '0 0 0.5rem' }}>Invalid Checkout Data</h1>
          <p style={{ color: '#666', margin: '0 0 1rem' }}>No payment data received. Please go back and try again.</p>
          <a href="/dashboard" style={{ color: '#0066cc', textDecoration: 'underline' }}>Return to Dashboard</a>
        </div>
      )}
    </div>
  );
}
