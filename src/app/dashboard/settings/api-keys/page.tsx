'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FeatureLock } from '@/components/ui/feature-lock';
import { Loader2, Key, Copy, Check, Trash2, RotateCw, Plus, AlertTriangle, Shield } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ApiKeyData {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  permissions: any;
  usageCount: number;
  rateLimit: number;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createRateLimit, setCreateRateLimit] = useState(100);
  const [createLoading, setCreateLoading] = useState(false);
  const [rawKey, setRawKey] = useState('');
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);

  useEffect(() => { fetchKeys(); }, []);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/api-keys');
      const data = await res.json();
      if (data.code === 'UPGRADE_REQUIRED') {
        setIsEnterprise(false);
        setError('');
      } else if (res.ok) {
        setKeys(data.keys || []);
        setIsEnterprise(true);
      } else {
        setError(data.error || 'Failed to load API keys');
      }
    } catch {
      setError('Failed to connect');
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch('/api/dashboard/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName, rateLimit: createRateLimit }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
        return;
      }
      setRawKey(data.rawKey);
      setShowKeyDialog(true);
      setCreateOpen(false);
      setCreateName('');
      setCreateRateLimit(100);
      fetchKeys();
      toast({ title: 'API key created', description: 'Copy the key now — it won\'t be shown again.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to create key', variant: 'destructive' });
    }
    setCreateLoading(false);
  };

  const handleRevoke = async (id: string) => {
    setRevoking(id);
    try {
      const res = await fetch(`/api/dashboard/api-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
        return;
      }
      setKeys(keys.filter(k => k.id !== id));
      toast({ title: 'Revoked', description: 'API key has been revoked' });
    } catch {
      toast({ title: 'Error', description: 'Failed to revoke key', variant: 'destructive' });
    }
    setRevoking(null);
  };

  const handleRotate = async (id: string) => {
    setRotating(id);
    try {
      const res = await fetch(`/api/dashboard/api-keys/${id}/rotate`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Failed', description: data.error, variant: 'destructive' });
        return;
      }
      setRawKey(data.rawKey);
      setShowKeyDialog(true);
      fetchKeys();
      toast({ title: 'Rotated', description: 'API key rotated. Copy the new key now.' });
    } catch {
      toast({ title: 'Error', description: 'Failed to rotate key', variant: 'destructive' });
    }
    setRotating(null);
  };

  const copyRawKey = async () => {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
        <p className="text-muted-foreground">Manage API keys for integrations and programmatic access</p>
      </div>

      {!isEnterprise && !loading ? (
        <FeatureLock
          featureName="API Key Management"
          featureDescription="Generate and manage API keys for custom integrations and programmatic access."
          requiredPlan="ENTERPRISE"
          currentPlan="FREE"
        />
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Your API Keys
                </CardTitle>
                <CardDescription>
                  Keys are scoped to your organization. Store them securely.
                </CardDescription>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Generate Key
              </Button>
            </CardHeader>
            <CardContent>
              {keys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No API keys yet</p>
                  <p className="text-sm">Generate a key to get started with API access</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {keys.map(k => (
                    <div key={k.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-mono text-xs">{k.prefix}***</Badge>
                          <span className="font-medium">{k.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Created {new Date(k.createdAt).toLocaleDateString()}</span>
                          {k.lastUsedAt && <span>Last used {new Date(k.lastUsedAt).toLocaleDateString()}</span>}
                          <span>Used {k.usageCount} times</span>
                          <span>Rate: {k.rateLimit}/min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRotate(k.id)}
                          disabled={rotating === k.id}
                        >
                          {rotating === k.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleRevoke(k.id)}
                          disabled={revoking === k.id}
                        >
                          {revoking === k.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Key Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for programmatic access. The raw key will only be shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="keyName">Key name</Label>
              <Input
                id="keyName"
                placeholder="Production Server"
                value={createName}
                onChange={e => setCreateName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rateLimit">Rate limit (requests/minute)</Label>
              <Input
                id="rateLimit"
                type="number"
                min={1}
                value={createRateLimit}
                onChange={e => setCreateRateLimit(Number(e.target.value) || 100)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createLoading || !createName.trim()}>
              {createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Raw Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={(o) => { if (!o) { setRawKey(''); setShowKeyDialog(false); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Your API Key
            </DialogTitle>
            <DialogDescription>
              Copy this key now. <strong>It will not be shown again.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <Input value={rawKey} readOnly className="font-mono text-sm" />
              <Button variant="outline" size="icon" onClick={copyRawKey}>
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setRawKey(''); setShowKeyDialog(false); }}>I've copied the key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
