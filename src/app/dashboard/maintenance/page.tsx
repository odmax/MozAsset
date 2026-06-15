'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FeatureLock } from '@/components/ui/feature-lock';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Wrench, Plus, CheckCircle, AlertTriangle, Clock, Calendar, Trash2, Pencil, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Record { id: string; assetId: string; type: string; description: string; status: string; scheduledDate: string | null; completedDate: string | null; nextDueDate: string | null; recurrence: string; cost: any; vendorId: string | null; notes: string | null; performedByUser: { name: string } | null; asset: { id: string; name: string; assetTag: string }; }

const RECURRENCE_LABELS: Record<string, string> = { none: 'None', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };

export default function MaintenancePage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [filter, setFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Record | null>(null);
  const [form, setForm] = useState({ assetId: '', type: 'ROUTINE', description: '', scheduledDate: '', cost: '', recurrence: 'none', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchRecords(); }, [filter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams(); if (filter) p.set('status', filter);
      const res = await fetch(`/api/dashboard/maintenance?${p}`);
      const data = await res.json();
      if (data.code) { setIsPro(false); } else { setRecords(data.records || []); setIsPro(true); }
    } catch {}
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.assetId.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/dashboard/maintenance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { toast({ title: 'Failed', variant: 'destructive' }); return; }
      toast({ title: 'Maintenance scheduled' });
      setCreateOpen(false);
      setForm({ assetId: '', type: 'ROUTINE', description: '', scheduledDate: '', cost: '', recurrence: 'none', notes: '' });
      fetchRecords();
    } catch {}
    setSaving(false);
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch(`/api/dashboard/maintenance/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'COMPLETED' }) });
      if (!res.ok) { toast({ title: 'Failed', variant: 'destructive' }); return; }
      toast({ title: 'Completed' });
      fetchRecords();
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/dashboard/maintenance/${id}`, { method: 'DELETE' });
      setRecords(records.filter(r => r.id !== id));
      toast({ title: 'Deleted' });
    } catch {}
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/dashboard/maintenance/${editTarget.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!res.ok) { toast({ title: 'Failed', variant: 'destructive' }); return; }
      toast({ title: 'Updated' });
      setEditTarget(null);
      fetchRecords();
    } catch {}
    setSaving(false);
  };

  const openEdit = (r: Record) => {
    setEditTarget(r);
    setForm({ assetId: r.assetId, type: r.type, description: r.description, scheduledDate: r.scheduledDate?.split('T')[0] || '', cost: String(r.cost || ''), recurrence: r.recurrence, notes: r.notes || '' });
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const getStatusBadge = (r: Record) => {
    if (r.status === 'COMPLETED') return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    if (r.scheduledDate && new Date(r.scheduledDate) < new Date()) return <Badge className="bg-red-100 text-red-700"><AlertTriangle className="h-3 w-3 mr-1" />Overdue</Badge>;
    return <Badge className="bg-blue-100 text-blue-700"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Maintenance</h1>
          <p className="text-muted-foreground">Schedule and track asset maintenance</p>
        </div>
        {isPro && <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Schedule</Button>}
      </div>

      {!isPro ? (
        <FeatureLock featureName="Maintenance Scheduler" featureDescription="Schedule recurring maintenance, track due dates, and receive reminders for your assets." requiredPlan="PRO" currentPlan="FREE" />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40"><SelectValue placeholder="All status" /></SelectTrigger><SelectContent><SelectItem value="">All</SelectItem><SelectItem value="SCHEDULED">Scheduled</SelectItem><SelectItem value="COMPLETED">Completed</SelectItem></SelectContent></Select>
              </div>
            </CardHeader>
            <CardContent>
              {records.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No maintenance records. Schedule your first one.</div>
              ) : (
                <div className="space-y-2">
                  {records.map(r => (
                    <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">{getStatusBadge(r)}<span className="font-medium text-sm">{r.description}</span></div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{r.asset.name} ({r.asset.assetTag})</span><span>{r.type}</span>
                          {r.scheduledDate && <span><Calendar className="h-3 w-3 inline" /> {new Date(r.scheduledDate).toLocaleDateString()}</span>}
                          {r.cost && <span>{formatCurrency(r.cost)}</span>}
                          {r.recurrence !== 'none' && <Badge variant="outline" className="text-xs">{RECURRENCE_LABELS[r.recurrence]}</Badge>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        {r.status === 'SCHEDULED' && <Button size="sm" variant="ghost" className="text-green-600 h-7" onClick={() => handleComplete(r.id)}><CheckCircle className="h-4 w-4" /></Button>}
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="sm" variant="ghost" className="text-red-500 h-7" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule Maintenance</DialogTitle><DialogDescription>Create a scheduled maintenance record for an asset.</DialogDescription></DialogHeader>
              <div className="space-y-3 py-4">
                <div className="space-y-1"><Label>Asset ID</Label><Input value={form.assetId} onChange={e => setForm({ ...form, assetId: e.target.value })} placeholder="cuid..." /></div>
                <div className="space-y-1"><Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['ROUTINE','REPAIR','INSPECTION','UPGRADE','CALIBRATION','CLEANING'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
                </div>
                <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div className="space-y-1"><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1"><Label>Cost (ZAR)</Label><Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Recurrence</Label><Select value={form.recurrence} onValueChange={v => setForm({ ...form, recurrence: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(RECURRENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              </div>
              <DialogFooter><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button onClick={handleCreate} disabled={saving}>Schedule</Button></DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editTarget} onOpenChange={() => setEditTarget(null)}>
            {editTarget && (
              <DialogContent>
                <DialogHeader><DialogTitle>Edit Maintenance</DialogTitle></DialogHeader>
                <div className="space-y-3 py-4">
                  <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                  <div className="space-y-1"><Label>Scheduled Date</Label><Input type="date" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label>Cost</Label><Input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></div>
                    <div className="space-y-1"><Label>Recurrence</Label><Select value={form.recurrence} onValueChange={v => setForm({ ...form, recurrence: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(RECURRENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                  </div>
                  <div className="space-y-1"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
                <DialogFooter><Button variant="ghost" onClick={() => setEditTarget(null)}>Cancel</Button><Button onClick={handleEdit} disabled={saving}>Save</Button></DialogFooter>
              </DialogContent>
            )}
          </Dialog>
        </>
      )}
    </div>
  );
}
