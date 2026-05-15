'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Loader2, ArrowLeft, User, Mail, Shield, Calendar,
  CheckCircle, XCircle, AlertCircle, Wifi, WifiOff,
  MessageSquare, Hash, RefreshCw,
} from 'lucide-react';

interface Agent {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  status: string;
  isOnline: boolean;
  isBusy: boolean;
  maxConcurrentChats: number;
  activeChatCount: number;
  lastActiveAt: string | null;
  statusMessage: string | null;
  avatar: string | null;
  isSuspended: boolean;
  createdByOwner: boolean;
  assignedDepartments: string[];
  createdAt: string;
  lastLogin: string | null;
  _count?: { assignedTickets: number };
}

const statusDot: Record<string, string> = {
  ONLINE: 'bg-emerald-500',
  BUSY: 'bg-red-500',
  AWAY: 'bg-amber-500',
  OFFLINE: 'bg-slate-300',
  IN_MEETING: 'bg-purple-500',
  BREAK: 'bg-amber-500',
};

const roleBadge: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  SUPER_ADMIN: 'bg-red-100 text-red-700',
  SUPPORT_MANAGER: 'bg-blue-100 text-blue-700',
  SUPPORT_AGENT: 'bg-emerald-100 text-emerald-700',
  FINANCE_ADMIN: 'bg-amber-100 text-amber-700',
  VIEWER: 'bg-slate-100 text-slate-700',
};

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [message, setMessage] = useState('');

  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    maxConcurrentChats: 5,
    statusMessage: '',
    assignedDepartments: '',
  });

  const fetchAgent = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/agents/${params.id}`);
      if (res.status === 401 || res.status === 403) {
        router.push('/admin');
        return;
      }
      const data = await res.json();
      if (!data.success || data.error) {
        setError(data.error || 'Failed to load agent');
      } else {
        setAgent(data.agent);
      }
    } catch {
      setError('Failed to load agent');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAgent(); }, [params.id]);

  const startEditing = () => {
    if (!agent) return;
    setEditForm({
      name: agent.name || '',
      role: agent.role,
      maxConcurrentChats: agent.maxConcurrentChats,
      statusMessage: agent.statusMessage || '',
      assignedDepartments: (agent.assignedDepartments || []).join(', '),
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!agent) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/agents/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name || null,
          role: editForm.role,
          maxConcurrentChats: editForm.maxConcurrentChats,
          statusMessage: editForm.statusMessage || null,
          assignedDepartments: editForm.assignedDepartments ? editForm.assignedDepartments.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
        }),
      });
      const data = await res.json();
      if (!data.success || data.error) {
        setMessage(data.error || 'Failed to save');
      } else {
        setAgent(data.agent);
        setEditing(false);
        setMessage('Saved successfully');
      }
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!agent) return;
    setDeactivating(true);
    setMessage('');
    try {
      const res = await fetch(`/api/admin/agents/${params.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!data.success || data.error) {
        setMessage(data.error || 'Failed to deactivate');
      } else {
        setAgent({ ...agent, isActive: false });
        setMessage('Agent deactivated');
      }
    } catch {
      setMessage('Failed to deactivate');
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !agent) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" asChild>
          <Link href="/admin/agents">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Link>
        </Button>
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <p className="text-red-500 font-medium">{error}</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={fetchAgent} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/agents">Back to List</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agent) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" asChild>
          <Link href="/admin/agents">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Agents
          </Link>
        </Button>
        <div className="flex gap-2">
          {!editing && (
            <Button onClick={startEditing} variant="outline">Edit Agent</Button>
          )}
          {agent.isActive && !agent.isSuspended && (
            <Button onClick={handleDeactivate} disabled={deactivating} variant="destructive">
              {deactivating ? 'Deactivating...' : 'Deactivate'}
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${
          message === 'Saved successfully' || message === 'Agent deactivated'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {editing ? 'Edit Agent' : 'Agent Details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                      <SelectItem value="SUPPORT_MANAGER">Support Manager</SelectItem>
                      <SelectItem value="SUPPORT_AGENT">Support Agent</SelectItem>
                      <SelectItem value="FINANCE_ADMIN">Finance Admin</SelectItem>
                      <SelectItem value="VIEWER">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxChats">Max Concurrent Chats</Label>
                  <Input id="maxChats" type="number" min={1} max={50} value={editForm.maxConcurrentChats} onChange={(e) => setEditForm({ ...editForm, maxConcurrentChats: parseInt(e.target.value) || 5 })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="statusMessage">Status Message</Label>
                  <Textarea id="statusMessage" value={editForm.statusMessage} onChange={(e) => setEditForm({ ...editForm, statusMessage: e.target.value })} placeholder="e.g. Available for support" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departments">Assigned Departments (comma separated)</Label>
                  <Input id="departments" value={editForm.assignedDepartments} onChange={(e) => setEditForm({ ...editForm, assignedDepartments: e.target.value })} placeholder="e.g. Sales, Support, Billing" />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button onClick={() => setEditing(false)} variant="outline">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{agent.name || 'Unnamed'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{agent.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <Badge className={roleBadge[agent.role]}>{agent.role.replace(/_/g, ' ')}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {agent.isActive ? <CheckCircle className="h-5 w-5 text-green-500 shrink-0" /> : <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant="outline" className={agent.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {agent.isSuspended && (
                      <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">Suspended</Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Wifi className={`h-5 w-5 shrink-0 ${agent.isOnline ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <div>
                    <p className="text-sm text-muted-foreground">Connection</p>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-medium capitalize ${agent.isOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                      <span className={`w-2 h-2 rounded-full ${statusDot[agent.status] || 'bg-slate-300'}`} />
                      {agent.status.toLowerCase().replace(/_/g, ' ')}
                      {agent.isBusy && ' (Busy)'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Chats</p>
                    <p className="font-medium">{agent.activeChatCount} / {agent.maxConcurrentChats}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned Tickets</p>
                    <p className="font-medium">{agent._count?.assignedTickets ?? 0}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="font-medium">{new Date(agent.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Last Active</p>
                    <p className="font-medium">{agent.lastActiveAt ? new Date(agent.lastActiveAt).toLocaleString() : 'Never'}</p>
                  </div>
                </div>
                {agent.statusMessage && (
                  <div className="md:col-span-2 flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Status Message</p>
                      <p className="font-medium">{agent.statusMessage}</p>
                    </div>
                  </div>
                )}
                {agent.assignedDepartments && agent.assignedDepartments.length > 0 && (
                  <div className="md:col-span-2 flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Departments</p>
                      <div className="flex gap-1.5 flex-wrap mt-1">
                        {agent.assignedDepartments.map((dept) => (
                          <Badge key={dept} variant="outline">{dept}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Quick Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center py-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary relative mb-3">
                {(agent.name || agent.email)[0].toUpperCase()}
                <span className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-card ${statusDot[agent.status] || 'bg-slate-300'}`} />
              </div>
              <p className="font-semibold text-lg">{agent.name || 'Unnamed'}</p>
              <p className="text-sm text-muted-foreground">{agent.email}</p>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Role</span>
                <Badge className={roleBadge[agent.role]}>{agent.role.replace(/_/g, ' ')}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={agent.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}>
                  {agent.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Online</span>
                {agent.isOnline ? (
                  <span className="flex items-center gap-1 text-emerald-600"><Wifi className="h-3.5 w-3.5" /> Online</span>
                ) : (
                  <span className="flex items-center gap-1 text-slate-400"><WifiOff className="h-3.5 w-3.5" /> Offline</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Chats</span>
                <span>{agent.activeChatCount} / {agent.maxConcurrentChats}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tickets</span>
                <span>{agent._count?.assignedTickets ?? 0}</span>
              </div>
              {agent.createdByOwner && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created By</span>
                  <Badge variant="outline">Owner</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
