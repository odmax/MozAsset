'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';

export function DeactivatedBanner({ reason }: { reason: string | null }) {
  const router = useRouter();
  const [reactivating, setReactivating] = useState(false);
  const [message, setMessage] = useState('');

  const handleReactivate = async () => {
    setReactivating(true);
    setMessage('');
    try {
      const res = await fetch('/api/account/reactivate', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage('Workspace reactivated! Reloading...');
        setTimeout(() => router.refresh(), 1500);
      } else {
        setMessage(data.error || 'Failed to reactivate');
      }
    } catch {
      setMessage('Failed to reactivate');
    } finally {
      setReactivating(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-amber-800 text-sm">
            Your FREE workspace was deactivated due to inactivity
          </p>
          <p className="text-sm text-amber-700 mt-1">
            {reason
              ? `Reason: ${reason}. `
              : ''}
            You can still view your data, but creating, editing, or deleting is disabled. Reactivate to restore full access.
          </p>
          {message && (
            <p className={`text-sm mt-2 ${message.includes('reactivated') ? 'text-emerald-700' : 'text-red-600'}`}>
              {message}
            </p>
          )}
        </div>
        <button
          onClick={handleReactivate}
          disabled={reactivating}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 shrink-0"
        >
          {reactivating ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Reactivating...</>
          ) : (
            <><RefreshCw className="h-4 w-4" /> Reactivate Account</>
          )}
        </button>
      </div>
    </div>
  );
}
