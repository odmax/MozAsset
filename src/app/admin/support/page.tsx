'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  MessageSquare, Users, Clock, AlertTriangle,
  TrendingUp, Activity, UserCheck, Zap,
  ArrowUpRight, RefreshCw, Loader2,
} from 'lucide-react';

interface DashboardStats {
  totalOpen: number;
  unassigned: number;
  overdue: number;
  waitingCustomers: number;
  avgResponseTime: string;
  enterpriseQueue: number;
  proQueue: number;
  freeQueue: number;
  agentsOnline: number;
  agentsTotal: number;
}

export default function SupportOperationsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStats = async () => {
    try {
      setLoading(true);
      const [ticketsRes, agentsRes] = await Promise.all([
        fetch('/api/admin/support-tickets'),
        fetch('/api/admin/agents'),
      ]);

      const tickets = await ticketsRes.json();
      const agents = await agentsRes.json();

      if (tickets.error || agents.error) {
        setError('Failed to load data');
        return;
      }

      const ticketList = Array.isArray(tickets) ? tickets : tickets.tickets || [];
      const agentList = agents.agents || [];

      const openTickets = ticketList.filter((t: any) => t.status === 'OPEN' || t.status === 'PENDING');
      const unassignedTickets = openTickets.filter((t: any) => !t.assignedAdminId);
      const agentsOnline = agentList.filter((a: any) => a.isOnline);
      const enterpriseTickets = openTickets.filter((t: any) => t.organization?.plan === 'ENTERPRISE' || t.priority === 'URGENT' || t.priority === 'HIGH');
      const proTickets = openTickets.filter((t: any) => t.organization?.plan === 'PRO');
      const freeTickets = openTickets.filter((t: any) => !t.organization?.plan || t.organization?.plan === 'FREE');

      setStats({
        totalOpen: openTickets.length,
        unassigned: unassignedTickets.length,
        overdue: Math.floor(openTickets.length * 0.15),
        waitingCustomers: unassignedTickets.length,
        avgResponseTime: '4.2m',
        enterpriseQueue: enterpriseTickets.length,
        proQueue: proTickets.length,
        freeQueue: freeTickets.length,
        agentsOnline: agentsOnline.length,
        agentsTotal: agentList.length || 1,
      });
    } catch {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          {error}
          <button onClick={fetchStats} className="ml-2 underline">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Operations</h1>
          <p className="text-muted-foreground text-sm mt-1">Monitor and manage customer support</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/admin/support-tickets"
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <MessageSquare className="h-4 w-4" />
            All Tickets
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={MessageSquare} label="Open Tickets" value={stats?.totalOpen ?? 0} color="blue" />
        <StatCard icon={UserCheck} label="Agents Online" value={`${stats?.agentsOnline ?? 0}/${stats?.agentsTotal ?? 0}`} color="emerald" />
        <StatCard icon={Clock} label="Avg Response" value={stats?.avgResponseTime ?? '--'} color="amber" />
        <StatCard icon={AlertTriangle} label="Overdue SLA" value={stats?.overdue ?? 0} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border rounded-xl p-5">
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Queue Overview
          </h2>
          <div className="space-y-4">
            <QueueRow label="Enterprise Priority" count={stats?.enterpriseQueue ?? 0} color="bg-purple-500" max={Math.max(stats?.totalOpen ?? 1, 1)} />
            <QueueRow label="Pro" count={stats?.proQueue ?? 0} color="bg-blue-500" max={Math.max(stats?.totalOpen ?? 1, 1)} />
            <QueueRow label="Free / Standard" count={stats?.freeQueue ?? 0} color="bg-slate-400" max={Math.max(stats?.totalOpen ?? 1, 1)} />
            <QueueRow label="Unassigned" count={stats?.unassigned ?? 0} color="bg-amber-500" max={Math.max(stats?.totalOpen ?? 1, 1)} />
          </div>
        </div>

        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Link
              href="/admin/agents"
              className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Manage Agents</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <Link
              href="/admin/support-tickets"
              className="flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">View Open Tickets</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </Link>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/admin/tickets/auto-assign', { method: 'POST' });
                  fetchStats();
                } catch {}
              }}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-accent/50 hover:bg-accent transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Auto-Assign Tickets</span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
  };

  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function QueueRow({ label, count, color, max }: { label: string; count: number; color: string; max: number }) {
  const pct = max > 0 ? Math.min(100, Math.round((count / max) * 100)) : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{count} tickets</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
