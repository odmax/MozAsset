'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FeatureLock } from '@/components/ui/feature-lock';
import { Loader2, Shield, FileCheck, ClipboardCheck, AlertTriangle, Clock, History, Download, ArrowRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function CompliancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEnterprise, setIsEnterprise] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard/compliance')
      .then(r => r.json())
      .then(d => { if (d.code) setIsEnterprise(false); else { setData(d); setIsEnterprise(true); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExport = () => {
    if (!data) return;
    const rows = [['Metric','Value']];
    rows.push(['Compliance Score',data.kpis.score]);
    rows.push(['Total Audit Events',data.kpis.totalAuditLogs]);
    rows.push(['Pending Approvals',data.kpis.pendingApprovals]);
    rows.push(['Active Verifications',data.kpis.activeVerifications]);
    rows.push(['Security Events',data.kpis.securityEvents]);
    rows.push(['SLA Breaches',data.kpis.breachedTickets]);
    rows.push(['Missing Items',data.kpis.missingItems]);
    rows.push(['Approved Today',data.kpis.approvedToday]);
    rows.push(['Rejected Today',data.kpis.rejectedToday]);
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'compliance-report.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported' });
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Compliance</h1>
          <p className="text-muted-foreground">Governance, security, and audit overview</p>
        </div>
        {isEnterprise && <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-1" />Export CSV</Button>}
      </div>

      {!isEnterprise ? (
        <FeatureLock featureName="Compliance Dashboard" featureDescription="Unified governance view with audit trails, approval tracking, stock verification status, and SLA monitoring." requiredPlan="ENTERPRISE" currentPlan="FREE" />
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Compliance Score</CardDescription>
                <CardTitle className={`text-2xl ${data.kpis.score >= 80 ? 'text-green-600' : data.kpis.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                  {data.kpis.score}%
                </CardTitle>
              </CardHeader>
              <CardContent><div className="h-2 bg-slate-200 rounded-full"><div className={`h-full rounded-full ${data.kpis.score >= 80 ? 'bg-green-500' : data.kpis.score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${data.kpis.score}%` }} /></div></CardContent>
            </Card>
            <KpiCard title="Pending Approvals" value={data.kpis.pendingApprovals} icon={FileCheck} color="text-amber-600" link="/dashboard/approvals" />
            <KpiCard title="Active Verifications" value={data.kpis.activeVerifications} icon={ClipboardCheck} color="text-blue-600" link="/dashboard/stock-verification" />
            <KpiCard title="SLA Breaches" value={data.kpis.breachedTickets} icon={AlertTriangle} color="text-red-600" link="/billing" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Recent Audit Events</CardTitle><CardDescription>Last 10 events across your organization</CardDescription></CardHeader>
              <CardContent>
                {data.recentAuditLogs?.length > 0 ? (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {data.recentAuditLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">{log.action}</Badge>
                          <span className="text-muted-foreground">{log.entityType}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-4 text-muted-foreground text-sm">No recent audit events</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />SLA Status</CardTitle><CardDescription>{data.slaStats?.length || 0} tickets with SLA tracking</CardDescription></CardHeader>
              <CardContent>
                {data.slaStats?.length > 0 ? (
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {data.slaStats.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded" style={{ background: t.slaStatus === 'BREACHED' ? '#fef2f2' : t.slaStatus === 'AT_RISK' ? '#fff7ed' : '#f0fdf4' }}>
                        <span className="truncate flex-1">{t.subject}</span>
                        <Badge className={t.slaStatus === 'BREACHED' ? 'bg-red-100 text-red-700' : t.slaStatus === 'AT_RISK' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}>{t.slaStatus}</Badge>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-4 text-muted-foreground text-sm">No SLA-tracked tickets</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Audit Events (30d)" value={data.kpis.totalAuditLogs} icon={History} color="text-slate-600" />
            <KpiCard title="Security Events" value={data.kpis.securityEvents} icon={Shield} color="text-orange-600" />
            <KpiCard title="Missing Items" value={data.kpis.missingItems} icon={AlertTriangle} color="text-red-600" />
            <KpiCard title="Damaged Items" value={data.kpis.damagedItems} icon={AlertTriangle} color="text-orange-600" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileCheck className="h-5 w-5" />Approvals</CardTitle>
                <CardDescription>Today: {data.kpis.approvedToday} approved, {data.kpis.rejectedToday} rejected</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg text-center"><p className="text-2xl font-bold text-green-600">{data.kpis.approvedToday}</p><p className="text-xs text-green-700">Approved</p></div>
                  <div className="p-4 bg-red-50 rounded-lg text-center"><p className="text-2xl font-bold text-red-600">{data.kpis.rejectedToday}</p><p className="text-xs text-red-700">Rejected</p></div>
                </div>
                <Link href="/dashboard/approvals"><Button variant="outline" className="w-full gap-1"><ArrowRight className="h-4 w-4" />Manage Approvals</Button></Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Stock Verification</CardTitle>
                <CardDescription>{data.kpis.activeVerifications} active sessions</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-red-50 rounded-lg text-center"><p className="text-2xl font-bold text-red-600">{data.kpis.missingItems}</p><p className="text-xs text-red-700">Missing</p></div>
                  <div className="p-4 bg-orange-50 rounded-lg text-center"><p className="text-2xl font-bold text-orange-600">{data.kpis.damagedItems}</p><p className="text-xs text-orange-700">Damaged</p></div>
                </div>
                <Link href="/dashboard/stock-verification"><Button variant="outline" className="w-full gap-1"><ArrowRight className="h-4 w-4" />View Sessions</Button></Link>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color, link }: { title: string; value: number; icon: any; color: string; link?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardDescription className="text-sm">{title}</CardDescription>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {link && <Link href={link} className="text-xs text-primary hover:underline mt-1 inline-block"><ArrowRight className="h-3 w-3 inline" /> View</Link>}
      </CardContent>
    </Card>
  );
}
