'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FeatureLock } from '@/components/ui/feature-lock';
import { formatCurrency } from '@/lib/utils';
import { Loader2, Package, ClipboardList, FileText, Plus, CheckCircle, XCircle, Truck, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ProcurementPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [tab, setTab] = useState('overview');
  const [reqOpen, setReqOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqJust, setReqJust] = useState('');
  const [poVendor, setPoVendor] = useState('');
  const [poItems, setPoItems] = useState<any[]>([{ description: '', quantity: 1, unitPrice: '' }]);
  const [saving, setSaving] = useState(false);
  const [receiveOpen, setReceiveOpen] = useState<string | null>(null);
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/procurement'); const d = await res.json();
      if (d.code) setIsEnterprise(false); else { setData(d); setIsEnterprise(true); }
    } catch {}
    setLoading(false);
  };

  const handleCreateReq = async () => {
    if (!reqTitle.trim()) return; setSaving(true);
    await fetch('/api/dashboard/procurement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'request', title: reqTitle, justification: reqJust }) });
    setReqOpen(false); setReqTitle(''); setReqJust(''); fetchData(); setSaving(false);
    toast({ title: 'Request submitted' });
  };

  const handleCreatePO = async () => {
    setSaving(true);
    await fetch('/api/dashboard/procurement', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'order', vendorId: poVendor, items: poItems.filter(i => i.description) }) });
    setPoOpen(false); setPoVendor(''); setPoItems([{ description: '', quantity: 1, unitPrice: '' }]); fetchData(); setSaving(false);
    toast({ title: 'Purchase order created' });
  };

  const handleApprove = async (type: string, id: string, status: string) => {
    const url = type === 'req' ? `/api/dashboard/procurement/requests/${id}` : `/api/dashboard/procurement/orders/${id}`;
    await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    fetchData(); toast({ title: status });
  };

  const handleReceive = async (poId: string) => {
    const items = Object.entries(receiveQty).map(([id, qty]) => ({ id, qty }));
    await fetch(`/api/dashboard/procurement/orders/${poId}/receive`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
    setReceiveOpen(null); setReceiveQty({}); fetchData(); toast({ title: 'Received' });
  };

  const handleCreateAssets = async (poId: string) => {
    await fetch(`/api/dashboard/procurement/orders/${poId}/create-assets`, { method: 'POST' });
    fetchData(); toast({ title: 'Assets created' });
  };

  const STATUS: Record<string, string> = { DRAFT: 'bg-slate-100 text-slate-700', SUBMITTED: 'bg-blue-100 text-blue-700', PENDING_APPROVAL: 'bg-blue-100 text-blue-700', APPROVED: 'bg-green-100 text-green-700', REJECTED: 'bg-red-100 text-red-700', SENT: 'bg-purple-100 text-purple-700', PARTIALLY_RECEIVED: 'bg-amber-100 text-amber-700', RECEIVED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-red-100 text-red-700' };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold tracking-tight">Procurement</h1><p className="text-muted-foreground">Purchase requests, orders, and receiving</p></div>
        {isEnterprise && <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setReqOpen(true)}><FileText className="h-4 w-4 mr-1" />New Request</Button><Button size="sm" onClick={() => setPoOpen(true)}><Plus className="h-4 w-4 mr-1" />New PO</Button></div>}
      </div>

      {!isEnterprise ? <FeatureLock featureName="Procurement" featureDescription="Manage purchase requests, purchase orders, receiving, and vendor spend." requiredPlan="ENTERPRISE" currentPlan="FREE" /> : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            {[{ label: 'Open Requests', value: data.overview.openReqs }, { label: 'Pending Approval', value: data.overview.pendingApproval }, { label: 'Active Orders', value: data.overview.activeOrders }, { label: 'Outstanding', value: formatCurrency(data.overview.outstandingValue) }, { label: 'Received (Month)', value: formatCurrency(data.overview.receivedThisMonth) }].map(k => (
              <Card key={k.label}><CardHeader className="pb-2"><CardDescription>{k.label}</CardDescription><CardTitle className="text-xl">{k.value}</CardTitle></CardHeader></Card>
            ))}
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="requests">Requests</TabsTrigger><TabsTrigger value="orders">Orders</TabsTrigger></TabsList>

            <TabsContent value="requests" className="space-y-2 mt-4">
              {data.requests?.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div><Badge className={STATUS[r.status]}>{r.status}</Badge><span className="font-medium ml-2">{r.title}</span><span className="text-xs text-muted-foreground ml-2">by {r.requestedBy?.name || r.requestedBy?.email}</span></div>
                  <div className="flex gap-1">
                    {r.status === 'SUBMITTED' && <><Button size="sm" variant="ghost" className="text-green-600 h-7" onClick={() => handleApprove('req', r.id, 'APPROVED')}><CheckCircle className="h-4 w-4" /></Button><Button size="sm" variant="ghost" className="text-red-600 h-7" onClick={() => handleApprove('req', r.id, 'REJECTED')}><XCircle className="h-4 w-4" /></Button></>}
                  </div>
                </div>
              ))}
              {!data.requests?.length && <p className="py-8 text-center text-muted-foreground">No purchase requests</p>}
            </TabsContent>

            <TabsContent value="orders" className="space-y-2 mt-4">
              {data.orders?.map((o: any) => (
                <div key={o.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2"><span className="font-bold text-sm">{o.poNumber}</span><Badge className={STATUS[o.status]}>{o.status}</Badge>{o.vendor && <span className="text-sm text-muted-foreground">{o.vendor.name}</span>}</div>
                    <div className="flex gap-1">
                      {o.status === 'DRAFT' && <Button size="sm" variant="ghost" className="text-green-600 h-7" onClick={() => handleApprove('po', o.id, 'APPROVED')}>Approve</Button>}
                      {o.status === 'APPROVED' && <Button size="sm" variant="ghost" className="h-7" onClick={() => handleApprove('po', o.id, 'SENT')}><Truck className="h-4 w-4 mr-1" />Mark Sent</Button>}
                      {(o.status === 'SENT' || o.status === 'PARTIALLY_RECEIVED') && <Button size="sm" variant="ghost" className="h-7" onClick={() => { setReceiveOpen(o.id); setReceiveQty({}); }}>Receive</Button>}
                      {(o.status === 'PARTIALLY_RECEIVED' || o.status === 'RECEIVED') && o.items?.some((i: any) => i.receivedQuantity > 0) && <Button size="sm" variant="ghost" className="text-primary h-7" onClick={() => handleCreateAssets(o.id)}><Package className="h-4 w-4 mr-1" />Create Assets</Button>}
                    </div>
                  </div>
                  {o.items?.map((i: any) => (
                    <div key={i.id} className="flex justify-between text-sm py-1 border-t">{i.description} — {i.receivedQuantity}/{i.quantity} received <span className="font-medium">{formatCurrency(Number(i.totalPrice) || 0)}</span></div>
                  ))}
                  <div className="text-right text-sm font-bold mt-1">Total: {formatCurrency(Number(o.total) || 0)}</div>
                </div>
              ))}
              {!data.orders?.length && <p className="py-8 text-center text-muted-foreground">No purchase orders</p>}
            </TabsContent>
          </Tabs>

          <Dialog open={reqOpen} onOpenChange={setReqOpen}><DialogContent><DialogHeader><DialogTitle>New Purchase Request</DialogTitle></DialogHeader><div className="space-y-3 py-4"><div className="space-y-1"><Label>Title</Label><Input value={reqTitle} onChange={e => setReqTitle(e.target.value)} /></div><div className="space-y-1"><Label>Justification</Label><Input value={reqJust} onChange={e => setReqJust(e.target.value)} /></div></div><DialogFooter><Button variant="ghost" onClick={() => setReqOpen(false)}>Cancel</Button><Button onClick={handleCreateReq} disabled={saving}>Submit</Button></DialogFooter></DialogContent></Dialog>

          <Dialog open={poOpen} onOpenChange={setPoOpen}><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader><div className="space-y-3 py-4"><div className="space-y-1"><Label>Vendor ID</Label><Input value={poVendor} onChange={e => setPoVendor(e.target.value)} placeholder="cuid..." /></div>{poItems.map((item, idx) => (<div key={idx} className="grid grid-cols-3 gap-2"><Input placeholder="Description" value={item.description} onChange={e => { const n = [...poItems]; n[idx].description = e.target.value; setPoItems(n); }} /><Input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const n = [...poItems]; n[idx].quantity = parseInt(e.target.value) || 1; setPoItems(n); }} /><Input placeholder="Unit price" value={item.unitPrice} onChange={e => { const n = [...poItems]; n[idx].unitPrice = e.target.value; setPoItems(n); }} /></div>))}<Button variant="ghost" size="sm" onClick={() => setPoItems([...poItems, { description: '', quantity: 1, unitPrice: '' }])}><Plus className="h-3 w-3 mr-1" />Add Item</Button></div><DialogFooter><Button variant="ghost" onClick={() => setPoOpen(false)}>Cancel</Button><Button onClick={handleCreatePO} disabled={saving}>Create PO</Button></DialogFooter></DialogContent></Dialog>
        </>
      ) : null}
    </div>
  );
}
