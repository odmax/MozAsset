'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Shield,
  AlertTriangle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Ban,
  Eye,
  KeyRound,
  FileWarning,
} from 'lucide-react';

interface RateLimiterEntry {
  key: string;
  requestCount: number;
  oldestTimestamp: number | null;
  newestTimestamp: number | null;
}

interface RateLimiterData {
  name: string;
  config: {
    strategy: string;
    maxRequests: number;
    windowMs: number;
  };
  activeKeys: number;
  entries: RateLimiterEntry[];
}

interface SecurityEvent {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface ActionCount {
  action: string;
  _count: number;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  LOGIN_FAILED: <Ban className="h-4 w-4 text-red-500" />,
  LOGIN_SUCCESS: <KeyRound className="h-4 w-4 text-emerald-500" />,
  SECURITY_ALERT: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  CSRF_VIOLATION: <FileWarning className="h-4 w-4 text-orange-500" />,
  RATE_LIMIT_HIT: <Ban className="h-4 w-4 text-red-500" />,
  UNAUTHORIZED_ACCESS: <Eye className="h-4 w-4 text-red-500" />,
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN_FAILED: 'Failed Login',
  LOGIN_SUCCESS: 'Successful Login',
  SECURITY_ALERT: 'Security Alert',
  CSRF_VIOLATION: 'CSRF Violation',
  RATE_LIMIT_HIT: 'Rate Limit Hit',
  UNAUTHORIZED_ACCESS: 'Unauthorized Access',
};

export default function AdminSecurityPage() {
  const [rateLimiters, setRateLimiters] = useState<RateLimiterData[]>([]);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [actionCounts, setActionCounts] = useState<ActionCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const fetchRateLimiters = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/security/rate-limits');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRateLimiters(data.limiters || []);
    } catch {
      setError('Failed to load rate limiter data');
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (actionFilter) params.set('action', actionFilter);

      const res = await fetch(`/api/admin/security/events?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setEvents(data.events || []);
      setPagination(data.pagination || null);
      setActionCounts(data.actionCounts || []);
    } catch {
      setError('Failed to load security events');
    }
    setEventsLoading(false);
  }, [page, actionFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchRateLimiters(), fetchEvents()]).finally(() => setLoading(false));
  }, [fetchRateLimiters, fetchEvents]);

  const refreshAll = () => {
    setLoading(true);
    Promise.all([fetchRateLimiters(), fetchEvents()]).finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Security Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">Monitor security events, rate limits, and threats</p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {/* Rate Limiter Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : rateLimiters.map((rl) => (
          <div key={rl.name} className="p-4 rounded-xl border bg-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm capitalize">{rl.name} Limiter</h3>
              <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                {rl.config.strategy}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span>Max {rl.config.maxRequests} req / {rl.config.windowMs / 1000}s</span>
              <span>Active keys: {rl.activeKeys}</span>
            </div>
            {rl.entries.length > 0 && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {rl.entries.slice(0, 10).map((entry) => (
                  <div key={entry.key} className="flex items-center justify-between text-xs bg-muted/30 px-2 py-1 rounded">
                    <span className="truncate max-w-[200px] font-mono">{entry.key}</span>
                    <span className="text-muted-foreground">{entry.requestCount} hits</span>
                  </div>
                ))}
                {rl.entries.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">+{rl.entries.length - 10} more</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Security Events */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Security Events
          </h2>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="">All events</option>
            {actionCounts.map((ac) => (
              <option key={ac.action} value={ac.action}>
                {ACTION_LABELS[ac.action] || ac.action} ({ac._count})
              </option>
            ))}
          </select>
        </div>

        {eventsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No security events</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Security events will appear here</p>
          </div>
        ) : (
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Event</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Details</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">IP Address</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ACTION_ICONS[event.action] || <AlertTriangle className="h-4 w-4" />}
                        <span className="font-medium">{ACTION_LABELS[event.action] || event.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[300px]">
                      <div className="text-xs text-muted-foreground truncate">
                        {event.metadata ? JSON.stringify(event.metadata).slice(0, 100) : event.entityId}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono text-muted-foreground">{event.ipAddress || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {new Date(event.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
