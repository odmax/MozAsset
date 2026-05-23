'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import FileAttachmentSection from '@/components/files/file-attachment-section';
import { 
  Search, 
  Loader2,
  MessageSquare,
  Send,
  CheckCircle,
  Paperclip,
  Eye
} from 'lucide-react';

interface Ticket {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  createdAt: string;
  userEmail: string;
  userName: string | null;
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

const statusColors: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-blue-100 text-blue-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  URGENT: 'bg-red-100 text-red-800',
};

function DeliveryStatus({ status }: { status?: string }) {
  if (!status || status === 'SENT') return <span className="text-[9px] text-muted-foreground ml-1">&#x2713;</span>;
  if (status === 'DELIVERED') return <span className="text-[9px] text-primary ml-1">&#x2713;&#x2713;</span>;
  if (status === 'SEEN') return <span className="text-[9px] text-blue-500 ml-1">&#x2713;&#x2713; Seen</span>;
  if (status === 'SENDING') return <Loader2 className="h-2.5 w-2.5 animate-spin inline ml-1" />;
  return null;
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPollRef = useRef<string>('');
  const sendingRef = useRef(false);

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, userTyping]);

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter]);

  // Polling for new messages
  useEffect(() => {
    if (!selectedTicket) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    pollRef.current = setInterval(async () => {
      const since = lastPollRef.current || new Date().toISOString();
      try {
        const r = await fetch(`/api/admin/support-tickets/${selectedTicket.id}/poll?since=${encodeURIComponent(since)}`);
        if (r.ok) {
          const d = await r.json();
          if (d.newMessages?.length > 0) {
            setMessages(prev => mergeMessages(prev, d.newMessages));
            if (d.latestMessageAt) lastPollRef.current = d.latestMessageAt;
          }
          setUserTyping(d.userTyping || false);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
  }, [selectedTicket, mergeMessages]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      
      const res = await fetch(`/api/admin/support-tickets?${params}`);
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const openTicket = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setLoadingMessages(true);
    setUserTyping(false);
    setMessages([]);
    try {
      const res = await fetch(`/api/admin/support-tickets/${ticket.id}`);
      const data = await res.json();
      setMessages(data.messages || []);
      setUserTyping(data.userTyping || false);
      await fetch(`/api/support/tickets/${ticket.id}/read`, { method: 'POST' }).catch(() => {});
      const msgs = data.messages || [];
      lastPollRef.current = msgs.length > 0 ? msgs[msgs.length - 1].createdAt : new Date().toISOString();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendTyping = useCallback(async (id: string) => {
    try { await fetch(`/api/admin/support-tickets/${id}/typing`, { method: 'POST' }); } catch { /* ignore */ }
  }, []);

  const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setReplyMessage(val);
    if (val.trim() && selectedTicket) {
      sendTyping(selectedTicket.id);
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket || sendingRef.current) return;
    sendingRef.current = true;
    const clientMessageId = crypto.randomUUID();
    const optimisticId = `opt-${clientMessageId}`;
    const optimisticMsg: Message = {
      id: optimisticId,
      clientMessageId,
      senderType: 'ADMIN',
      message: replyMessage,
      createdAt: new Date().toISOString(),
      status: 'SENDING',
    };
    setMessages(prev => [...prev, optimisticMsg]);
    const text = replyMessage;
    setReplyMessage('');
    setSending(true);
    try {
      const res = await fetch(`/api/admin/support-tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, clientMessageId }),
      });
      if (res.ok) {
        const m = await res.json();
        setMessages(prev => mergeMessages(prev, [{ ...m, status: m.status || 'SENT' }]));
      } else {
        setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
      }
    } catch (error) {
      console.error('Error sending reply:', error);
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
    } finally {
      setSending(false);
      sendingRef.current = false;
      replyInputRef.current?.focus();
    }
  };

  const markResolved = async () => {
    if (!selectedTicket) return;
    try {
      await fetch(`/api/admin/support-tickets/${selectedTicket.id}/resolve`, {
        method: 'POST',
      });
      fetchTickets();
      if (selectedTicket) {
        setSelectedTicket({ ...selectedTicket, status: 'RESOLVED' });
      }
    } catch (error) {
      console.error('Error resolving ticket:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Support Tickets</h1>
        <p className="text-muted-foreground">View and manage user support tickets</p>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="PENDING">Pending</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No tickets found
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.subject}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{ticket.userName || '-'}</div>
                      <div className="text-sm text-muted-foreground">{ticket.userEmail}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{ticket.category}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[ticket.status] || 'bg-gray-100'}>
                      {ticket.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={priorityColors[ticket.priority] || 'bg-gray-100'}>
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(ticket.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openTicket(ticket)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) { setSelectedTicket(null); setShowAttachments(false); setUserTyping(false); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b px-6 py-4 shrink-0">
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-lg truncate pr-8">{selectedTicket?.subject}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {selectedTicket?.userName || 'Customer'} &middot; {selectedTicket?.userEmail}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-4">
              <Badge className={statusColors[selectedTicket?.status || '']}>
                {selectedTicket?.status}
              </Badge>
              <Badge className={priorityColors[selectedTicket?.priority || '']}>
                {selectedTicket?.priority}
              </Badge>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm font-medium">No messages yet</p>
                <p className="text-xs mt-1">Send a reply to start the conversation</p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, idx) => {
                  const isAdmin = msg.senderType === 'ADMIN';
                  const prev = idx > 0 ? messages[idx - 1] : null;
                  const showAvatar = !prev || prev.senderType !== msg.senderType;
                  const isSending = msg.status === 'SENDING';
                  return (
                    <div key={msg.id} className={`flex items-end gap-2.5 ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                      {isAdmin && showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm mt-1">
                          S
                        </div>
                      )}
                      {isAdmin && !showAvatar && <div className="w-8 shrink-0" />}
                      <div className="max-w-[70%]">
                        {showAvatar && (
                          <p className={`text-[11px] font-semibold mb-1 ${isAdmin ? 'text-blue-600 ml-1' : 'text-slate-500 text-right mr-1'}`}>
                            {isAdmin ? 'Support Team' : 'Customer'}
                          </p>
                        )}
                        <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                          isAdmin
                            ? 'bg-white border rounded-bl-md'
                            : 'bg-primary text-primary-foreground rounded-br-md'
                        } ${isSending ? 'opacity-70' : ''}`}>
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                          <div className={`flex items-center justify-end gap-0.5 text-[10px] mt-1.5 ${isAdmin ? 'text-muted-foreground' : 'text-primary-foreground/60'}`}>
                            <span>{formatDate(msg.createdAt)}</span>
                            {!isAdmin && <DeliveryStatus status={msg.status} />}
                          </div>
                        </div>
                      </div>
                      {!isAdmin && showAvatar && (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold shrink-0 shadow-sm mt-1">
                          U
                        </div>
                      )}
                      {!isAdmin && !showAvatar && <div className="w-8 shrink-0" />}
                    </div>
                  );
                })}
                {/* Typing indicator */}
                {userTyping && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-1 animate-pulse">
                    <div className="flex gap-0.5 items-center">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-muted-foreground/70">User is typing...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Attachments (collapsible) */}
          {selectedTicket && showAttachments && (
            <div className="border-t shrink-0">
              <div className="px-6 py-3 max-h-52 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Attachments</span>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setShowAttachments(false)}>
                    Hide
                  </Button>
                </div>
                <FileAttachmentSection
                  entityType="supportTicketId"
                  entityId={selectedTicket.id}
                  fileType="SUPPORT_ATTACHMENT"
                  userPlan="ENTERPRISE"
                  canManage={true}
                />
              </div>
            </div>
          )}

          {/* Reply area */}
          <div className="border-t p-4 shrink-0">
            <div className="flex gap-2 items-end">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowAttachments(!showAttachments)}
                className="shrink-0"
                title="Attachments"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <Textarea
                ref={replyInputRef}
                value={replyMessage}
                onChange={handleReplyChange}
                placeholder="Type your reply... (Shift+Enter for new line)"
                className="min-h-[40px] max-h-[120px] flex-1"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
              />
              <Button
                onClick={sendReply}
                disabled={sending || !replyMessage.trim()}
                className="shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {selectedTicket?.status !== 'RESOLVED' && selectedTicket?.status !== 'CLOSED' && (
              <div className="flex mt-2">
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-auto px-2 py-1" onClick={markResolved}>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Mark as resolved
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
