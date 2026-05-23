'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, X, Send, ChevronRight, Loader2, Lock, Sparkles,
  ArrowLeft, Clock, CheckCircle, HelpCircle, FileText, CreditCard,
  LogIn, Package, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────
interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: { message: string; senderType: string; createdAt: string } | null;
  unreadCount: number;
}

interface Message {
  id: string;
  senderType: string;
  message: string;
  createdAt: string;
  status?: string;
  deliveredAt?: string | null;
  seenAt?: string | null;
  readAt?: string | null;
  clientMessageId?: string | null;
}

type WidgetView = 'menu' | 'help' | 'conversation' | 'new' | 'submitted' | 'locked';
type MenuTab = 'help' | 'tickets';

// ─── Helpers ──────────────────────────────────────────────────────
function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (d.toDateString() === now.toDateString()) return `${hours}:${mins}`;
  return `${dateStr} ${hours}:${mins}`;
}

function formatDateHeading(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700 border-blue-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CLOSED: 'bg-slate-50 text-slate-500 border-slate-200',
};

const HELP_OPTIONS = [
  { id: 'billing', label: 'Billing & Payments', icon: CreditCard, desc: 'Invoices, upgrades, and payment questions', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'login', label: 'Login Issues', icon: LogIn, desc: 'Can\'t sign in or access your account', color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'assets', label: 'Managing Assets', icon: Package, desc: 'Adding, editing, and organizing assets', color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'reports', label: 'Reports & Export', icon: FileText, desc: 'Generating reports and exporting data', color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'other', label: 'Other Question', icon: HelpCircle, desc: 'Something else not listed here', color: 'text-slate-600', bg: 'bg-slate-50' },
];

const HELP_TEXTS: Record<string, string> = {
  billing: 'For billing questions, visit your Billing page to view your plan and payment history. If you need to upgrade or modify your subscription, you can do so from the billing settings.',
  login: 'If you cannot log in: 1) Check your email for the correct address. 2) Use "Forgot Password" to reset. 3) Ensure your account is active — contact your organization admin.',
  assets: 'Add assets from the Assets page. Edit or view assets by clicking on them. Use categories and locations to organize your inventory efficiently.',
  reports: 'Generate reports from the Reports page. Use filters to customize your data. Export using the export buttons on each report page.',
  other: 'Describe your issue in detail and we will help you resolve it as quickly as possible.',
};

function DeliveryStatus({ status }: { status?: string }) {
  if (!status || status === 'SENT') return <span className="text-[9px] text-muted-foreground ml-1">✓</span>;
  if (status === 'DELIVERED') return <span className="text-[9px] text-primary ml-1">✓✓</span>;
  if (status === 'SEEN') return <span className="text-[9px] text-blue-500 ml-1">✓✓</span>;
  if (status === 'SENDING') return <Loader2 className="h-2.5 w-2.5 animate-spin inline ml-1" />;
  return null;
}

interface SupportWidgetProps { userPlan: string; }

export default function SupportWidget({ userPlan }: SupportWidgetProps) {
  const isPro = userPlan === 'PRO' || userPlan === 'ENTERPRISE';
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<WidgetView>('menu');
  const [menuTab, setMenuTab] = useState<MenuTab>('help');
  const [selectedHelp, setSelectedHelp] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<Record<string, string>>({});
  const msgEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollRef = useRef<string>(new Date().toISOString());
  const sendingRef = useRef(false);

  // ── Data fetching ──────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    setLoadingTickets(true);
    try { const r = await fetch('/api/support/tickets'); if (r.ok) setTickets(await r.json()); }
    catch { /* ignore */ } finally { setLoadingTickets(false); }
  }, []);

  const mergeMessages = useCallback((existing: Message[], incoming: Message[]) => {
    const map = new Map<string, Message>();
    for (const m of existing) map.set(m.id, m);
    for (const m of incoming) {
      map.set(m.id, m);
      if (m.clientMessageId) {
        const optimisticId = `opt-${m.clientMessageId}`;
        if (map.has(optimisticId)) map.delete(optimisticId);
      }
    }
    return Array.from(map.values());
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    setLoadingMessages(true);
    try {
      const r = await fetch(`/api/support/tickets/${id}`);
      if (r.ok) {
        const d = await r.json();
        setMessages(prev => mergeMessages(prev, d.messages || []));
        setAdminTyping(d.adminTyping || false);
      }
    }
    catch { /* ignore */ } finally { setLoadingMessages(false); }
  }, [mergeMessages]);

  const fetchUnread = useCallback(async () => {
    try { const r = await fetch('/api/support/unread'); if (r.ok) setUnreadCount((await r.json()).unreadCount || 0); }
    catch { /* ignore */ }
  }, []);

  const markRead = useCallback(async (id: string) => {
    try { await fetch(`/api/support/tickets/${id}/read`, { method: 'POST' }); } catch { /* ignore */ }
  }, []);

  // ── Polling for real-time updates ──────────────────────────────
  useEffect(() => {
    if (!open || view !== 'conversation' || !currentTicketId) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      const since = lastPollRef.current;
      try {
        const r = await fetch(`/api/support/tickets/${currentTicketId}/poll?since=${encodeURIComponent(since)}`);
        if (r.ok) {
          const d = await r.json();
          if (d.newMessages?.length > 0) {
            setMessages(prev => mergeMessages(prev, d.newMessages));
            if (d.latestMessageAt) lastPollRef.current = d.latestMessageAt;
          }
          setAdminTyping(d.adminTyping || false);
          if (d.ticketStatus) {
            setTickets(prev => prev.map(t => t.id === currentTicketId ? { ...t, status: d.ticketStatus } : t));
          }
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [open, view, currentTicketId, mergeMessages]);

  useEffect(() => { if (!open || view !== 'menu' || !isPro) return; fetchUnread(); const i = setInterval(fetchUnread, 10000); return () => clearInterval(i); }, [open, view, isPro, fetchUnread]);
  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, adminTyping]);

  // ── Typing heartbeat ───────────────────────────────────────────
  const sendTyping = useCallback(async (id: string) => {
    try { await fetch(`/api/support/tickets/${id}/typing`, { method: 'POST' }); } catch { /* ignore */ }
  }, []);

  const handleReplyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setReplyText(val);
    if (val.trim() && currentTicketId) {
      sendTyping(currentTicketId);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => { /* cooldown */ }, 3000);
    }
  };

  // ── Open / Close ───────────────────────────────────────────────
  const handleOpen = () => {
    setOpen(true);
    if (!isPro) { setView('locked'); return; }
    setView('menu'); setMenuTab('help');
    fetchTickets(); fetchUnread();
  };

  const handleClose = () => {
    setOpen(false); setView('menu'); setMenuTab('help');
    setCurrentTicketId(null); setMessages([]); setReplyText(''); setAdminTyping(false);
    setNewSubject(''); setNewMessage(''); setSelectedHelp(null);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const resetView = () => { setView('menu'); setMenuTab('help'); setSelectedHelp(null); };

  // ── Conversation ───────────────────────────────────────────────
  const openConversation = async (ticketId: string) => {
    setCurrentTicketId(ticketId); setView('conversation');
    await fetchMessages(ticketId); markRead(ticketId);
    lastPollRef.current = new Date().toISOString();
  };

  const sendReply = async () => {
    if (!replyText.trim() || !currentTicketId || sendingRef.current) return;
    sendingRef.current = true;
    const clientMessageId = crypto.randomUUID();
    const optimisticId = `opt-${clientMessageId}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      clientMessageId,
      senderType: 'USER',
      message: replyText,
      createdAt: new Date().toISOString(),
      status: 'SENDING',
    };
    setMessages(p => [...p, optimisticMsg]);
    const text = replyText;
    setReplyText('');
    setSending(true);
    try {
      const r = await fetch(`/api/support/tickets/${currentTicketId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, clientMessageId }),
      });
      if (r.ok) {
        const m = await r.json();
        setMessages(p => mergeMessages(p, [{ ...m, status: m.status || 'SENT' }]));
      } else {
        setMessages(p => p.filter(msg => msg.id !== optimisticId));
      }
    } catch {
      setMessages(p => p.filter(msg => msg.id !== optimisticId));
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };

  // ── Create ticket ──────────────────────────────────────────────
  const createTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setSubmitting(true);
    try {
      const r = await fetch('/api/support/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject, category: selectedHelp || 'other', message: newMessage }),
      });
      if (r.ok) { setView('submitted'); fetchTickets(); }
    } catch { /* ignore */ } finally { setSubmitting(false); }
  };

  // ── Group messages ─────────────────────────────────────────────
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((m) => {
    const key = new Date(m.createdAt).toDateString();
    const g = groupedMessages[groupedMessages.length - 1];
    if (g && g.date === key) g.msgs.push(m);
    else groupedMessages.push({ date: key, msgs: [m] });
  });

  const currentTicket = tickets.find(t => t.id === currentTicketId);
  const helpOption = HELP_OPTIONS.find(o => o.id === selectedHelp);

  return (
    <>
      {/* ─── Launcher ──────────────────────────────────────────── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {unreadCount > 0 && (
          <div className="bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 shadow-lg animate-in fade-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
        <Button onClick={() => open ? handleClose() : handleOpen()}
          className="h-14 w-14 rounded-full shadow-xl hover:shadow-2xl transition-shadow duration-200"
          size="icon">
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </Button>
      </div>

      {/* ─── Dialog ─────────────────────────────────────────────── */}
      <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 max-h-[85vh] flex flex-col overflow-hidden rounded-2xl">
          
          {/* ── Header ─────────────────────────────────────────── */}
          <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0 bg-gradient-to-r from-primary/5 via-primary/5 to-transparent">
            <div className="flex items-center gap-2">
              {view === 'conversation' && (
                <button onClick={() => { setView('menu'); setMenuTab('tickets'); setCurrentTicketId(null); }}
                  className="p-1.5 hover:bg-black/5 rounded-lg -ml-1.5 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              {(view === 'help' || view === 'new') && (
                <button onClick={resetView}
                  className="p-1.5 hover:bg-black/5 rounded-lg -ml-1.5 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base font-semibold">
                  {view === 'locked' ? 'Support' :
                   view === 'conversation' ? (currentTicket?.subject || 'Conversation') :
                   view === 'help' && helpOption ? helpOption.label :
                   view === 'new' ? 'New Ticket' :
                   view === 'submitted' ? 'Ticket Created' :
                   'How can we help?'}
                </DialogTitle>
                {view === 'conversation' && currentTicket && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_BADGE[currentTicket.status] || ''}`}>
                      {currentTicket.status}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      #{currentTicket.id.slice(0, 7)}
                    </span>
                  </div>
                )}
              </div>
              {!isPro && view === 'locked' && (
                <Badge variant="secondary" className="text-[10px]">Free</Badge>
              )}
            </div>
          </DialogHeader>

          {/* ── Body ────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto bg-white">
            
            {/* ── LOCKED (FREE users) ──────────────────────────── */}
            {view === 'locked' && (
              <div className="p-6 space-y-5">
                <div className="flex justify-center pt-4">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary via-primary/80 to-primary/60 rounded-full flex items-center justify-center shadow-lg">
                      <Lock className="h-9 w-9 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center shadow-md">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-1">Premium Support</h3>
                  <p className="text-sm text-muted-foreground">Available on Pro and Enterprise plans</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <p className="text-sm text-amber-800 text-center">
                    Upgrade to get live chat support, priority responses, and a dedicated support team.
                  </p>
                </div>
                <Link href="/billing" onClick={() => setOpen(false)}>
                  <Button className="w-full bg-gradient-to-r from-primary to-primary/90 shadow-md hover:shadow-lg transition-shadow">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Upgrade to PRO
                  </Button>
                </Link>
                <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleClose}>
                  Maybe Later
                </Button>
              </div>
            )}

            {/* ── MENU (PRO/Enterprise) ─────────────────────────── */}
            {view === 'menu' && isPro && (
              <div className="flex flex-col h-full">
                {/* Tabs */}
                <div className="flex border-b px-4 shrink-0">
                  <button onClick={() => setMenuTab('help')}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                      menuTab === 'help' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}>
                    Get Help
                  </button>
                  <button onClick={() => { setMenuTab('tickets'); fetchTickets(); }}
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                      menuTab === 'tickets' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}>
                    My Tickets
                    {unreadCount > 0 && menuTab !== 'tickets' && (
                      <span className="ml-1.5 text-[10px] bg-blue-500 text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>
                    )}
                  </button>
                </div>

                {/* Tab: Help */}
                {menuTab === 'help' && (
                  <div className="p-4 space-y-2">
                    <p className="text-xs text-muted-foreground mb-3">Select a topic for quick help, or create a ticket if you need more assistance.</p>
                    {HELP_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      return (
                        <button key={opt.id} onClick={() => { setSelectedHelp(opt.id); setView('help'); }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-transparent hover:border-border hover:bg-muted/30 transition-all text-left group">
                          <div className={`w-9 h-9 rounded-lg ${opt.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-4.5 w-4.5 ${opt.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{opt.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{opt.desc}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Tab: Tickets */}
                {menuTab === 'tickets' && (
                  <div className="flex-1">
                    {loadingTickets ? (
                      <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                    ) : tickets.length === 0 ? (
                      <div className="text-center py-12 px-4">
                        <MessageCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground mb-1">No conversations yet</p>
                        <p className="text-xs text-muted-foreground/70">Create a ticket from the Get Help tab</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {tickets.map((t) => (
                          <button key={t.id} onClick={() => openConversation(t.id)}
                            className="w-full text-left px-4 py-3.5 hover:bg-muted/30 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                                t.status === 'OPEN' ? 'bg-blue-500' :
                                t.status === 'PENDING' ? 'bg-amber-500' :
                                t.status === 'RESOLVED' ? 'bg-emerald-500' : 'bg-slate-300'
                              }`} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium truncate">{t.subject}</p>
                                  <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(t.updatedAt)}</span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {t.lastMessage?.message || 'No messages'}
                                </p>
                              </div>
                              {t.unreadCount > 0 && (
                                <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1.5 shrink-0">
                                  {t.unreadCount}
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── HELP (self-help + create ticket) ──────────────── */}
            {view === 'help' && helpOption && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-10 h-10 rounded-xl ${helpOption.bg} flex items-center justify-center`}>
                    <helpOption.icon className={`h-5 w-5 ${helpOption.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{helpOption.label}</p>
                    <p className="text-xs text-muted-foreground">Quick help guide</p>
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-xl border text-sm leading-relaxed text-muted-foreground">
                  {HELP_TEXTS[helpOption.id]}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" className="flex-1" onClick={resetView}>
                    <CheckCircle className="h-4 w-4 mr-1.5" />
                    Yes, Solved
                  </Button>
                  <Button className="flex-1" onClick={() => { setNewSubject(''); setNewMessage(''); setView('new'); }}>
                    <HelpCircle className="h-4 w-4 mr-1.5" />
                    Create Ticket
                  </Button>
                </div>
              </div>
            )}

            {/* ── NEW TICKET ────────────────────────────────────── */}
            {view === 'new' && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Subject</label>
                  <Input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Brief description of your issue" className="text-sm" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Message</label>
                  <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Describe your issue in detail..." rows={5}
                    className="w-full px-3 py-2.5 border rounded-lg text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                </div>
              </div>
            )}

            {/* ── SUBMITTED ─────────────────────────────────────── */}
            {view === 'submitted' && (
              <div className="p-8 text-center space-y-4">
                <div className="mx-auto w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-emerald-500" />
                </div>
                <div>
                  <p className="text-base font-semibold">Ticket Submitted</p>
                  <p className="text-sm text-muted-foreground mt-1">Our support team will respond within 24 hours.</p>
                </div>
              </div>
            )}

            {/* ── CONVERSATION (threaded chat) ──────────────────── */}
            {view === 'conversation' && (
              <div className="p-4 space-y-1 min-h-[300px]">
                {loadingMessages ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.date}>
                      <div className="flex justify-center my-4">
                        <span className="text-[10px] text-muted-foreground bg-muted/70 px-2.5 py-1 rounded-full">
                          {formatDateHeading(group.msgs[0].createdAt)}
                        </span>
                      </div>
                      {group.msgs.map((msg, idx) => {
                        const isUser = msg.senderType === 'USER';
                        const showAvatar = idx === 0 || group.msgs[idx - 1].senderType !== msg.senderType;
                        const isSending = msg.status === 'SENDING';
                        return (
                          <div key={msg.id} className={`flex items-end gap-2 mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                            {!isUser && showAvatar && (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">
                                S
                              </div>
                            )}
                            {!isUser && !showAvatar && <div className="w-7 shrink-0" />}
                            <div className={`max-w-[78%] ${isUser ? 'order-1' : 'order-1'}`}>
                              {!isUser && showAvatar && (
                                <p className="text-[10px] font-semibold text-primary/80 mb-1 ml-0.5">Support Team</p>
                              )}
                              <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                                isUser
                                  ? 'bg-primary text-primary-foreground rounded-br-md'
                                  : 'bg-muted/80 rounded-bl-md'
                              } ${isSending ? 'opacity-70' : ''}`}>
                                <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                                <div className={`flex items-center justify-end gap-0.5 text-[10px] mt-1.5 ${isUser ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                  <span>{formatTime(msg.createdAt)}</span>
                                  {isUser && <DeliveryStatus status={msg.status} />}
                                </div>
                              </div>
                            </div>
                            {isUser && showAvatar && (
                              <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-bold shrink-0 shadow-sm">
                                U
                              </div>
                            )}
                            {isUser && !showAvatar && <div className="w-7 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
                {/* Typing indicator */}
                {adminTyping && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1 animate-pulse">
                    <div className="flex gap-0.5 items-center">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-muted-foreground/70">Support is typing...</span>
                  </div>
                )}
                <div ref={msgEndRef} />
              </div>
            )}
          </div>

          {/* ── Footer ──────────────────────────────────────────── */}
          <div className="border-t bg-white p-3 shrink-0">
            {view === 'new' && (
              <Button className="w-full" onClick={createTicket} disabled={submitting || !newSubject.trim() || !newMessage.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Ticket
              </Button>
            )}
            {view === 'submitted' && (
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { fetchTickets(); setView('menu'); setMenuTab('tickets'); }}>
                  View My Tickets
                </Button>
                <Button className="flex-1" onClick={handleClose}>Done</Button>
              </div>
            )}
            {view === 'conversation' && (
              <form onSubmit={e => { e.preventDefault(); sendReply(); }} className="flex gap-2 items-end">
                <div className="flex-1 relative">
                  <Input value={replyText} onChange={handleReplyChange}
                    placeholder="Type your reply..." disabled={sending}
                    className="pr-10 text-sm rounded-xl bg-muted/30 border-muted focus-visible:bg-background" />
                </div>
                <Button type="submit" size="icon" disabled={sending || !replyText.trim()}
                  className="rounded-xl h-10 w-10 shrink-0 shadow-sm">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            )}
            {view === 'locked' && (
              <p className="text-[10px] text-muted-foreground text-center">Live chat support on Pro and Enterprise</p>
            )}
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}
