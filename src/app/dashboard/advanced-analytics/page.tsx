'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FeatureLock } from '@/components/ui/feature-lock';
import { formatCurrency } from '@/lib/utils';
import { Loader2, TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart, Package, Wrench, AlertTriangle, Shield, Clock, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePie, Pie, Cell, Legend } from 'recharts';
import { toast } from '@/hooks/use-toast';
import Link from 'next/link';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const STATUS_COLORS: Record<string, string> = { VERIFIED: '#10b981', MISSING: '#ef4444', MOVED: '#f59e0b', DAMAGED: '#f97316', PENDING: '#94a3b8' };

interface AnalyticsData {
  summary: any; valueByCategory: any[]; valueByDepartment: any[];
  valueByLocation: any[]; lifecycle: any; maintenance: any;
  stockVerification: any; topAssets: any[]; upcomingExpiries: any[];
  replacementSuggestions: any[];
}

export default function AdvancedAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [months, setMonths] = useState('12');
  const [deptId, setDeptId] = useState('');
  const [catId, setCatId] = useState('');
  const [locId, setLocId] = useState('');

  useEffect(() => { fetchData(); }, [months, deptId, catId, locId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (months) params.set('months', months);
      if (deptId) params.set('departmentId', deptId);
      if (catId) params.set('categoryId', catId);
      if (locId) params.set('locationId', locId);
      const res = await fetch(`/api/dashboard/advanced-analytics?${params}`);
      const d = await res.json();
      if (d.code === 'UPGRADE_REQUIRED') setIsEnterprise(false);
      else if (res.ok) { setData(d); setIsEnterprise(true); }
    } catch {}
    setLoading(false);
  };

  const handleExport = () => {
    if (!data) return;
    const rows = [['Type','Metric','Value']];
    rows.push(['Summary','Total Assets',data.summary.totalAssets]);
    rows.push(['Summary','Purchase Value',data.summary.totalPurchaseValue]);
    rows.push(['Summary','Book Value',data.summary.totalBookValue]);
    rows.push(['Value','By Category',JSON.stringify(data.valueByCategory)]);
    rows.push(['Value','By Department',JSON.stringify(data.valueByDepartment)]);
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'analytics-export.csv'; a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Analytics data exported as CSV' });
  };

  if (loading && !data) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Analytics</h1>
          <p className="text-muted-foreground">Enterprise-grade asset intelligence and insights</p>
        </div>
        {isEnterprise && (
          <div className="flex items-center gap-2">
            <Select value={months} onValueChange={setMonths}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
                <SelectItem value="24">24 months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={handleExport}><Download className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {!isEnterprise ? (
        <FeatureLock featureName="Advanced Analytics" featureDescription="Access premium analytics including asset value trends, lifecycle tracking, maintenance insights, utilization reports, and stock verification analytics." requiredPlan="ENTERPRISE" currentPlan="FREE" />
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Total Assets" value={data.summary.totalAssets} icon={Package} color="text-blue-600" />
            <KpiCard title="Purchase Value" value={formatCurrency(data.summary.totalPurchaseValue)} icon={DollarSign} color="text-green-600" />
            <KpiCard title="Book Value" value={formatCurrency(data.summary.totalBookValue)} icon={BarChart3} color="text-purple-600" />
            <KpiCard title="Depreciated" value={formatCurrency(data.summary.totalDepreciated)} icon={TrendingDown} color="text-red-600" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><PieChart className="h-5 w-5" />Lifecycle Status</CardTitle>
                <CardDescription>Asset status distribution</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {data.lifecycle.assigned + data.lifecycle.available + data.lifecycle.maintenance + data.lifecycle.retired > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <RePie>
                      <Pie data={[
                        { name: 'Assigned', value: data.lifecycle.assigned },
                        { name: 'Available', value: data.lifecycle.available },
                        { name: 'Maintenance', value: data.lifecycle.maintenance },
                        { name: 'Retired', value: data.lifecycle.retired },
                      ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ pct }: any) => `${(pct * 100).toFixed(0)}%`}>
                        {[0,1,2,3].map(i => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                    </RePie>
                  </ResponsiveContainer>
                ) : <p className="py-8 text-muted-foreground">No data</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Value by Category</CardTitle>
                <CardDescription>Purchase cost per category</CardDescription>
              </CardHeader>
              <CardContent>
                {data.valueByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.valueByCategory.slice(0, 6)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(v: any) => `R${(v/1000).toFixed(0)}k`} />
                      <YAxis dataKey="category" type="category" width={100} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: any) => formatCurrency(v)} />
                      <Bar dataKey="purchaseValue" fill={COLORS[0]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="py-8 text-muted-foreground">No category data</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Wrench className="h-5 w-5" />Maintenance</CardTitle>
                <CardDescription>{formatCurrency(data.maintenance.totalCost)} spent on {data.maintenance.totalCount} repairs</CardDescription>
              </CardHeader>
              <CardContent>
                {data.maintenance.byStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={data.maintenance.byStatus}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill={COLORS[2]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p className="py-8 text-muted-foreground">No maintenance data</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Stock Verification</CardTitle>
                <CardDescription>{data.stockVerification.totalSessions} sessions, {data.stockVerification.totalItems} items</CardDescription>
              </CardHeader>
              <CardContent>
                {data.stockVerification.items.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <RePie>
                      <Pie data={data.stockVerification.items.map((i: any) => ({ name: i.status, value: i.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                        {data.stockVerification.items.map((_: any, i: number) => <Cell key={i} fill={STATUS_COLORS[data.stockVerification.items[i].status] || COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RePie>
                  </ResponsiveContainer>
                ) : <p className="py-8 text-muted-foreground">No verification data</p>}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Top Valued Assets</CardTitle>
              </CardHeader>
              <CardContent>
                {data.topAssets.length > 0 ? (
                  <div className="space-y-2">
                    {data.topAssets.map(a => (
                      <div key={a.id} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{a.name}</p>
                          <p className="text-xs text-muted-foreground">#{a.assetTag} — {a.category} — <Badge variant="outline" className="text-xs">{a.status}</Badge></p>
                        </div>
                        <p className="text-sm font-medium">{formatCurrency(a.purchaseCost)}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-4 text-muted-foreground">No assets</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" />Alerts &amp; Suggestions</CardTitle>
                <CardDescription>Upcoming warranty expiries and fully depreciated assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.upcomingExpiries.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Upcoming Warranty Expiries</p>
                    <div className="space-y-1">
                      {data.upcomingExpiries.slice(0, 3).map(e => (
                        <div key={e.id} className="flex justify-between text-sm p-2 bg-amber-50 rounded">
                          <span>{e.name} (#{e.assetTag})</span>
                          <span className="text-amber-700">{new Date(e.warrantyExpiry).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.replacementSuggestions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Replacement Candidates (&gt;80% depreciated)</p>
                    <div className="space-y-1">
                      {data.replacementSuggestions.slice(0, 3).map(r => (
                        <div key={r.id} className="flex justify-between text-sm p-2 bg-red-50 rounded">
                          <span>{r.name}</span>
                          <span className="text-red-700">Book: {formatCurrency(r.bookValue)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.upcomingExpiries.length === 0 && data.replacementSuggestions.length === 0 && (
                  <p className="py-4 text-muted-foreground">No alerts</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Value by Department</CardTitle>
              <CardDescription>Breakdown of asset value across departments</CardDescription>
            </CardHeader>
            <CardContent>
              {data.valueByDepartment.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.valueByDepartment.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v: any) => `R${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => formatCurrency(v)} />
                    <Bar dataKey="purchaseValue" fill={COLORS[4]} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-8 text-muted-foreground">No department data</p>}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color }: { title: string; value: any; icon: any; color: string }) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardDescription className="text-sm">{title}</CardDescription>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
