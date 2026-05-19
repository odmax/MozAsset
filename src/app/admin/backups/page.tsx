'use client';

import { useEffect, useState, useCallback } from 'react';
import { HardDrive, Download, Trash2, RefreshCw, Play, AlertCircle, CheckCircle, Clock, XCircle, Loader2, Database, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface BackupItem {
  id: string;
  status: string;
  storageBackend: string;
  filePath: string | null;
  fileSize: string | null;
  fileSizeBytes: number | null;
  md5Hash: string | null;
  errorMessage: string | null;
  triggeredBy: string | null;
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

const STATUS_CONFIG: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  PENDING: { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100', label: 'Pending' },
  RUNNING: { icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-100', label: 'Running' },
  SUCCESS: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Success' },
  FAILED: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100', label: 'Failed' },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function DatabaseBackupsPage() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const fetchBackups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backups');
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      } else {
        setError('Failed to load backups');
      }
    } catch {
      setError('Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const triggerBackup = async () => {
    setRunning(true);
    setError('');
    try {
      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || undefined }),
      });
      if (res.ok) {
        setNotes('');
        await fetchBackups();
      } else {
        const data = await res.json();
        setError(data.error || 'Backup failed');
      }
    } catch {
      setError('Failed to trigger backup');
    } finally {
      setRunning(false);
    }
  };

  const deleteBackup = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/backups/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        setBackups((prev) => prev.filter((b) => b.id !== deleteId));
      }
    } catch { /* ignore */ } finally {
      setDeleteId(null);
    }
  };

  const downloadBackup = (backup: BackupItem) => {
    window.open(`/api/admin/backups/${backup.id}`, '_blank');
  };

  const latestSuccess = backups.find((b) => b.status === 'SUCCESS');
  const totalBackups = backups.length;
  const successCount = backups.filter((b) => b.status === 'SUCCESS').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Database Backups</h1>
          <p className="text-muted-foreground">Manage automated database backups</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchBackups} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={triggerBackup} disabled={running}>
            {running ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {running ? 'Running...' : 'Run Backup'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Database className="h-4 w-4" /> Total Backups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalBackups}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" /> Successful
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-600">{successCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" /> Latest Backup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {latestSuccess ? formatDate(latestSuccess.createdAt) : 'No backups yet'}
            </p>
            {latestSuccess?.fileSize && (
              <p className="text-xs text-muted-foreground mt-1">
                Size: {latestSuccess.fileSize}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trigger notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Backup Notes (optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Pre-migration backup, before deploying v2.1..."
              className="flex-1 min-h-[40px]"
              rows={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Backup list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <HardDrive className="h-4 w-4" />
            Backup History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Database className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground mb-1">No backups yet</p>
              <p className="text-xs text-muted-foreground/70 mb-4">
                Run your first backup to protect your data
              </p>
              <Button variant="outline" size="sm" onClick={triggerBackup} disabled={running}>
                <Play className="h-3 w-3 mr-1" /> Run First Backup
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.map((backup) => {
                const sConfig = STATUS_CONFIG[backup.status] || STATUS_CONFIG.PENDING;
                const Icon = sConfig.icon;
                return (
                  <div
                    key={backup.id}
                    className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`mt-0.5 w-9 h-9 rounded-lg ${sConfig.bg} flex items-center justify-center shrink-0`}>
                        <Icon className={`h-4 w-4 ${sConfig.color} ${backup.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{backup.id}</span>
                          <Badge variant="outline" className="text-[10px]">{sConfig.label}</Badge>
                          <Badge variant="secondary" className="text-[10px]">{backup.storageBackend}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span>{formatDate(backup.createdAt)}</span>
                          {backup.fileSize && <span>{backup.fileSize}</span>}
                          {backup.triggeredBy && <span>by {backup.triggeredBy}</span>}
                        </div>
                        {backup.notes && (
                          <p className="text-xs text-muted-foreground mt-1 italic">{backup.notes}</p>
                        )}
                        {backup.errorMessage && (
                          <p className="text-xs text-red-500 mt-1">{backup.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      {backup.status === 'SUCCESS' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => downloadBackup(backup)}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteId(backup.id)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <Dialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Backup</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this backup? This will remove both the database record and the backup file. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={deleteBackup}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
