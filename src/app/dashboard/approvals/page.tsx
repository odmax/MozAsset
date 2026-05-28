'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeatureLock } from '@/components/ui/feature-lock';
import { Loader2, CheckCircle, XCircle, Clock, FileText, Shield, Settings, AlertTriangle, UserCheck } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Approval {
  id: string; type: string; status: string; targetType: string; targetId: string;
  reason: string | null; notes: string | null; requestedAt: string; decidedAt: string | null;
  requestedBy: { id: string; name: string | null; email: string };
  approver: { id: string; name: string | null; email: string } | null;
}

interface OrgSettings { approvalEnabled: boolean; approvalRequiredActions: string[] | null; approvalDefaultApprovers: string[] | null; }

const STATUS_BADGES: Record<string, { cls: string; icon: any }> = {
  PENDING: { cls: 'bg-yellow-100 text-yellow-700', icon: Clock },
  APPROVED: { cls: 'bg-green-100 text-green-700', icon: CheckCircle },
  REJECTED: { cls: 'bg-red-100 text-red-700', icon: XCircle },
  CANCELLED: { cls: 'bg-slate-100 text-slate-700', icon: XCircle },
};

const TYPE_LABELS: Record<string, string> = {
  ASSIGNMENT: 'Asset Assignment', TRANSFER: 'Asset Transfer', RETIREMENT: 'Asset Retirement',
  DELETION: 'Asset Deletion', MAINTENANCE: 'Maintenance',
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [tab, setTab] = useState('pending');
  const [createOpen, setCreateOpen] = useState(false);
  const [createType, setCreateType] = useState('ASSIGNMENT');
  const [createTargetId, setCreateTargetId] = useState('');
  const [createReason, setCreateReason] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [reqActions, setReqActions] = useState<string[]>([]);

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard/approvals?tab=${tab}`);
      const d = await res.json();
      if (d.code === 'UPGRADE_REQUIRED') setIsEnterprise(false);
      else if (res.ok) { setApprovals(d.approvals || []); setSettings(d.settings); setIsEnterprise(true); }
    } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!createTargetId.trim()) return;
    setCreateLoading(true);
    try {
      const res = await fetch('/api/dashboard/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: createType, targetType: 'Asset', targetId: createTargetId, reason: createReason }),
      });
      if (!res.ok) { toast({ title: 'Failed', description: (await res.json()).error, variant: 'destructive' }); return; }
      toast({ title: 'Request submitted' });
      setCreateOpen(false);
      setCreateTargetId('');
      setCreateReason('');
      fetchData();
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    setCreateLoading(false);
  };

  const handleDecide = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/dashboard/approvals/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast({ title: 'Failed', description: (await res.json()).error, variant: 'destructive' }); return; }
      toast({ title: status === 'APPROVED' ? 'Approved' : 'Rejected' });
      fetchData();
    } catch {}
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await fetch('/api/dashboard/approvals/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, actions: reqActions }),
      });
      if (!res.ok) { toast({ title: 'Failed', variant: 'destructive' }); return; }
      const d = await res.json();
      setSettings(d.settings);
      toast({ title: 'Saved' });
      setSettingsOpen(false);
    } catch {}
    setSavingSettings(false);
  };

  const openSettings = () => {
    setEnabled(settings?.approvalEnabled || false);
    setReqActions(settings?.approvalRequiredActions || []);
    setSettingsOpen(true);
  };

  useEffect(() => {
    if (!approvals) return;

    const someApprovalRequest = approvals[0];
    if (!someApprovalRequest) return;

    const actionTypes = ['ASSIGNMENT', 'TRANSFER', 'RETIREMENT', 'DELETION', 'MAINTENANCE'];
    const shouldShowPending = tab === 'pending' && approvals.length > 0;
    if (shouldShowPending) {
      // This effect is just for initialization
    }
  }, [approvals, tab]);

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Approval Workflows</h1>
          <p className="text-muted-foreground">Manage approval requests for asset actions</p>
        </div>
        {isEnterprise && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openSettings}><Settings className="h-4 w-4 mr-1" />Settings</Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}><FileText className="h-4 w-4 mr-1" />New Request</Button>
          </div>
        )}
      </div>

      {!isEnterprise ? (
        <FeatureLock featureName="Approval Workflows" featureDescription="Require approvals for critical asset actions like transfers, retirements, and deletions. Track all requests and decisions." requiredPlan="ENTERPRISE" currentPlan="FREE" />
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="my">My Requests</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="mt-6">
            {approvals.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No {tab === 'pending' ? 'pending' : tab === 'my' ? 'your' : ''} approval requests</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {approvals.map(a => {
                  const Icon = STATUS_BADGES[a.status]?.icon;
                  return (
                    <Card key={a.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge className={STATUS_BADGES[a.status]?.cls}>
                              {Icon && <Icon className="h-3 w-3 mr-1 inline" />}
                              {a.status}
                            </Badge>
                            <span className="font-medium">{TYPE_LABELS[a.type] || a.type}</span>
                            <span className="text-sm text-muted-foreground">on {a.targetType} #{a.targetId}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span>by {a.requestedBy.name || a.requestedBy.email}</span>
                            <span>{new Date(a.requestedAt).toLocaleString()}</span>
                            {a.reason && <span>Reason: {a.reason}</span>}
                            {a.approver && <span>Decided by: {a.approver.name || a.approver.email}</span>}
                          </div>
                        </div>
                        {a.status === 'PENDING' && (
                          <div className="flex items-center gap-2 ml-4">
                            <Button size="sm" variant="outline" className="text-green-600 border-green-200 hover:bg-green-50" onClick={() => handleDecide(a.id, 'APPROVED')}>
                              <CheckCircle className="h-4 w-4 mr-1" />Approve
                            </Button>
                            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleDecide(a.id, 'REJECTED')}>
                              <XCircle className="h-4 w-4 mr-1" />Reject
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Approval Request</DialogTitle><DialogDescription>Submit a request for an asset action that requires approval.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Action type</Label><Select value={createType} onValueChange={setCreateType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ASSIGNMENT">Assignment</SelectItem><SelectItem value="TRANSFER">Transfer</SelectItem><SelectItem value="RETIREMENT">Retirement</SelectItem><SelectItem value="DELETION">Deletion</SelectItem><SelectItem value="MAINTENANCE">Maintenance</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Asset ID (target)</Label><Input value={createTargetId} onChange={e => setCreateTargetId(e.target.value)} placeholder="cuid..." /></div>
            <div className="space-y-2"><Label>Reason</Label><Input value={createReason} onChange={e => setCreateReason(e.target.value)} placeholder="Why is this needed?" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createLoading}><UserCheck className="h-4 w-4 mr-1" />Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Approval Settings</DialogTitle><DialogDescription>Configure which actions require approval.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Label>Enable approvals</Label>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <Label>Required actions</Label>
              {['ASSIGNMENT','TRANSFER','RETIREMENT','DELETION','MAINTENANCE'].map(action => (
                <label key={action} className="flex items-center gap-2">
                  <input type="checkbox" checked={reqActions.includes(action)} onChange={() => setReqActions(prev => prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action])} />
                  <span className="text-sm">{TYPE_LABELS[action]}</span>
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings} disabled={savingSettings}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
