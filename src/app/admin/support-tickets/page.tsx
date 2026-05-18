'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import FileAttachmentSection from '@/components/files/file-attachment-section';
import { 
  Search, 
  Loader2,
  MessageSquare,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
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

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTicket?.subject}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge className={statusColors[selectedTicket?.status || '']}>
                {selectedTicket?.status}
              </Badge>
              <Badge className={priorityColors[selectedTicket?.priority || '']}>
                {selectedTicket?.priority}
              </Badge>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto space-y-1 border rounded-xl p-4 bg-slate-50/50">
              {loadingMessages ? (
                <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No messages yet</p>
              ) : (
                messages.map((msg, idx) => {
                  const isAdmin = msg.senderType === 'ADMIN';
                  const prev = idx > 0 ? messages[idx - 1] : null;
                  const showAvatar = !prev || prev.senderType !== msg.senderType;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2 mb-2 ${isAdmin ? 'justify-start' : 'justify-end'}`}>
                      {isAdmin && showAvatar && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm">
                          S
                        </div>
                      )}
                      {isAdmin && !showAvatar && <div className="w-7 shrink-0" />}
                      <div className={`max-w-[75%] ${isAdmin ? '' : ''}`}>
                        {isAdmin && showAvatar && (
                          <p className="text-[10px] font-semibold text-blue-600/80 mb-1 ml-0.5">Support Team</p>
                        )}
                        {!isAdmin && showAvatar && (
                          <p className="text-[10px] font-semibold text-slate-500 mb-1 text-right mr-0.5">Customer</p>
                        )}
                        <div className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                          isAdmin
                            ? 'bg-white rounded-bl-md border'
                            : 'bg-primary text-primary-foreground rounded-br-md'
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                          <p className={`text-[10px] mt-1.5 ${isAdmin ? 'text-muted-foreground' : 'text-primary-foreground/60'}`}>
                            {formatDate(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                      {!isAdmin && showAvatar && (
                        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-bold shrink-0 shadow-sm">
                          U
                        </div>
                      )}
                      {!isAdmin && !showAvatar && <div className="w-7 shrink-0" />}
                    </div>
                  );
                })
              )}
            </div>

            {selectedTicket && (
              <div className="border-t pt-4">
                <FileAttachmentSection
                  entityType="supportTicketId"
                  entityId={selectedTicket.id}
                  fileType="SUPPORT_ATTACHMENT"
                  userPlan="ENTERPRISE"
                  canManage={true}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1"
              />
            </div>
          </div>
          <DialogFooter>
            {selectedTicket?.status !== 'RESOLVED' && (
              <Button variant="outline" onClick={markResolved}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Mark Resolved
              </Button>
            )}
            <Button onClick={sendReply} disabled={sending || !replyMessage.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}