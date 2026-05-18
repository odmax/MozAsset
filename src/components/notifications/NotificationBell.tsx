'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Bell,
  CheckCheck,
  Loader2,
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
  ExternalLink,
  X,
} from 'lucide-react';

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

const typeColors: Record<string, string> = {
  ASSET_ASSIGNED: 'text-blue-500 bg-blue-50',
  ASSET_TRANSFERRED: 'text-purple-500 bg-purple-50',
  MAINTENANCE_DUE: 'text-amber-500 bg-amber-50',
  MAINTENANCE_COMPLETED: 'text-emerald-500 bg-emerald-50',
  SUPPORT_REPLY: 'text-indigo-500 bg-indigo-50',
  BILLING_SUCCESSFUL: 'text-emerald-500 bg-emerald-50',
  BILLING_FAILED: 'text-red-500 bg-red-50',
  SUBSCRIPTION_CANCELLED: 'text-red-500 bg-red-50',
  PLAN_UPGRADED: 'text-purple-500 bg-purple-50',
  USER_INVITED: 'text-cyan-500 bg-cyan-50',
  EXPORT_COMPLETED: 'text-slate-500 bg-slate-50',
  ORGANIZATION_UPDATE: 'text-orange-500 bg-orange-50',
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

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return 'Earlier';
}

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [bellRect, setBellRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/unread');
      const data = await res.json();
      if (typeof data.count === 'number') setUnreadCount(data.count);
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications?limit=10');
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUnread();
  }, [fetchUnread]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  useEffect(() => {
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        containerRef.current && !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleResize = () => {
      if (bellRef.current) {
        setBellRect(bellRef.current.getBoundingClientRect());
      }
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize, true);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize, true);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && bellRef.current) {
      setBellRect(bellRef.current.getBoundingClientRect());
    }
    setOpen(!open);
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
    setMarkingAll(false);
  };

  const getSafeLink = useCallback((notif: Notification): string => {
    const link = notif.link;
    if (!link) return '/dashboard/notifications';
    if (link === '/reactivate' || link.startsWith('/reactivate')) return '/dashboard/notifications';
    if (link.startsWith('/dashboard/support')) return '/dashboard/notifications';
    if (link.startsWith('/admin/support-tickets/')) return '/admin/support-tickets';
    const validPrefixes = ['/dashboard/assets/', '/dashboard/users', '/dashboard/notifications', '/dashboard', '/billing', '/admin/'];
    if (validPrefixes.some((p) => link.startsWith(p))) return link;
    return '/dashboard/notifications';
  }, []);

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.isRead) {
      try {
        await fetch(`/api/notifications/${notif.id}/read`, { method: 'PUT' });
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch {}
    }
    setOpen(false);
    const target = getSafeLink(notif);
    router.push(target);
  };

  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const group = getDateGroup(n.createdAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const getDropdownStyle = (): React.CSSProperties => {
    if (!bellRect || !mounted) return {};
    const gap = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const preferredHeight = Math.min(vh * 0.8, 500);
    let top = bellRect.bottom + gap;
    const spaceBelow = vh - top;
    const spaceAbove = bellRect.top - gap;
    if (spaceBelow < preferredHeight && spaceAbove > spaceBelow) {
      top = Math.max(gap, bellRect.top - gap - preferredHeight);
    }
    top = Math.max(gap, Math.min(top, vh - 60));
    const idealRight = vw - bellRect.right + 4;
    const maxWidth = Math.min(384, vw * 0.9);
    const minRight = 8;
    const maxRight = Math.max(minRight, vw - maxWidth - 8);
    const right = Math.max(minRight, Math.min(idealRight, maxRight));
    return { position: 'fixed', top, right, zIndex: 9999 };
  };

  const dropdownPanel = (
    <div
      ref={dropdownRef}
      className="bg-card border rounded-2xl shadow-2xl max-w-[90vw] max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200"
      style={isMobile ? {
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999,
        maxHeight: '100vh',
        borderRadius: 0,
        border: 'none',
      } as React.CSSProperties : getDropdownStyle()}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-base">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCheck className="h-3.5 w-3.5" />
              )}
              Mark all read
            </Button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md hover:bg-accent text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Bell className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              We&apos;ll notify you when something happens
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="px-5 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                {group}
              </div>
              {items.map((notif) => {
                const Icon = typeIcons[notif.type] || Bell;
                const colorClass = typeColors[notif.type] || 'text-muted-foreground bg-muted';
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-5 py-3 flex gap-3 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0 ${
                      !notif.isRead ? 'bg-accent/20' : ''
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!notif.isRead ? 'font-semibold' : 'text-muted-foreground'}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5 whitespace-nowrap">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground/80 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-2" />
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      <div className="border-t px-5 py-3">
        <Link
          href="/dashboard/notifications"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View all notifications
        </Link>
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={bellRef}
        onClick={handleToggle}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4.5 h-4.5 text-[10px] font-bold text-white bg-red-500 rounded-full min-w-[18px] min-h-[18px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && mounted && createPortal(
        <>
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/40 z-[9998]"
              onClick={() => setOpen(false)}
            />
          )}
          {dropdownPanel}
        </>,
        document.body
      )}
    </div>
  );
}
