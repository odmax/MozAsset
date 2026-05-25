'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Bell,
  CheckCheck,
  Loader2,
  Trash2,
  ArrowLeft,
  Package,
  ArrowRightLeft,
  Wrench,
  CheckCircle,
  MessageSquare,
  CreditCard,
  AlertCircle,
  Ban,
  Crown,
  UserPlus,
  Download,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  BellOff,
  ExternalLink,
} from 'lucide-react';
import NotificationDetailModal from '@/components/notifications/NotificationDetailModal';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  priority: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const typeIcons: Record<string, typeof Bell> = {
  ASSET_ASSIGNED: Package,
  ASSET_TRANSFERRED: ArrowRightLeft,
  MAINTENANCE_DUE: Wrench,
  MAINTENANCE_COMPLETED: CheckCircle,
  SUPPORT_REPLY: MessageSquare,
  BILLING_SUCCESSFUL: CreditCard,
  BILLING_FAILED: AlertCircle,
  SUBSCRIPTION_CANCELLED: Ban,
  PLAN_UPGRADED: Crown,
  USER_INVITED: UserPlus,
  EXPORT_COMPLETED: Download,
  ORGANIZATION_UPDATE: Building2,
};

const typeLabels: Record<string, string> = {
  ASSET_ASSIGNED: 'Asset Assigned',
  ASSET_TRANSFERRED: 'Asset Transferred',
  MAINTENANCE_DUE: 'Maintenance Due',
  MAINTENANCE_COMPLETED: 'Maintenance Completed',
  SUPPORT_REPLY: 'Support Reply',
  BILLING_SUCCESSFUL: 'Billing Successful',
  BILLING_FAILED: 'Billing Failed',
  SUBSCRIPTION_CANCELLED: 'Subscription Cancelled',
  PLAN_UPGRADED: 'Plan Upgraded',
  USER_INVITED: 'User Invited',
  EXPORT_COMPLETED: 'Export Completed',
  ORGANIZATION_UPDATE: 'Organization Update',
};

const typeColors: Record<string, string> = {
  ASSET_ASSIGNED: 'border-l-blue-500 bg-blue-50/50',
  ASSET_TRANSFERRED: 'border-l-purple-500 bg-purple-50/50',
  MAINTENANCE_DUE: 'border-l-amber-500 bg-amber-50/50',
  MAINTENANCE_COMPLETED: 'border-l-emerald-500 bg-emerald-50/50',
  SUPPORT_REPLY: 'border-l-indigo-500 bg-indigo-50/50',
  BILLING_SUCCESSFUL: 'border-l-emerald-500 bg-emerald-50/50',
  BILLING_FAILED: 'border-l-red-500 bg-red-50/50',
  SUBSCRIPTION_CANCELLED: 'border-l-red-500 bg-red-50/50',
  PLAN_UPGRADED: 'border-l-purple-500 bg-purple-50/50',
  USER_INVITED: 'border-l-cyan-500 bg-cyan-50/50',
  EXPORT_COMPLETED: 'border-l-slate-500 bg-slate-50/50',
  ORGANIZATION_UPDATE: 'border-l-orange-500 bg-orange-50/50',
};

const iconColors: Record<string, string> = {
  ASSET_ASSIGNED: 'text-blue-600 bg-blue-100',
  ASSET_TRANSFERRED: 'text-purple-600 bg-purple-100',
  MAINTENANCE_DUE: 'text-amber-600 bg-amber-100',
  MAINTENANCE_COMPLETED: 'text-emerald-600 bg-emerald-100',
  SUPPORT_REPLY: 'text-indigo-600 bg-indigo-100',
  BILLING_SUCCESSFUL: 'text-emerald-600 bg-emerald-100',
  BILLING_FAILED: 'text-red-600 bg-red-100',
  SUBSCRIPTION_CANCELLED: 'text-red-600 bg-red-100',
  PLAN_UPGRADED: 'text-purple-600 bg-purple-100',
  USER_INVITED: 'text-cyan-600 bg-cyan-100',
  EXPORT_COMPLETED: 'text-slate-600 bg-slate-100',
  ORGANIZATION_UPDATE: 'text-orange-600 bg-orange-100',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [markingAll, setMarkingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (unreadOnly) params.set('unread', 'true');
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch(`/api/notifications?${params}`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setNotifications(data.notifications || []);
        setPagination(data.pagination || null);
      }
    } catch {
      setError('Failed to load notifications');
    }
    setLoading(false);
  }, [page, unreadOnly, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setSelectedIds(new Set());
    } catch {}
    setMarkingAll(false);
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch {}
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    } catch {}
  };

  const openDetail = (notif: Notification) => {
    setSelectedNotification(notif);
    if (!notif.isRead) {
      handleMarkRead(notif.id);
    }
  };

  const closeDetail = () => {
    setSelectedNotification(null);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkMarkRead = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => handleMarkRead(id)));
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => handleDelete(id)));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="h-7 w-7" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with your latest activities
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={markingAll}
              className="gap-1.5"
            >
              {markingAll ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => { setUnreadOnly(!unreadOnly); setPage(1); }}
            className="gap-1.5"
          >
            {unreadOnly && <X className="h-3.5 w-3.5" />}
            Unread only
          </Button>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All types</option>
          {Object.entries(typeLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <Button variant="ghost" size="sm" onClick={handleBulkMarkRead} className="gap-1.5 h-8 text-xs">
              <CheckCheck className="h-3.5 w-3.5" />
              Mark read
            </Button>
            <Button variant="ghost" size="sm" onClick={handleBulkDelete} className="gap-1.5 h-8 text-xs text-red-500 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <BellOff className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">No notifications</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {unreadOnly ? 'No unread notifications' : 'You&apos;re all caught up!'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = typeIcons[notif.type] || Bell;
            const borderColor = typeColors[notif.type] || 'border-l-muted bg-muted/30';
            const iconColor = iconColors[notif.type] || 'text-muted-foreground bg-muted';
            return (
              <div
                key={notif.id}
                className={`relative flex gap-4 p-4 rounded-xl border border-l-4 transition-colors ${borderColor} ${
                  !notif.isRead ? 'shadow-sm' : 'opacity-80'
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(notif.id)}
                    onChange={() => toggleSelect(notif.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300"
                  />
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-tight ${!notif.isRead ? 'font-semibold' : ''}`}>
                        {notif.title}
                      </p>
                      <span className="text-[11px] text-muted-foreground shrink-0 whitespace-nowrap">
                        {timeAgo(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground/80 mt-0.5">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(notif.createdAt)}
                      </span>
                      <button
                        onClick={() => openDetail(notif)}
                        className="text-[10px] text-primary hover:underline inline-flex items-center gap-0.5"
                      >
                        View details <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                      title="Mark as read"
                    >
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NotificationDetailModal
        notification={selectedNotification}
        onClose={closeDetail}
        onMarkRead={handleMarkRead}
        onDelete={handleDelete}
      />

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
