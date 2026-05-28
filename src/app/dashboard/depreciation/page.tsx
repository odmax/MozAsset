'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FeatureLock } from '@/components/ui/feature-lock';
import { formatCurrency } from '@/lib/utils';
import { Loader2, TrendingDown, DollarSign, BarChart3, RotateCw, ChevronRight, History } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AssetData {
  id: string; assetTag: string; name: string;
  purchaseCost: any; salvageValue: any;
  usefulLifeMonths: number; depreciationMethod: string;
  depreciationStartDate: string | null;
  currentBookValue: any; accumulatedDepreciation: any;
}

interface Summary { totalAssets: number; totalPurchase: number; totalBookValue: number; totalDepreciated: number; }

interface RecentEntry {
  id: string; assetId: string; amount: any; bookValueBefore: any; bookValueAfter: any;
  accumulatedDep: any; periodDate: string; method: string;
  asset: { name: string; assetTag: string };
}

interface DetailData { asset: any; calculation: any; entries: any[]; }

export default function DepreciationPage() {
  const [data, setData] = useState<{ summary: Summary; assets: AssetData[]; recentEntries: RecentEntry[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEnterprise, setIsEnterprise] = useState(false);
  const [running, setRunning] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard/depreciation');
      const d = await res.json();
      if (d.code === 'UPGRADE_REQUIRED') { setIsEnterprise(false); }
      else if (res.ok) { setData(d); setIsEnterprise(true); }
    } catch {}
    setLoading(false);
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/dashboard/depreciation/run', { method: 'POST' });
      const d = await res.json();
      toast({ title: 'Complete', description: d.message || `${d.processed} assets processed` });
      fetchData();
    } catch {}
    setRunning(false);
  };

  const openDetail = async (assetId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/dashboard/assets/${assetId}/depreciation`);
      const d = await res.json();
      setDetailData(d);
    } catch {}
    setDetailLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Depreciation Tracking</h1>
          <p className="text-muted-foreground">Track asset value degradation over time</p>
        </div>
        {isEnterprise && (
          <Button onClick={handleRun} disabled={running} className="gap-2">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            Run Depreciation
          </Button>
        )}
      </div>

      {!isEnterprise ? (
        <FeatureLock featureName="Depreciation Tracking" featureDescription="Track asset depreciation, current book value, and financial lifecycle. Generate depreciation reports." requiredPlan="ENTERPRISE" currentPlan="FREE" />
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1"><DollarSign className="h-4 w-4" />Total Purchase Value</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(data.summary.totalPurchase)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1"><TrendingDown className="h-4 w-4" />Total Depreciated</CardDescription>
                <CardTitle className="text-2xl text-red-600">{formatCurrency(data.summary.totalDepreciated)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1"><BarChart3 className="h-4 w-4" />Current Book Value</CardDescription>
                <CardTitle className="text-2xl text-green-600">{formatCurrency(data.summary.totalBookValue)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1"><DollarSign className="h-4 w-4" />Assets Tracked</CardDescription>
                <CardTitle className="text-2xl">{data.summary.totalAssets}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Depreciating Assets</CardTitle>
              <CardDescription>Click an asset to view its depreciation schedule</CardDescription>
            </CardHeader>
            <CardContent>
              {data.assets.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">No assets with depreciation configured.</div>
              ) : (
                <div className="space-y-2">
                  {data.assets.map(a => {
                    const cost = Number(a.purchaseCost) || 0;
                    const book = Number(a.currentBookValue) || cost;
                    const acc = Number(a.accumulatedDepreciation) || 0;
                    const pct = cost > 0 ? Math.round((acc / cost) * 100) : 0;
                    return (
                      <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-slate-50" onClick={() => openDetail(a.id)}>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm">{a.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">#{a.assetTag}</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">{a.depreciationMethod}</Badge>
                            <span className="text-xs text-muted-foreground">{a.usefulLifeMonths} months</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-sm font-medium">{formatCurrency(book)}</p>
                            <p className="text-xs text-muted-foreground">Book Value</p>
                          </div>
                          <div className="w-20">
                            <div className="h-1.5 bg-slate-200 rounded-full">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{pct}% depreciated</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {data.recentEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5" />Recent Depreciation Entries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.recentEntries.slice(0, 10).map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{e.asset.name}</p>
                        <p className="text-xs text-muted-foreground">#{e.asset.assetTag} — {e.method}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-red-600">-{formatCurrency(Number(e.amount) || 0)}</p>
                        <p className="text-xs text-muted-foreground">
                          Book: {formatCurrency(Number(e.bookValueAfter) || 0)}
                          {e.periodDate && ` — ${new Date(e.periodDate).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Dialog open={detailOpen} onOpenChange={(o) => { if (!o) setDetailOpen(false); }}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              {detailLoading ? (
                <div className="py-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></div>
              ) : detailData ? (
                <>
                  <DialogHeader>
                    <DialogTitle>{detailData.asset.name}</DialogTitle>
                    <DialogDescription>#{detailData.asset.assetTag} — Depreciation Schedule</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-muted-foreground">Purchase Cost</p>
                        <p className="font-medium">{formatCurrency(Number(detailData.asset.purchaseCost) || 0)}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-muted-foreground">Salvage Value</p>
                        <p className="font-medium">{formatCurrency(Number(detailData.asset.salvageValue) || 0)}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-muted-foreground">Method</p>
                        <p className="font-medium">{detailData.asset.depreciationMethod}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-muted-foreground">Useful Life</p>
                        <p className="font-medium">{detailData.asset.usefulLifeMonths} months</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-muted-foreground">Current Book Value</p>
                        <p className="font-medium text-green-600">{formatCurrency(Number(detailData.asset.currentBookValue) || Number(detailData.asset.purchaseCost) || 0)}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded">
                        <p className="text-muted-foreground">Accumulated Dep.</p>
                        <p className="font-medium text-red-600">{formatCurrency(Number(detailData.asset.accumulatedDepreciation) || 0)}</p>
                      </div>
                    </div>
                    {detailData.calculation && (
                      <div className="p-3 bg-blue-50 rounded-lg text-sm">
                        <p className="font-medium text-blue-700">Monthly Depreciation: {formatCurrency(detailData.calculation.monthlyDepreciation)}</p>
                        <p className="text-blue-600 text-xs mt-1">Based on {detailData.asset.depreciationMethod}</p>
                      </div>
                    )}
                    {detailData.entries.length > 0 && (
                      <div>
                        <p className="font-medium text-sm mb-2">Monthly Entries</p>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {detailData.entries.map((e: any) => (
                            <div key={e.id} className="flex justify-between text-xs p-2 bg-slate-50 rounded">
                              <span>{e.periodDate ? new Date(e.periodDate).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' }) : '-'}</span>
                              <span className="text-red-600">-{formatCurrency(Number(e.amount) || 0)}</span>
                              <span className="text-muted-foreground">Book: {formatCurrency(Number(e.bookValueAfter) || 0)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
