'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Loader2, RefreshCw, Users, Building2, CreditCard, Mail, Clock, MessageSquare, AlertTriangle, TrendingUp, Wrench } from 'lucide-react';

export function PlatformHealth() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin/platform-health');
      const d = await res.json();
      if (!res.ok) { setError(d.error || 'Failed to load'); return; }
      setData(d);
    } catch { setError('Network error'); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (error) return <Card><CardContent className="py-4 text-red-600 text-sm">{error}</CardContent></Card>;
  if (loading || !data) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Platform Health</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Updated {new Date(data.updatedAt).toLocaleTimeString()}</span>
          <Button variant="ghost" size="sm" onClick={fetchData}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </div>

      {data.warnings?.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {data.warnings.map((w: any, i: number) => (
            <Card key={i} className={`border-l-4 ${w.severity === 'high' ? 'border-l-red-500' : w.severity === 'medium' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
              <CardContent className="p-3 flex items-start gap-2">
                <AlertTriangle className={`h-4 w-4 mt-0.5 ${w.severity === 'high' ? 'text-red-600' : w.severity === 'medium' ? 'text-amber-600' : 'text-blue-600'}`} />
                <div><p className="text-sm font-medium">{w.message}</p><p className="text-xs text-muted-foreground">{w.type}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MiniCard title="Users" icon={Users} rows={[`${data.users.total} total`, `${data.users.active} active`, `${data.users.verified} verified`]} />
        <MiniCard title="Organizations" icon={Building2} rows={[`${data.organizations.total} total`, ...(data.organizations.byPlan || []).map((p: any) => `${p.plan}: ${p.count}`)]} />
        <MiniCard title="Billing" icon={CreditCard} rows={[`MRR: ${formatCurrency(data.billing.mrr)}`, `${data.billing.paymentsThisMonth} payments`, `${data.billing.failedPayments} failed`, `${data.billing.pendingUpgradeRequests} pending upgrades`]} />
        <MiniCard title="Email" icon={Mail} rows={[`${data.emails.sentToday} sent today`, `${data.emails.failed} failed`, `${data.emails.verificationSent} verify`, `${data.emails.resetSent} reset`]} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MiniCard title="Support" icon={MessageSquare} rows={[`${data.support.openTickets} open`, `${data.support.breachedTickets} breached`, `${data.support.onlineAgents} agents online`]} />
        <MiniCard title="Cron" icon={Clock} rows={[`Maintenance: ${data.cron.lastMaintenanceCron ? new Date(data.cron.lastMaintenanceCron).toLocaleDateString() : 'never'}`, `Re-engagement: ${data.cron.lastReengagementCron ? new Date(data.cron.lastReengagementCron).toLocaleDateString() : 'never'}`]} />
        <MiniCard title="Inactive" icon={TrendingUp} rows={[`${data.users.inactive30d} users 30d+`, `${data.billing.pendingPaymentsOld} pending > 24h`]} />
        <MiniCard title="Upgrades" icon={Wrench} rows={[`${data.billing.pendingUpgradeRequests} pending`, `${data.billing.manualConfirmations} manual`]} />
      </div>
    </div>
  );
}

function MiniCard({ title, icon: Icon, rows }: { title: string; icon: any; rows: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-2"><CardDescription className="flex items-center gap-1"><Icon className="h-4 w-4" />{title}</CardDescription></CardHeader>
      <CardContent className="text-sm space-y-0.5">{rows.map((r, i) => <p key={i} className="text-muted-foreground">{r}</p>)}</CardContent>
    </Card>
  );
}
