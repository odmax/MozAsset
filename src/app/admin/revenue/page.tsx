'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
import {
  Search, Loader2, DollarSign, TrendingUp, TrendingDown, Calendar,
  Download, CreditCard, Users, CheckCircle, XCircle, RefreshCw,
  ChevronLeft, ChevronRight, ArrowUpDown, Eye, Receipt,
} from 'lucide-react';
import type { RevenueKPIs, RevenueChartData, TransactionRow } from '@/lib/billing-analytics';
import { formatCompactCurrency } from '@/lib/billing-analytics';

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6'];
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  REFUNDED: 'bg-gray-100 text-gray-700',
};

export default function RevenuePage() {
  const [data, setData] = useState<{
    kpis: RevenueKPIs | null;
    charts: RevenueChartData | null;
    transactions: TransactionRow[];
    total: number;
    totalPages: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [activeChart, setActiveChart] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (planFilter && planFilter !== 'all') params.append('plan', planFilter);
      if (providerFilter && providerFilter !== 'all') params.append('provider', providerFilter);
      if (dateFrom) params.append('dateFrom', dateFrom);
      if (dateTo) params.append('dateTo', dateTo);
      params.append('page', String(page));
      params.append('limit', '20');
      const res = await fetch(`/api/admin/revenue?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err) {
      console.error('Fetch revenue error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, planFilter, providerFilter, dateFrom, dateTo, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', minimumFractionDigits: 2 }).format(amount);

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return d; }
  };

  const KpiCard = ({ title, value, icon: Icon, color, sub }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );

  const kpis = data?.kpis;
  const charts = data?.charts;
  const transactions = data?.transactions || [];
  const totalTransactions = data?.total || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Revenue Analytics</h1>
          <p className="text-muted-foreground">Financial overview, transactions, and payment analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" asChild>
            <Link href="/api/admin/revenue/export">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading && !kpis ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardHeader className="pb-2"><Skeleton className="h-4 w-24" /></CardHeader><CardContent><Skeleton className="h-8 w-20" /></CardContent></Card>
          ))}
        </div>
      ) : kpis ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard title="Total Revenue" value={formatAmount(kpis.totalRevenue)} icon={DollarSign} color="text-green-600" />
          <KpiCard title="Revenue This Month" value={formatAmount(kpis.revenueThisMonth)} icon={Calendar} color="text-blue-500" />
          <KpiCard title="Revenue Today" value={formatAmount(kpis.revenueToday)} icon={TrendingUp} color="text-blue-400" />
          <KpiCard title="Avg Revenue / User" value={formatAmount(kpis.arpu)} icon={Users} color="text-purple-500" />
          <KpiCard title="Failed Payments" value={formatAmount(kpis.failedPayments)} icon={XCircle} color="text-red-500" />
          <KpiCard title="Refunds" value={formatAmount(kpis.refunds)} icon={TrendingDown} color="text-orange-500" />
          <KpiCard title="Net Revenue" value={formatAmount(kpis.netRevenue)} icon={CheckCircle} color="text-green-500" />
          <KpiCard title="Outstanding" value={formatAmount(kpis.outstandingRevenue)} icon={CreditCard} color="text-yellow-500" />
        </div>
      ) : null}

      {/* Charts */}
      {charts && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Daily Revenue (Last 30 Days)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.dailyRevenue} onClick={(e) => e?.activeLabel && setActiveChart(e.activeLabel)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatAmount(v)} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Monthly Revenue</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={charts.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => formatAmount(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Payment Success vs Failed</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={charts.paymentSuccessVsFailed}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={100}
                    dataKey="amount" nameKey="status"
                    label={({ status, amount }) => `${status} (${formatCompactCurrency(amount)})`}
                  >
                    {charts.paymentSuccessVsFailed.map((entry, idx) => (
                      <Cell key={entry.status} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatAmount(v)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Revenue by Plan</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.revenueByPlan} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}K`} />
                  <YAxis dataKey="plan" type="category" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatAmount(v)} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0, 4, 4, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Yearly Growth */}
      {charts?.yearlyGrowth && charts.yearlyGrowth.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Yearly Revenue Growth</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.yearlyGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(v: number) => formatAmount(v)} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
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
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={(v) => { setPlanFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Plans" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
            <SelectItem value="PRO">Pro</SelectItem>
            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={(v) => { setProviderFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="All Providers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="PAYFAST">Payfast</SelectItem>
            <SelectItem value="STRIPE">Stripe</SelectItem>
            <SelectItem value="NONE">None</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-[160px]" />
        <span className="text-muted-foreground">to</span>
        <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-[160px]" />
      </div>

      {/* Chart Drilldown */}
      {activeChart && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Filtered by date: {activeChart}</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setActiveChart(null)}>Clear</Button>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Transactions Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Transactions ({totalTransactions})</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    {['ID', 'Customer', 'Plan', 'Amount', 'VAT', 'Net', 'Status', 'Provider', 'Date', 'Reference', 'Actions'].map((h) => (
                      <th key={h} className="text-left p-3 text-sm font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={11} className="p-12"><div className="flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></td></tr>
                  ) : transactions.length === 0 ? (
                    <tr><td colSpan={11} className="p-12 text-center text-muted-foreground">
                      <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      No transactions found
                    </td></tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedTransaction(tx)}>
                        <td className="p-3 text-sm font-mono">{tx.transactionId}</td>
                        <td className="p-3">
                          <Link href={`/admin/users/${tx.userId}`} className="hover:underline" onClick={(e) => e.stopPropagation()}>
                            <p className="text-sm font-medium">{tx.customer}</p>
                            <p className="text-xs text-muted-foreground">{tx.email}</p>
                          </Link>
                        </td>
                        <td className="p-3">
                          {tx.plan ? <Badge variant="outline">{tx.plan}</Badge> : <span className="text-muted-foreground">-</span>}
                        </td>
                        <td className="p-3 text-sm font-medium">{formatAmount(tx.amount)}</td>
                        <td className="p-3 text-sm text-muted-foreground">{formatAmount(tx.vat)}</td>
                        <td className="p-3 text-sm">{formatAmount(tx.netAmount)}</td>
                        <td className="p-3">
                          <Badge className={STATUS_COLORS[tx.status] || ''}>{tx.status}</Badge>
                        </td>
                        <td className="p-3 text-sm">{tx.provider}</td>
                        <td className="p-3 text-sm text-muted-foreground">{formatDate(tx.date)}</td>
                        <td className="p-3 text-sm text-muted-foreground font-mono">{tx.reference || '-'}</td>
                        <td className="p-3">
                          <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                            <Link href={`/admin/users/${tx.userId}`}><Eye className="h-4 w-4" /></Link>
                          </Button>
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
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} ({totalTransactions} total)</p>
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

      {/* Transaction Detail Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedTransaction(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Transaction Details</h3>
              <Button variant="ghost" size="sm" onClick={() => setSelectedTransaction(null)}>✕</Button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-muted-foreground">Transaction ID</p><p className="font-mono text-sm">{selectedTransaction.transactionId}</p></div>
                <div><p className="text-xs text-muted-foreground">Reference</p><p className="font-mono text-sm">{selectedTransaction.reference || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Customer</p><p className="text-sm font-medium">{selectedTransaction.customer}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="text-sm">{selectedTransaction.email}</p></div>
                <div><p className="text-xs text-muted-foreground">Organization</p><p className="text-sm">{selectedTransaction.organization || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Plan</p><p className="text-sm">{selectedTransaction.plan || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="text-sm font-bold">{formatAmount(selectedTransaction.amount)}</p></div>
                <div><p className="text-xs text-muted-foreground">VAT (15%)</p><p className="text-sm">{formatAmount(selectedTransaction.vat)}</p></div>
                <div><p className="text-xs text-muted-foreground">Net Amount</p><p className="text-sm">{formatAmount(selectedTransaction.netAmount)}</p></div>
                <div><p className="text-xs text-muted-foreground">Status</p><Badge className={STATUS_COLORS[selectedTransaction.status] || ''}>{selectedTransaction.status}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Provider</p><p className="text-sm">{selectedTransaction.provider}</p></div>
                <div><p className="text-xs text-muted-foreground">Date</p><p className="text-sm">{formatDate(selectedTransaction.date)}</p></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setSelectedTransaction(null)}>Close</Button>
              <Button variant="outline" asChild>
                <Link href={`/admin/users/${selectedTransaction.userId}`}>View Customer</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
