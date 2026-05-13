'use client';

import { useEffect, useState, useCallback } from 'react';
import { HardDrive, Upload, File, AlertCircle, Loader2, RefreshCw, Building2, Image, FileText } from 'lucide-react';

interface OrgStorage {
  organizationId: string | null;
  organizationName: string;
  size: number;
  count: number;
}

interface TypeStats {
  type: string;
  count: number;
  size: number;
}

interface StorageStats {
  totalSize: number;
  totalFiles: number;
  uploadsToday: number;
  recentUploads: { id: string; originalName: string; size: number; type: string; createdAt: string }[];
  topOrganizations: OrgStorage[];
  byType: TypeStats[];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const TYPE_LABELS: Record<string, string> = {
  ASSET_IMAGE: 'Asset Images',
  INVOICE: 'Invoices',
  WARRANTY_DOC: 'Warranty Documents',
  MAINTENANCE_RECEIPT: 'Maintenance Receipts',
  MANUAL: 'Manuals',
  SUPPORT_ATTACHMENT: 'Support Attachments',
  OTHER: 'Other',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  ASSET_IMAGE: <Image className="h-4 w-4" />,
  INVOICE: <FileText className="h-4 w-4" />,
  OTHER: <File className="h-4 w-4" />,
};

export default function AdminStoragePage() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/files/stats');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats(data);
    } catch {
      setError('Failed to load storage stats');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <HardDrive className="h-6 w-6" />
            File Storage
          </h1>
          <p className="text-muted-foreground text-sm">Monitor file storage usage across organizations</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchStats} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 rounded-xl border bg-gradient-to-br from-blue-50/50 to-transparent">
              <div className="flex items-center gap-2 text-sm text-blue-600 font-medium mb-1">
                <HardDrive className="h-4 w-4" />
                Total Storage
              </div>
              <p className="text-2xl font-bold">{formatBytes(stats.totalSize)}</p>
            </div>
            <div className="p-4 rounded-xl border bg-gradient-to-br from-emerald-50/50 to-transparent">
              <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium mb-1">
                <File className="h-4 w-4" />
                Total Files
              </div>
              <p className="text-2xl font-bold">{stats.totalFiles.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl border bg-gradient-to-br from-purple-50/50 to-transparent">
              <div className="flex items-center gap-2 text-sm text-purple-600 font-medium mb-1">
                <Upload className="h-4 w-4" />
                Uploads Today
              </div>
              <p className="text-2xl font-bold">{stats.uploadsToday}</p>
            </div>
            <div className="p-4 rounded-xl border bg-gradient-to-br from-amber-50/50 to-transparent">
              <div className="flex items-center gap-2 text-sm text-amber-600 font-medium mb-1">
                <File className="h-4 w-4" />
                Avg File Size
              </div>
              <p className="text-2xl font-bold">
                {stats.totalFiles > 0 ? formatBytes(stats.totalSize / stats.totalFiles) : '0 B'}
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border">
              <div className="p-4 border-b">
                <h2 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Largest Organizations
                </h2>
              </div>
              <div className="divide-y">
                {stats.topOrganizations.map((org) => (
                  <div key={org.organizationId || 'null'} className="flex items-center justify-between p-3 text-sm">
                    <span className="font-medium truncate max-w-[200px]">{org.organizationName}</span>
                    <div className="text-right">
                      <p className="font-medium">{formatBytes(org.size)}</p>
                      <p className="text-xs text-muted-foreground">{org.count} files</p>
                    </div>
                  </div>
                ))}
                {stats.topOrganizations.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No organizations yet</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border">
              <div className="p-4 border-b">
                <h2 className="font-semibold flex items-center gap-2">
                  <File className="h-4 w-4" />
                  Storage by Type
                </h2>
              </div>
              <div className="divide-y">
                {stats.byType.map((t) => (
                  <div key={t.type} className="flex items-center justify-between p-3 text-sm">
                    <span className="flex items-center gap-2">
                      {TYPE_ICONS[t.type] || <File className="h-4 w-4" />}
                      {TYPE_LABELS[t.type] || t.type}
                    </span>
                    <div className="text-right">
                      <p className="font-medium">{formatBytes(t.size)}</p>
                      <p className="text-xs text-muted-foreground">{t.count} files</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Recent Uploads</h2>
            </div>
            <div className="divide-y">
              {stats.recentUploads.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="truncate max-w-[300px]">{f.originalName}</span>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>{TYPE_LABELS[f.type] || f.type}</span>
                    <span>{formatBytes(f.size)}</span>
                    <span>{new Date(f.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Button({ variant, size, className, onClick, children, ...props }: any) {
  const base = 'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';
  const variants: Record<string, string> = {
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  };
  const sizes: Record<string, string> = {
    sm: 'h-9 px-3',
  };
  return (
    <button
      className={`${base} ${variants[variant] || ''} ${sizes[size] || ''} ${className || ''}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
