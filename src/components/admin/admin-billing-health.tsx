'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Loader2, RefreshCw, FileText, DollarSign, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

export function AdminBillingHealth() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/billing/summary');
      setData(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading || !data) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Billing Health</h2>
        <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MiniCard title="MRR" value={formatCurrency(data.revenue.mrr)} icon={DollarSign} color="text-green-600" />
        <MiniCard title="ARR" value={formatCurrency(data.revenue.arr)} icon={DollarSign} color="text-blue-600" />
        <MiniCard title="Renewals Due Today" value={data.renewals.dueToday} icon={Clock} color="text-amber-600" />
        <MiniCard title="Queued Renewals" value={data.renewals.queued} icon={Clock} color="text-purple-600" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MiniCard title="Paid Invoices" value={data.invoices.paid} icon={CheckCircle} color="text-green-600" />
        <MiniCard title="Overdue Invoices" value={data.invoices.overdue} icon={AlertTriangle} color="text-red-600" />
        <MiniCard title="Failed Payments" value={data.payments.failed} icon={AlertTriangle} color="text-red-600" />
        <MiniCard title="Manual Confirmations" value={data.payments.manualConfirmations} icon={FileText} color="text-blue-600" />
      </div>

      {data.recentInvoices?.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Recent Invoices</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {data.recentInvoices.slice(0, 10).map((inv: any) => (
                <div key={inv.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                  <div>
                    <span className="font-medium">{inv.invoiceNumber}</span>
                    <span className="text-muted-foreground ml-2">{inv.user?.name || inv.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>{formatCurrency(Number(inv.total))}</span>
                    <Badge variant="secondary" className="text-xs">{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniCard({ title, value, icon: Icon, color }: { title: string; value: any; icon: any; color: string }) {
  return (
    <Card><CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Icon className={`h-4 w-4 ${color}`} />{title}</CardDescription></CardHeader><CardContent><p className="text-xl font-bold">{value}</p></CardContent></Card>
  );
}
