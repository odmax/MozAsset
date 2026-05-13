'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageCircle, X, Send, ChevronRight, Loader2, Lock, Sparkles,
  ArrowLeft, Clock, CheckCircle, AlertCircle
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
  readAt: string | null;
}

type WidgetView = 'menu' | 'conversation' | 'new' | 'submitted' | 'locked';

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
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-500',
};

const FREE_MESSAGES = [
  "Live chat support is available on Pro and Enterprise plans.",
  "Want real-time help from our support team? Upgrade to Pro!",
  "Need faster support? Pro and Enterprise plans get priority chat.",
];

// ─── Component ────────────────────────────────────────────────────
interface SupportWidgetProps {
  userPlan: string;
}

export default function SupportWidget({ userPlan }: SupportWidgetProps) {
  const isPro = userPlan === 'PRO' || userPlan === 'ENTERPRISE';
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<WidgetView>('menu');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // New ticket form
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newCategory, setNewCategory] = useState('other');
  const [submitting, setSubmitting] = useState(false);

  const msgEndRef = useRef<HTMLDivElement>(null);
  const [randomMsg] = useState(() => FREE_MESSAGES[Math.floor(Math.random() * FREE_MESSAGES.length)]);

  // ── Fetch tickets ──────────────────────────────────────────────
  const fetchTickets = useCallback(async () => {
    try {
      setLoadingTickets(true);
      const res = await fetch('/api/support/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch { /* ignore */ } finally {
      setLoadingTickets(false);
    }
  }, []);

  // ── Fetch messages ─────────────────────────────────────────────
  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/support/tickets/${ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch { /* ignore */ } finally {
      setLoadingMessages(false);
    }
  }, []);

  // ── Mark as read ───────────────────────────────────────────────
  const markRead = useCallback(async (ticketId: string) => {
    try {
      await fetch(`/api/support/tickets/${ticketId}/read`, { method: 'POST' });
    } catch { /* ignore */ }
  }, []);

  // ── Fetch unread count ─────────────────────────────────────────
  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/support/unread');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch { /* ignore */ }
  }, []);

  // ── Open widget ────────────────────────────────────────────────
  const handleOpen = () => {
    setOpen(true);
    if (!isPro) { setView('locked'); return; }
    setView('menu');
    fetchTickets();
    fetchUnread();
  };

  // ── Close widget ───────────────────────────────────────────────
  const handleClose = () => {
    setOpen(false);
    setView('menu');
    setCurrentTicketId(null);
    setMessages([]);
    setReplyText('');
    setNewSubject('');
    setNewMessage('');
    setNewCategory('other');
  };

  // ── Open conversation ──────────────────────────────────────────
  const openConversation = (ticketId: string) => {
    setCurrentTicketId(ticketId);
    setView('conversation');
    fetchMessages(ticketId);
    markRead(ticketId);
  };

  // ── Send reply ─────────────────────────────────────────────────
  const sendReply = async () => {
    if (!replyText.trim() || !currentTicketId) return;
    setSending(true);
    try {
      const res = await fetch(`/api/support/tickets/${currentTicketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText }),
      });
      if (res.ok) {
        const msg = await res.json();
        setMessages((prev) => [...prev, msg]);
        setReplyText('');
      }
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  // ── Create ticket ──────────────────────────────────────────────
  const createTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: newSubject, category: newCategory, message: newMessage }),
      });
      if (res.ok) {
        setView('submitted');
        fetchTickets();
      }
    } catch { /* ignore */ } finally {
      setSubmitting(false);
    }
  };

  // ── Scroll to bottom ───────────────────────────────────────────
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Poll unread when on menu ───────────────────────────────────
  useEffect(() => {
    if (!open || view !== 'menu' || !isPro) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 10000);
    return () => clearInterval(interval);
  }, [open, view, isPro, fetchUnread]);

  // ── Poll messages when in conversation ─────────────────────────
  useEffect(() => {
    if (!open || view !== 'conversation' || !currentTicketId) return;
    const interval = setInterval(() => {
      fetchMessages(currentTicketId);
    }, 5000);
    return () => clearInterval(interval);
  }, [open, view, currentTicketId, fetchMessages]);

  // ── Scroll to bottom on new messages ───────────────────────────
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Build grouped messages ─────────────────────────────────────
  const groupedMessages: { date: string; msgs: Message[] }[] = [];
  messages.forEach((m) => {
    const key = new Date(m.createdAt).toDateString();
    const group = groupedMessages[groupedMessages.length - 1];
    if (group && group.date === key) {
      group.msgs.push(m);
    } else {
      groupedMessages.push({ date: key, msgs: [m] });
    }
  });

  const currentTicket = tickets.find((t) => t.id === currentTicketId);

  return (
    <>
      {/* Launcher button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
        {unreadCount > 0 && (
          <div className="bg-red-500 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1 shadow-lg">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
        <Button
          onClick={open ? handleClose : handleOpen}
          className="h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        </Button>
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 max-h-[85vh] flex flex-col">
          {/* ─── Header ─────────────────────────────────────────── */}
          <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
            <div className="flex items-center justify-between">
              {view === 'conversation' && (
                <button onClick={() => { setView('menu'); setCurrentTicketId(null); }} className="p-1 hover:bg-muted rounded-md -ml-1">
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="flex-1">
                <DialogTitle className="text-base">
                  {view === 'locked' ? 'Support' :
                   view === 'conversation' ? (currentTicket?.subject || 'Conversation') :
                   view === 'new' ? 'New Ticket' :
                   view === 'submitted' ? 'Ticket Created' :
                   'Support'}
                </DialogTitle>
                {view === 'conversation' && currentTicket && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[currentTicket.status] || ''}`}>
                      {currentTicket.status}
                    </span>
                  </div>
                )}
              </div>
              {!isPro && view === 'locked' && (
                <Badge variant="secondary" className="text-xs">Free</Badge>
              )}
            </div>
          </DialogHeader>

          {/* ─── Body ───────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto min-h-[300px] max-h-[55vh]">
            {/* LOCKED */}
            {view === 'locked' && (
              <div className="p-6 space-y-4">
                <div className="flex justify-center py-4">
                  <div className="relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
                      <Lock className="h-10 w-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-muted rounded-lg text-center">
                  <p className="text-sm">{randomMsg}</p>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  You can still submit a ticket — we&apos;ll respond via email.
                </p>
                <Button variant="outline" className="w-full" onClick={() => { setNewSubject(''); setNewMessage(''); setView('new'); }}>
                  Submit a Ticket
                </Button>
                <Link href="/billing" onClick={() => setOpen(false)}>
                  <Button className="w-full">Upgrade to PRO</Button>
                </Link>
                <Button variant="ghost" className="w-full" onClick={handleClose}>Maybe Later</Button>
              </div>
            )}

            {/* MENU */}
            {view === 'menu' && isPro && (
              <div className="p-4 space-y-3">
                <Button className="w-full justify-start gap-2" onClick={() => { setNewSubject(''); setNewMessage(''); setView('new'); }}>
                  <MessageCircle className="h-4 w-4" />
                  New Conversation
                </Button>

                {loadingTickets ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tickets yet</p>
                  </div>
                ) : (
                  <div className="space-y-1 -mx-4">
                    {tickets.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => openConversation(t.id)}
                        className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate flex items-center gap-2">
                              {t.subject}
                              {t.unreadCount > 0 && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {t.lastMessage?.message || 'No messages'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status] || ''}`}>
                              {t.status}
                            </span>
                            {t.unreadCount > 0 && (
                              <span className="text-xs bg-blue-500 text-white rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                                {t.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatTime(t.updatedAt)}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* CONVERSATION */}
            {view === 'conversation' && (
              <div className="p-4 space-y-1">
                {loadingMessages ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  groupedMessages.map((group) => (
                    <div key={group.date}>
                      <div className="flex justify-center my-3">
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {formatDateHeading(group.msgs[0].createdAt)}
                        </span>
                      </div>
                      {group.msgs.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.senderType === 'USER' ? 'justify-end' : 'justify-start'} mb-2`}>
                          <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                            msg.senderType === 'USER'
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          }`}>
                            {msg.senderType !== 'USER' && (
                              <p className="text-[10px] font-semibold text-primary mb-0.5">Support Team</p>
                            )}
                            <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                            <p className={`text-[10px] mt-1 ${msg.senderType === 'USER' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                              {formatTime(msg.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
                <div ref={msgEndRef} />
              </div>
            )}

            {/* NEW TICKET */}
            {view === 'new' && (
              <div className="p-4 space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full px-3 py-2 border rounded-md text-sm bg-background">
                    <option value="billing">Billing & Payments</option>
                    <option value="login">Login Issues</option>
                    <option value="assets">Managing Assets</option>
                    <option value="reports">Reports & Export</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Subject</label>
                  <Input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder="Brief description" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Message</label>
                  <textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Describe your issue..." rows={4}
                    className="w-full px-3 py-2 border rounded-md text-sm bg-background resize-none" />
                </div>
              </div>
            )}

            {/* SUBMITTED */}
            {view === 'submitted' && (
              <div className="p-6 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-sm font-medium">Ticket Submitted</p>
                <p className="text-xs text-muted-foreground">Our team will respond within 24 hours.</p>
              </div>
            )}
          </div>

          {/* ─── Footer ─────────────────────────────────────────── */}
          <div className="border-t p-3 shrink-0">
            {view === 'new' && (
              <Button className="w-full" onClick={createTicket} disabled={submitting || !newSubject.trim() || !newMessage.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Ticket
              </Button>
            )}
            {view === 'submitted' && (
              <Button variant="outline" className="w-full" onClick={() => { fetchTickets(); setView('menu'); }}>
                Back to Tickets
              </Button>
            )}
            {view === 'conversation' && (
              <form onSubmit={(e) => { e.preventDefault(); sendReply(); }} className="flex gap-2">
                <Input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  disabled={sending}
                  autoFocus
                />
                <Button type="submit" size="icon" disabled={sending || !replyText.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            )}
            {view === 'locked' && (
              <p className="text-[10px] text-muted-foreground text-center">
                Live chat available on Pro and Enterprise
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
