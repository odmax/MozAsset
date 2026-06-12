'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { Loader2, Mail, Users, Clock, BarChart3, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Stats {
  type: string; label: string; count: number;
}

export default function ReEngagementPage() {
  const [stats, setStats] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/re-engagement-stats');
      const data = await res.json();
      setStats(data.stats || []);
    } catch {}
    setLoading(false);
  };

  const triggerNow = async () => {
    setSending(true);
    try {
      const res = await fetch('/api/cron/re-engagement', {
        headers: { authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'mozassets-cron'}` },
      });
      const data = await res.json();
      toast({ title: 'Campaign triggered', description: data.results?.map((r: any) => `${r.type}: ${r.sent} sent`).join(', ') });
      fetchStats();
    } catch {
      toast({ title: 'Failed', variant: 'destructive' });
    }
    setSending(false);
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Re-engagement</h1>
          <p className="text-muted-foreground">Automated email campaigns for inactive users</p>
        </div>
        <Button onClick={triggerNow} disabled={sending} className="gap-2">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Run Campaign Now
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {[
          { type: 'INACTIVE_7_DAYS', label: '7 Days', color: 'text-blue-600' },
          { type: 'INACTIVE_14_DAYS', label: '14 Days', color: 'text-amber-600' },
          { type: 'INACTIVE_30_DAYS', label: '30 Days', color: 'text-orange-600' },
          { type: 'INACTIVE_60_DAYS', label: '60 Days', color: 'text-red-600' },
          { type: 'INACTIVE_90_DAYS', label: '90 Days', color: 'text-red-800' },
        ].map(row => {
          const stat = stats.find(s => s.type === row.type);
          return (
            <Card key={row.type}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Clock className={`h-4 w-4 ${row.color}`} /> {row.label} Inactive
                </CardDescription>
                <CardTitle className="text-2xl">{stat?.count ?? 0}</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="text-xs">{row.type}</Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Campaign Schedule</CardTitle>
          <CardDescription>Emails are sent automatically via daily cron job at <code>GET /api/cron/re-engagement</code></CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { days: 7, subject: "We haven't seen you in a while", desc: 'Friendly check-in reminder' },
              { days: 14, subject: "See what's new in MozAssets", desc: 'Product highlights and feature updates' },
              { days: 30, subject: 'Your MozAssets account health report', desc: 'Account statistics and health summary' },
              { days: 60, subject: "We'd love to see you back", desc: 'Re-engagement with upgrade suggestions' },
              { days: 90, subject: 'Need help getting more value from MozAssets?', desc: 'Final retention with support contact' },
            ].map(row => (
              <div key={row.days} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">{row.subject}</p>
                  <p className="text-xs text-muted-foreground">{row.desc}</p>
                </div>
                <Badge variant="outline" className="text-xs">{row.days} days</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Setup</CardTitle>
          <CardDescription>Configure the cron job in Vercel to run daily</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-sm font-mono">
              Endpoint: <code>GET /api/cron/re-engagement</code><br />
              Authorization: <code>Bearer {process.env.NEXT_PUBLIC_CRON_SECRET || 'mozassets-cron'}</code>
            </p>
            <p className="text-xs text-muted-foreground mt-3">
              Add to Vercel Cron Jobs: Schedule <code>0 8 * * *</code> (daily at 8 AM SAST)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
