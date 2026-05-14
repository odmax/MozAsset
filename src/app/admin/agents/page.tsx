'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Users, UserPlus, Search, Loader2, MoreHorizontal,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Agent {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

const roleBadge: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  SUPPORT_MANAGER: 'bg-blue-100 text-blue-700',
  SUPPORT_AGENT: 'bg-emerald-100 text-emerald-700',
  FINANCE_ADMIN: 'bg-amber-100 text-amber-700',
  VIEWER: 'bg-slate-100 text-slate-700',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterRole) params.set('role', filterRole);
      const res = await fetch(`/api/admin/agents?${params}`);
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setAgents(data.agents || []);
    } catch {
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgents(); }, []);

  useEffect(() => {
    const timer = setTimeout(fetchAgents, 300);
    return () => clearTimeout(timer);
  }, [search, filterRole]);

  const onlineCount = agents.filter(a => a.isActive).length;
  const busyCount = 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Support Agents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {onlineCount} online &middot; {busyCount} busy &middot; {agents.length} total
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAgents} className="p-2 rounded-lg border hover:bg-accent">
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            href="/admin/agents/new"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            <UserPlus className="h-4 w-4" />
            Add Agent
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="h-10 rounded-lg border bg-background px-3 text-sm"
        >
          <option value="">All roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="SUPPORT_MANAGER">Support Manager</option>
          <option value="SUPPORT_AGENT">Support Agent</option>
          <option value="FINANCE_ADMIN">Finance Admin</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 bg-card border rounded-xl">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">No agents found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Add your first support agent</p>
        </div>
      ) : (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Agent</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Role</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Chats</th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3">Last Active</th>
                  <th className="w-12 px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                    <td className="px-5 py-4">
                      <Link href={`/admin/agents/${agent.id}`} className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {(agent.name || agent.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{agent.name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{agent.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[agent.role] || 'bg-slate-100 text-slate-700'}`}>
                        {agent.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm capitalize">Offline</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-muted-foreground">--</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-muted-foreground">--</span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/agents/${agent.id}`}
                        className="p-1 rounded hover:bg-accent inline-block"
                      >
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
