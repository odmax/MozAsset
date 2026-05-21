'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import {
  Search, Loader2, CreditCard, Users, UserCheck, UserX, Clock,
  TrendingUp, TrendingDown, DollarSign, Calendar, Download,
  Eye, XCircle, Zap, ArrowUpDown, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle,
} from 'lucide-react';
import type { SubscriptionRow, SubscriptionKPIs, SubscriptionChartData } from '@/lib/billing-analytics';
import { formatCompactCurrency } from '@/lib/billing-analytics';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];
const PLAN_COLORS: Record<string, string> = {
  FREE: '#6b7280',
  PRO: '#8b5cf6',
  ENTERPRISE: '#f59e0b',
};

export default function AdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionRow[]>([]);
  const [kpis, setKpis] = useState<SubscriptionKPIs | null>(null);
  const [charts, setCharts] = useState<SubscriptionChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Action dialogs
  const [cancelTarget, setCancelTarget] = useState<SubscriptionRow | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [upgradeTarget, setUpgradeTarget] = useState<SubscriptionRow | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradePlan, setUpgradePlan] = useState('PRO');
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      if (planFilter) params.append('plan', planFilter);
      params.append('page', String(page));
      params.append('limit', '20');
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);
      const res = await fetch(`/api/admin/subscriptions?${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSubscriptions(data.subscriptions || []);
      if (data.kpis) setKpis(data.kpis);
      if (data.charts) setCharts(data.charts);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, planFilter, page, sortBy, sortOrder]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${cancelTarget.userId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccessMsg(`Subscription for ${cancelTarget.email} cancelled successfully`);
      setCancelOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to cancel');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!upgradeTarget) return;
    setUpgradeLoading(true);
    try {
      const res = await fetch(`/api/admin/subscriptions/${upgradeTarget.userId}/upgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: upgradePlan }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccessMsg(`${upgradeTarget.email} changed to ${upgradePlan}`);
      setUpgradeOpen(false);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to change plan');
    } finally {
      setUpgradeLoading(false);
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700',
      CANCELED: 'bg-red-100 text-red-700',
      PAST_DUE: 'bg-yellow-100 text-yellow-700',
      TRIALING: 'bg-blue-100 text-blue-700',
      PAUSED: 'bg-gray-100 text-gray-700',
    };
    return (
      <Badge className={styles[status] || 'bg-gray-100 text-gray-700'}>
        {status === 'ACTIVE' && <CheckCircle className="h-3 w-3 mr-1" />}
        {status === 'CANCELED' && <XCircle className="h-3 w-3 mr-1" />}
        {status === 'PAST_DUE' && <Clock className="h-3 w-3 mr-1" />}
        {status}
      </Badge>
    );
  };

  const KpiCard = ({ title, value, icon: Icon, trend, color }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend !== undefined && (
          <p className={`text-xs ${trend >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center gap-1 mt-1`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}% from last period
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">Manage all subscriptions and billing plans</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <Loader2 className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <Link href="/api/admin/subscriptions/export">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Link>
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {successMsg}
        </div>
      )}

      {/* KPI Cards */}
      {loading && !kpis ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-16" /></CardContent></Card>
          ))}
        </div>
      ) : kpis ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Active Subscriptions" value={kpis.activeSubscriptions} icon={Users} color="text-blue-500" />
          <KpiCard title="Trial Accounts" value={kpis.trialAccounts} icon={UserCheck} color="text-blue-400" />
          <KpiCard title="Cancelled" value={kpis.cancelledSubscriptions} icon={UserX} color="text-red-500" />
          <KpiCard title="Expiring Soon (30d)" value={kpis.expiringSoon} icon={Clock} color="text-yellow-500" />
          <KpiCard title="MRR" value={formatCompactCurrency(kpis.mrr)} icon={DollarSign} color="text-green-500" />
          <KpiCard title="ARR" value={formatCompactCurrency(kpis.arr)} icon={TrendingUp} color="text-green-600" />
          <KpiCard title="Conversion Rate" value={`${kpis.conversionRate}%`} icon={Zap} color="text-purple-500" />
          <KpiCard title="Churn Rate" value={`${kpis.churnRate}%`} icon={TrendingDown} color={kpis.churnRate > 5 ? 'text-red-500' : 'text-green-500'} />
        </div>
      ) : null}

      {/* Charts */}
      {charts && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Subscription Growth</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={charts.subscriptionGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Subscribers" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Plan Distribution</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={charts.planDistribution}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    dataKey="count" nameKey="plan"
                    label={({ plan, percentage }) => `${plan} ${percentage}%`}
                  >
                    {charts.planDistribution.map((entry, idx) => (
                      <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] || CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Churn Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.churnTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="new" fill="#10b981" name="New Subscriptions" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelled" fill="#ef4444" name="Cancelled" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Conversion Funnel</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.conversionFunnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Users" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <CardTitle>All Subscriptions ({total})</CardTitle>
            <div className="flex-1 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer, email, org..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="CANCELED">Canceled</SelectItem>
                  <SelectItem value="PAST_DUE">Past Due</SelectItem>
                  <SelectItem value="TRIALING">Trialing</SelectItem>
                  <SelectItem value="PAUSED">Paused</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Plans" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Plans</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="PRO">Pro</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {[
                      { key: '', label: 'Customer' },
                      { key: '', label: 'Organization' },
                      { key: 'plan', label: 'Plan' },
                      { key: 'subscriptionStatus', label: 'Status' },
                      { key: '', label: 'Billing' },
                      { key: '', label: 'Amount' },
                      { key: 'createdAt', label: 'Start Date' },
                      { key: 'billingPeriodEnd', label: 'Renewal' },
                      { key: 'lastPaymentAt', label: 'Last Payment' },
                      { key: '', label: 'Auto-Renew' },
                      { key: '', label: 'Payment' },
                      { key: '', label: 'Actions' },
                    ].map((col) => (
                      <th
                        key={col.label}
                        className="text-left p-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                        onClick={() => col.key && toggleSort(col.key)}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {col.key && <ArrowUpDown className="h-3 w-3" />}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="p-12">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="p-12 text-center text-muted-foreground">
                        <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        No subscriptions found
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-t hover:bg-muted/30">
                        <td className="p-3">
                          <Link href={`/admin/users/${sub.userId}`} className="hover:underline">
                            <p className="text-sm font-medium">{sub.name || sub.email}</p>
                            <p className="text-xs text-muted-foreground">{sub.email}</p>
                          </Link>
                        </td>
                        <td className="p-3 text-sm">{sub.organization || '-'}</td>
                        <td className="p-3">
                          <Badge className={
                            sub.plan === 'PRO' ? 'bg-purple-100 text-purple-700' :
                            sub.plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-700' :
                            'bg-muted text-muted-foreground'
                          }>{sub.plan}</Badge>
                        </td>
                        <td className="p-3">{statusBadge(sub.status)}</td>
                        <td className="p-3 text-sm text-muted-foreground">{sub.billingCycle}</td>
                        <td className="p-3 text-sm font-medium">
                          {sub.amount > 0 ? `R${sub.amount.toLocaleString()}` : '-'}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {sub.startDate ? new Date(sub.startDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {sub.renewalDate ? new Date(sub.renewalDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {sub.lastPayment ? new Date(sub.lastPayment).toLocaleDateString() : '-'}
                        </td>
                        <td className="p-3">
                          {sub.autoRenew ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Yes</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-500">No</Badge>
                          )}
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{sub.paymentMethod}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" asChild title="View Customer">
                              <Link href={`/admin/users/${sub.userId}`}><Eye className="h-4 w-4" /></Link>
                            </Button>
                            {sub.plan !== 'FREE' && sub.status !== 'CANCELED' && (
                              <Button
                                variant="ghost" size="sm"
                                className="text-red-500 hover:text-red-700"
                                title="Cancel Subscription"
                                onClick={() => { setCancelTarget(sub); setCancelOpen(true); }}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {sub.plan !== 'ENTERPRISE' && (
                              <Button
                                variant="ghost" size="sm"
                                className="text-blue-500 hover:text-blue-700"
                                title="Upgrade/Downgrade"
                                onClick={() => {
                                  setUpgradeTarget(sub);
                                  setUpgradePlan(sub.plan === 'FREE' ? 'PRO' : sub.plan === 'PRO' ? 'ENTERPRISE' : 'FREE');
                                  setUpgradeOpen(true);
                                }}
                              >
                                <Zap className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({total} total)</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-3">
              <p>Are you sure you want to cancel <strong>{cancelTarget?.name || cancelTarget?.email}</strong>'s {cancelTarget?.plan} subscription?</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                The user will be downgraded to the Free plan. This action is logged.
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelLoading}>
              {cancelLoading ? 'Processing...' : 'Confirm Cancellation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-500" />
              Change Plan
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-3">
              <p>Change plan for <strong>{upgradeTarget?.name || upgradeTarget?.email}</strong></p>
              <div className="flex items-center gap-3">
                <span className="text-sm">Current: <Badge variant="outline">{upgradeTarget?.plan}</Badge></span>
                <span className="text-muted-foreground">→</span>
                <Select value={upgradePlan} onValueChange={setUpgradePlan}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FREE">Free</SelectItem>
                    <SelectItem value="PRO">Pro (R149/mo)</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise (R599/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>Cancel</Button>
            <Button onClick={handleUpgrade} disabled={upgradeLoading}>
              {upgradeLoading ? 'Processing...' : 'Confirm Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
