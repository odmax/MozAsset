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
      const decoded = Buffer.from(rawData, 'base64').toString('utf-8');
      payfastData = JSON.parse(decoded);
    } catch {
      // Invalid data
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', flexDirection: 'column' }}>
      {payfastUrl && payfastData ? (
        <>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', marginBottom: '1rem' }}>
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <p style={{ fontSize: '1.125rem', fontWeight: 500, margin: '0 0 0.5rem' }}>Redirecting to Payfast...</p>
          <p style={{ fontSize: '0.875rem', color: '#666', margin: 0 }}>Please wait while we redirect you to the secure payment page.</p>

          <form id="payfast-form" method="POST" action={payfastUrl} style={{ display: 'none' }}>
            {Object.entries(payfastData).map(([key, value]) => (
              <input key={key} type="hidden" name={key} value={value} />
            ))}
          </form>

          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

          <script
            dangerouslySetInnerHTML={{
              __html: `
                document.addEventListener('DOMContentLoaded', function() {
                  var form = document.getElementById('payfast-form');
                  if (form) {
                    setTimeout(function() { form.submit(); }, 100);
                  }
                });
              `,
            }}
          />

          <noscript>
            <div style={{ marginTop: '1rem' }}>
              <form method="POST" action={payfastUrl}>
                {Object.entries(payfastData).map(([key, value]) => (
                  <input key={key} type="hidden" name={key} value={value} />
                ))}
                <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', cursor: 'pointer' }}>
                  Proceed to Payfast
                </button>
              </form>
            </div>
          </noscript>
        </>
      ) : (
        <>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', margin: '0 0 0.5rem' }}>Invalid Checkout Data</h1>
          <p style={{ color: '#666', margin: '0 0 1rem' }}>No payment data received. Please go back and try again.</p>
          <a href="/dashboard" style={{ color: '#0066cc', textDecoration: 'underline' }}>Return to Dashboard</a>
        </>
      )}
    </div>
  );
}
