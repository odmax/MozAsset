'use client';

import { useEffect, useState, useRef } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetchTickets();
  }, [search, statusFilter]);

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
    try {
      const res = await fetch(`/api/admin/support-tickets/${ticket.id}`);
      const data = await res.json();
      setMessages(data.messages || []);
      // Mark admin-viewed messages as read
      await fetch(`/api/support/tickets/${ticket.id}/read`, { method: 'POST' }).catch(() => {});
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedTicket) return;
    
    setSending(true);
    try {
      await fetch(`/api/admin/support-tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage }),
      });
      setReplyMessage('');
      openTicket(selectedTicket);
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSending(false);
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

      <Dialog open={!!selectedTicket} onOpenChange={(open) => { if (!open) { setSelectedTicket(null); setShowAttachments(false); } }}>
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
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                          <p className={`text-[10px] mt-1.5 ${isAdmin ? 'text-muted-foreground' : 'text-primary-foreground/60'}`}>
                            {formatDate(msg.createdAt)}
                          </p>
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
                onChange={(e) => setReplyMessage(e.target.value)}
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