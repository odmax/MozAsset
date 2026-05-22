'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ROLE_BADGE_COLORS, ROLE_LABELS, CREATABLE_ROLES } from '@/lib/admin-permissions';
import {
  Users, UserPlus, Search, Wifi, WifiOff,
  Loader2, MoreHorizontal, RefreshCw,
  Eye, Pencil, ToggleLeft, ToggleRight, Ban, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Agent {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  status: string;
  isOnline: boolean;
  isBusy: boolean;
  activeChatCount: number;
  maxConcurrentChats: number;
  lastActiveAt: string | null;
  statusMessage: string | null;
  avatar: string | null;
  isSuspended: boolean;
  createdAt: string;
  lastLogin: string | null;
}

const statusDot: Record<string, string> = {
  ONLINE: 'bg-emerald-500',
  BUSY: 'bg-red-500',
  AWAY: 'bg-amber-500',
  OFFLINE: 'bg-slate-300',
  IN_MEETING: 'bg-purple-500',
  BREAK: 'bg-amber-500',
};

const roleBadge: Record<string, string> = ROLE_BADGE_COLORS;

export default function AgentsPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [actionMsg, setActionMsg] = useState<{ id: string; text: string; ok: boolean } | null>(null);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterRole) params.set('role', filterRole);
      const res = await fetch(`/api/admin/agents?${params}`);
      const data = await res.json();
      if (!data.success || data.error) { setError(data.error || 'Failed to load agents'); return; }
      setAgents(data.agents || []);
    } catch {
      setError('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (agent: Agent) => {
    const newStatus = agent.isOnline ? 'OFFLINE' : 'ONLINE';
    setActionMsg({ id: agent.id, text: `${newStatus === 'ONLINE' ? 'Going online...' : 'Going offline...'}`, ok: true });
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!data.success || data.error) {
        setActionMsg({ id: agent.id, text: data.error || 'Failed', ok: false });
      } else {
        setActionMsg({ id: agent.id, text: `Now ${newStatus === 'ONLINE' ? 'Online' : 'Offline'}`, ok: true });
      }
    } catch {
      setActionMsg({ id: agent.id, text: 'Failed to update', ok: false });
    }
    setTimeout(() => setActionMsg(null), 2000);
    fetchAgents();
  };

  const deactivateAgent = async (agent: Agent) => {
    if (!confirm(`Deactivate ${agent.name || agent.email}?`)) return;
    setActionMsg({ id: agent.id, text: 'Deactivating...', ok: true });
    try {
      const res = await fetch(`/api/admin/agents/${agent.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success || data.error) {
        setActionMsg({ id: agent.id, text: data.error || 'Failed', ok: false });
      } else {
        setActionMsg({ id: agent.id, text: 'Deactivated', ok: true });
      }
    } catch {
      setActionMsg({ id: agent.id, text: 'Failed', ok: false });
    }
    setTimeout(() => setActionMsg(null), 2000);
    fetchAgents();
  };

  useEffect(() => { fetchAgents(); }, []);

  useEffect(() => {
    const timer = setTimeout(fetchAgents, 300);
    return () => clearTimeout(timer);
  }, [search, filterRole]);

  const onlineCount = agents.filter(a => a.isOnline && a.isActive && !a.isSuspended).length;
  const busyCount = agents.filter(a => a.isBusy).length;

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
          {[...CREATABLE_ROLES].map(role => (
            <option key={role} value={role}>{ROLE_LABELS[role] || role}</option>
          ))}
        </select>
      </div>

      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-red-700 text-sm">{error}</span>
          <button onClick={fetchAgents} className="text-sm text-red-700 underline hover:no-underline shrink-0 ml-4">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : agents.length === 0 && !error ? (
        <div className="text-center py-20 bg-card border rounded-xl">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">No agents found</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Add your first support agent</p>
          <Link
            href="/admin/agents/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 mt-4"
          >
            <UserPlus className="h-4 w-4" />
            Add Agent
          </Link>
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
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary relative">
                          {(agent.name || agent.email)[0].toUpperCase()}
                          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${statusDot[agent.status] || 'bg-slate-300'}`} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{agent.name || 'Unnamed'}</p>
                          <p className="text-xs text-muted-foreground">{agent.email}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${roleBadge[agent.role] || 'bg-slate-100 text-slate-700'}`}>
                        {ROLE_LABELS[agent.role] || agent.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {agent.isOnline ? (
                          <Wifi className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <WifiOff className="h-3.5 w-3.5 text-slate-300" />
                        )}
                        <span className="text-sm capitalize">{agent.status.toLowerCase().replace(/_/g, ' ')}</span>
                        {agent.isSuspended && (
                          <span className="text-xs text-red-500 font-medium">Suspended</span>
                        )}
                      </div>
                      {agent.statusMessage && (
                        <p className="text-xs text-muted-foreground mt-0.5">{agent.statusMessage}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{agent.activeChatCount}</span>
                        <span className="text-xs text-muted-foreground">/ {agent.maxConcurrentChats}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm text-muted-foreground">
                        {agent.lastActiveAt
                          ? new Date(agent.lastActiveAt).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </td>
                    <td className="px-5 py-4 relative">
                      {actionMsg?.id === agent.id && (
                        <div className={`absolute right-12 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded ${actionMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          {actionMsg.text}
                        </div>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded hover:bg-accent inline-block">
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => router.push(`/admin/agents/${agent.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/admin/agents/${agent.id}`)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => toggleStatus(agent)}>
                            {agent.isOnline ? (
                              <><ToggleRight className="h-4 w-4 mr-2 text-amber-500" /> Set Offline</>
                            ) : (
                              <><ToggleLeft className="h-4 w-4 mr-2 text-emerald-500" /> Set Online</>
                            )}
                          </DropdownMenuItem>
                          {agent.isActive && (
                            <DropdownMenuItem onClick={() => deactivateAgent(agent)} className="text-red-600">
                              <Ban className="h-4 w-4 mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
