'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FeatureLock } from '@/components/ui/feature-lock';
import { Loader2, ClipboardCheck, Plus, Search, CheckCircle, XCircle, AlertTriangle, ArrowRight, Move, Package, BarChart3 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface VerItem {
  id: string;
  assetId: string;
  expectedLocation: string | null;
  verifiedLocation: string | null;
  expectedUser: string | null;
  status: string;
  notes: string | null;
  verifiedAt: string | null;
  verifiedBy: { name: string } | null;
  asset: { id: string; assetTag: string; name: string; status: string; category: { name: string } | null };
}

interface VerSession {
  id: string;
  name: string;
  status: string;
  branchId: string | null;
  departmentId: string | null;
  locationId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  createdBy: { name: string | null; email: string } | null;
  items: { status: string }[] | VerItem[];
}

const STATUS_BADGES: Record<string, { cls: string; label: string }> = {
  DRAFT: { cls: 'bg-slate-100 text-slate-700', label: 'Draft' },
  ACTIVE: { cls: 'bg-blue-100 text-blue-700', label: 'Active' },
  COMPLETED: { cls: 'bg-green-100 text-green-700', label: 'Completed' },
  CANCELLED: { cls: 'bg-red-100 text-red-700', label: 'Cancelled' },
};

const ITEM_STATUS_BADGES: Record<string, { cls: string; label: string; icon: any }> = {
  PENDING: { cls: 'bg-slate-100 text-slate-700', label: 'Pending', icon: null },
  VERIFIED: { cls: 'bg-green-100 text-green-700', label: 'Verified', icon: CheckCircle },
  MISSING: { cls: 'bg-red-100 text-red-700', label: 'Missing', icon: XCircle },
  MOVED: { cls: 'bg-amber-100 text-amber-700', label: 'Moved', icon: Move },
  DAMAGED: { cls: 'bg-orange-100 text-orange-700', label: 'Damaged', icon: AlertTriangle },
};

export default function StockVerificationPage() {
  const [sessions, setSessions] = useState<VerSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDept, setCreateDept] = useState('');
  const [createLoc, setCreateLoc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<VerSession | null>(null);
  const [sessionDetail, setSessionDetail] = useState<VerSession | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [completing, setCompleting] = useState(false);

  useEffect(() => { fetchSessions(); }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/stock-verification');
      const data = await res.json();
      if (data.code === 'UPGRADE_REQUIRED') { setIsEnterprise(false); }
      else if (res.ok) { setSessions(data.sessions || []); setIsEnterprise(true); }
    } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch('/api/dashboard/stock-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName, departmentId: createDept || null, locationId: createLoc || null }),
      });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Failed', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'Session created', description: `${data.itemCount} assets added` });
      setCreateOpen(false);
      setCreateName('');
      setCreateDept('');
      setCreateLoc('');
      fetchSessions();
    } catch {}
    setCreateLoading(false);
  };

  const openSession = async (s: VerSession) => {
    setSelectedSession(s);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/dashboard/stock-verification/${s.id}`);
      const data = await res.json();
      setSessionDetail(data.session);
    } catch {}
    setDetailLoading(false);
  };

  const handleVerify = async (itemId: string, status: string) => {
    if (!selectedSession) return;
    try {
      const res = await fetch(`/api/dashboard/stock-verification/${selectedSession.id}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast({ title: 'Failed', description: 'Could not update item', variant: 'destructive' }); return; }
      if (sessionDetail) {
        const items = (sessionDetail.items as VerItem[]).map(i =>
          i.id === itemId ? { ...i, status, verifiedAt: new Date().toISOString() } : i
        );
        setSessionDetail({ ...sessionDetail, items, status: sessionDetail.status === 'DRAFT' ? 'ACTIVE' : sessionDetail.status });
      }
    } catch {}
  };

  const handleComplete = async () => {
    if (!selectedSession) return;
    setCompleting(true);
    try {
      const res = await fetch(`/api/dashboard/stock-verification/${selectedSession.id}/complete`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Cannot complete', description: data.error, variant: 'destructive' }); return; }
      toast({ title: 'Completed', description: 'Stock verification session completed' });
      setDetailOpen(false);
      fetchSessions();
    } catch {}
    setCompleting(false);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const filteredItems = sessionDetail ? (sessionDetail.items as VerItem[]).filter(i => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return i.asset.assetTag?.toLowerCase().includes(q) || i.asset.name?.toLowerCase().includes(q);
  }) : [];

  const itemStats = (items: { status: string }[]) => {
    const total = items.length;
    const verified = items.filter(i => i.status === 'VERIFIED').length;
    const missing = items.filter(i => i.status === 'MISSING').length;
    const moved = items.filter(i => i.status === 'MOVED').length;
    const damaged = items.filter(i => i.status === 'DAMAGED').length;
    const pending = items.filter(i => i.status === 'PENDING').length;
    return { total, verified, missing, moved, damaged, pending, pct: total > 0 ? Math.round((verified / total) * 100) : 0 };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stock Verification</h1>
        <p className="text-muted-foreground">Run asset verification sessions and track discrepancies</p>
      </div>

      {!isEnterprise ? (
        <FeatureLock featureName="Stock Verification" featureDescription="Run stock-take sessions, track asset discrepancies, and generate verification reports." requiredPlan="ENTERPRISE" currentPlan="FREE" />
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Verification Sessions</CardTitle>
                <CardDescription>Create and manage stock-take sessions for your assets</CardDescription>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />New Session</Button>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No verification sessions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map(s => {
                    const stats = itemStats(s.items as { status: string }[]);
                    return (
                      <div key={s.id} className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-slate-50" onClick={() => openSession(s)}>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.name}</span>
                            <Badge className={STATUS_BADGES[s.status]?.cls}>{STATUS_BADGES[s.status]?.label || s.status}</Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{stats.total} items</span>
                            {(s.status === 'ACTIVE' || s.status === 'COMPLETED') && (
                              <>
                                <div className="w-24 h-1.5 bg-slate-200 rounded-full">
                                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${stats.pct}%` }} />
                                </div>
                                <span>{stats.pct}% verified</span>
                              </>
                            )}
                            <span>by {s.createdBy?.name || s.createdBy?.email}</span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Verification Session</DialogTitle>
                <DialogDescription>Create a session to verify assets. Assets matching your filters will be added automatically.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2"><Label>Session name</Label><Input value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Q2 Stock Take" /></div>
                <div className="space-y-2"><Label>Department (optional)</Label><Input value={createDept} onChange={e => setCreateDept(e.target.value)} placeholder="Department ID" /></div>
                <div className="space-y-2"><Label>Location (optional)</Label><Input value={createLoc} onChange={e => setCreateLoc(e.target.value)} placeholder="Location ID" /></div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createLoading || !createName.trim()}>{createLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={detailOpen} onOpenChange={(o) => { if (!o) { setDetailOpen(false); setSessionDetail(null); setSearchQuery(''); } }}>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
              {detailLoading ? (
                <div className="py-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
              ) : sessionDetail ? (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <ClipboardCheck className="h-5 w-5" /> {sessionDetail.name}
                      <Badge className={STATUS_BADGES[sessionDetail.status]?.cls}>{STATUS_BADGES[sessionDetail.status]?.label}</Badge>
                    </DialogTitle>
                    <DialogDescription>
                      {itemStats(sessionDetail.items as { status: string }[]).total} assets — {itemStats(sessionDetail.items as { status: string }[]).pct}% verified
                    </DialogDescription>
                  </DialogHeader>

                  {(sessionDetail.status === 'COMPLETED' || sessionDetail.status === 'ACTIVE') && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <Card className="p-3 text-center">
                        <p className="text-sm text-muted-foreground">Verified</p>
                        <p className="text-lg font-bold text-green-600">{itemStats(sessionDetail.items as { status: string }[]).verified}</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-sm text-muted-foreground">Missing</p>
                        <p className="text-lg font-bold text-red-600">{itemStats(sessionDetail.items as { status: string }[]).missing}</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-sm text-muted-foreground">Moved</p>
                        <p className="text-lg font-bold text-amber-600">{itemStats(sessionDetail.items as { status: string }[]).moved}</p>
                      </Card>
                      <Card className="p-3 text-center">
                        <p className="text-sm text-muted-foreground">Damaged</p>
                        <p className="text-lg font-bold text-orange-600">{itemStats(sessionDetail.items as { status: string }[]).damaged}</p>
                      </Card>
                    </div>
                  )}

                  {sessionDetail.status !== 'COMPLETED' && (
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search assets..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-9" />
                    </div>
                  )}

                  <div className="space-y-2">
                    {filteredItems.map(item => {
                      const Icon = ITEM_STATUS_BADGES[item.status]?.icon;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Badge className={ITEM_STATUS_BADGES[item.status]?.cls}>
                                {Icon && <Icon className="h-3 w-3 mr-1 inline" />}
                                {ITEM_STATUS_BADGES[item.status]?.label}
                              </Badge>
                              <span className="font-medium text-sm truncate">{item.asset.name}</span>
                              <span className="text-xs text-muted-foreground">#{item.asset.assetTag}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>Location: {item.expectedLocation || '-'}</span>
                              <span>User: {item.expectedUser || '-'}</span>
                              {item.verifiedAt && <span>Verified: {new Date(item.verifiedAt).toLocaleString()}</span>}
                            </div>
                          </div>
                          {sessionDetail.status !== 'COMPLETED' && (
                            <div className="flex items-center gap-1 ml-2">
                              <Button size="sm" variant="ghost" className="text-green-600 text-xs h-7" onClick={() => handleVerify(item.id, 'VERIFIED')}>Verify</Button>
                              <Button size="sm" variant="ghost" className="text-red-600 text-xs h-7" onClick={() => handleVerify(item.id, 'MISSING')}>Missing</Button>
                              <Button size="sm" variant="ghost" className="text-amber-600 text-xs h-7" onClick={() => handleVerify(item.id, 'MOVED')}>Moved</Button>
                              <Button size="sm" variant="ghost" className="text-orange-600 text-xs h-7" onClick={() => handleVerify(item.id, 'DAMAGED')}>Damaged</Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {sessionDetail.status !== 'COMPLETED' && (
                    <DialogFooter>
                      <Button onClick={handleComplete} disabled={completing} className="gap-2">
                        {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        Complete Session
                      </Button>
                    </DialogFooter>
                  )}
                </>
              ) : null}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
