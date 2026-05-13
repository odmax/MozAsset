'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Mail,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface EmailLog {
  id: string;
  to: string;
  subject: string;
  type: string | null;
  status: string;
  error: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface Metrics {
  sent: number;
  failed: number;
  byType: { type: string | null; _count: number }[];
}

export default function AdminEmailsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/admin/email-logs?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination || null);
      setMetrics(data.metrics || null);
    } catch {
      setError('Failed to load email logs');
    }
    setLoading(false);
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Logs
          </h1>
          <p className="text-muted-foreground text-sm">Monitor sent and failed emails</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1.5">
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

      {metrics && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="p-4 rounded-xl border bg-gradient-to-br from-emerald-50/50 to-transparent">
            <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium mb-1">
              <CheckCircle className="h-4 w-4" />
              Sent
            </div>
            <p className="text-2xl font-bold">{metrics.sent}</p>
          </div>
          <div className="p-4 rounded-xl border bg-gradient-to-br from-red-50/50 to-transparent">
            <div className="flex items-center gap-2 text-sm text-red-600 font-medium mb-1">
              <XCircle className="h-4 w-4" />
              Failed
            </div>
            <p className="text-2xl font-bold">{metrics.failed}</p>
          </div>
          <div className="p-4 rounded-xl border bg-gradient-to-br from-blue-50/50 to-transparent">
            <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mb-1">
              <Mail className="h-4 w-4" />
              Total
            </div>
            <p className="text-2xl font-bold">{(metrics.sent + metrics.failed).toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All types</option>
          {metrics?.byType.map((t) => (
            <option key={t.type || 'null'} value={t.type || ''}>{t.type || 'unspecified'}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Mail className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No email logs</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Emails will appear here once sent</p>
        </div>
      ) : (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">To</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Subject</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{log.to}</td>
                  <td className="px-4 py-3 max-w-[300px] truncate">{log.subject}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {log.type || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {log.status === 'sent' ? (
                      <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Sent
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600 text-xs font-medium" title={log.error || ''}>
                        <XCircle className="h-3.5 w-3.5" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(log.createdAt).toLocaleString()}
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
  );
}
