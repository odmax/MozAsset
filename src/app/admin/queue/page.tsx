'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Activity, CheckCircle, XCircle, Clock, AlertTriangle,
  Loader2, RefreshCw, Play, Trash2,
} from 'lucide-react';

interface QueueStats {
  queue: string;
  pending: number;
  active: number;
  failed: number;
  dead: number;
  delayed: number;
  completed: number;
  processingTime: number[];
}

interface Job {
  id: string;
  queue: string;
  type: string;
  status: string;
  retries: number;
  maxRetries: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  failedAt?: number;
  data?: Record<string, unknown>;
}

interface JobsResponse {
  jobs: Job[];
  total: number;
}

const QUEUE_NAMES = ['email', 'notification', 'export', 'file', 'billing', 'maintenance'];

const STATUS_BADGES: Record<string, { color: string; icon: React.ReactNode }> = {
  pending: { color: 'bg-gray-100 text-gray-700', icon: <Clock className="h-3 w-3" /> },
  active: { color: 'bg-blue-100 text-blue-700', icon: <Activity className="h-3 w-3" /> },
  completed: { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle className="h-3 w-3" /> },
  failed: { color: 'bg-red-100 text-red-700', icon: <XCircle className="h-3 w-3" /> },
  dead: { color: 'bg-red-100 text-red-700', icon: <AlertTriangle className="h-3 w-3" /> },
  delayed: { color: 'bg-amber-100 text-amber-700', icon: <Clock className="h-3 w-3" /> },
};

export default function AdminQueuePage() {
  const [stats, setStats] = useState<QueueStats[]>([]);
  const [selectedQueue, setSelectedQueue] = useState('email');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [jobsPage, setJobsPage] = useState(1);
  const [jobsStatus, setJobsStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/queue/stats');
      if (!res.ok) return;
      const data = await res.json();
      setStats(data.queues || []);
    } catch {}
  }, []);

  const fetchJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const params = new URLSearchParams({
        queue: selectedQueue,
        page: String(jobsPage),
        limit: '20',
      });
      if (jobsStatus !== 'all') params.set('status', jobsStatus);
      const res = await fetch(`/api/queue/jobs?${params}`);
      if (!res.ok) throw new Error('Failed');
      const data: JobsResponse = await res.json();
      setJobs(data.jobs || []);
      setJobsTotal(data.total || 0);
    } catch {
      setError('Failed to load jobs');
    }
    setJobsLoading(false);
  }, [selectedQueue, jobsPage, jobsStatus]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchJobs()]).finally(() => setLoading(false));
  }, [fetchStats, fetchJobs]);

  const refreshAll = () => {
    setLoading(true);
    Promise.all([fetchStats(), fetchJobs()]).finally(() => setLoading(false));
  };

  const retryJob = async (jobId: string) => {
    try {
      await fetch(`/api/queue/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: selectedQueue }),
      });
      fetchJobs();
    } catch {}
  };

  const retryAll = async () => {
    try {
      await fetch('/api/queue/retry-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue: selectedQueue }),
      });
      fetchJobs();
    } catch {}
  };

  const runCleanup = async () => {
    try {
      await fetch('/api/queue/cleanup', { method: 'POST' });
      fetchStats();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Queue Dashboard
          </h1>
          <p className="text-muted-foreground text-sm">Monitor background jobs and queue health</p>
        </div>
        <div className="flex gap-2">
          <button onClick={runCleanup} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted flex items-center gap-1">
            <Trash2 className="h-3 w-3" /> Cleanup
          </button>
          <button onClick={refreshAll} className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted flex items-center gap-1">
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stats.map((s) => (
              <button
                key={s.queue}
                onClick={() => { setSelectedQueue(s.queue); setJobsPage(1); }}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  selectedQueue === s.queue ? 'ring-2 ring-primary border-primary' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm capitalize">{s.queue}</h3>
                  <span className="text-xs text-muted-foreground">{s.completed} done</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <p className="text-lg font-bold text-amber-600">{s.pending}</p>
                    <p className="text-muted-foreground">Pending</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-blue-600">{s.active}</p>
                    <p className="text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600">{s.failed + s.dead}</p>
                    <p className="text-muted-foreground">Failed</p>
                  </div>
                </div>
                {s.processingTime.length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Avg: {Math.round(s.processingTime.reduce((a, b) => a + b, 0) / s.processingTime.length)}ms
                  </p>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold capitalize">{selectedQueue} Jobs</h2>
              <div className="flex gap-2">
                <select
                  value={jobsStatus}
                  onChange={(e) => { setJobsStatus(e.target.value); setJobsPage(1); }}
                  className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="failed">Failed</option>
                  <option value="dead">Dead</option>
                  <option value="delayed">Delayed</option>
                </select>
                <button
                  onClick={retryAll}
                  className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted flex items-center gap-1"
                >
                  <Play className="h-3 w-3" /> Retry All Failed
                </button>
              </div>
            </div>

            {jobsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No {jobsStatus === 'all' ? '' : jobsStatus} jobs</p>
              </div>
            ) : (
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 border-b">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Retries</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Error</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => {
                      const badge = STATUS_BADGES[job.status] || STATUS_BADGES.pending;
                      return (
                        <tr key={job.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{job.type}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                              {badge.icon}
                              {job.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {job.retries}/{job.maxRetries}
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            {job.error ? (
                              <span className="text-xs text-red-600 truncate block" title={job.error}>
                                {job.error}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(job.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {(job.status === 'failed' || job.status === 'dead') && (
                              <button
                                onClick={() => retryJob(job.id)}
                                className="p-1 rounded hover:bg-muted text-muted-foreground"
                                title="Retry"
                              >
                                <Play className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {jobsTotal > 20 && (
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setJobsPage((p) => Math.max(1, p - 1))}
                  disabled={jobsPage === 1}
                  className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-xs text-muted-foreground">
                  Page {jobsPage} of {Math.ceil(jobsTotal / 20)}
                </span>
                <button
                  onClick={() => setJobsPage((p) => Math.min(Math.ceil(jobsTotal / 20), p + 1))}
                  disabled={jobsPage >= Math.ceil(jobsTotal / 20)}
                  className="px-3 py-1.5 text-xs rounded-lg border hover:bg-muted disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
