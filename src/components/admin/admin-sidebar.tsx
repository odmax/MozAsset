'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetTrigger,
} from '@/components/ui/sheet';
import {
  LayoutDashboard, Users, Building2, CreditCard, Mail,
  UserCog, DollarSign, Receipt, MessageSquare,
  Shield, HardDrive, Activity, Headphones, UserPlus,
  ChevronDown, ChevronRight, Menu,
  Clock, Circle,
} from 'lucide-react';
import LogoutButton from '@/app/admin/logout-button';

interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: 'new' | 'beta';
  minRole?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  minRole?: string;
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Support Operations',
    items: [
      { title: 'Operations Hub', href: '/admin/support', icon: Headphones },
      { title: 'Support Agents', href: '/admin/agents', icon: UserPlus, minRole: 'SUPPORT_MANAGER' },
      { title: 'Support Tickets', href: '/admin/support-tickets', icon: MessageSquare },
    ],
  },
  {
    title: 'Customers',
    items: [
      { title: 'Users', href: '/admin/users', icon: Users },
      { title: 'Organizations', href: '/admin/organizations', icon: Building2 },
    ],
  },
  {
    title: 'Billing',
    items: [
      { title: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
      { title: 'Payments', href: '/admin/payments', icon: Receipt },
      { title: 'Revenue', href: '/admin/revenue', icon: DollarSign },
    ],
    minRole: 'FINANCE_ADMIN',
  },
  {
    title: 'System',
    items: [
      { title: 'Platform Admins', href: '/admin/platform-admins', icon: UserCog },
      { title: 'Contact Submissions', href: '/admin/contact-submissions', icon: Mail },
      { title: 'Email Logs', href: '/admin/emails', icon: Mail },
      { title: 'Security', href: '/admin/security', icon: Shield },
      { title: 'File Storage', href: '/admin/storage', icon: HardDrive },
      { title: 'Queue', href: '/admin/queue', icon: Activity },
    ],
    minRole: 'SUPER_ADMIN',
  },
];

const ADMIN_ONLY_ROLES = ['OWNER', 'SUPER_ADMIN'];
const BILLING_ROLES = ['OWNER', 'SUPER_ADMIN', 'FINANCE_ADMIN'];
const MANAGER_ROLES = ['OWNER', 'SUPER_ADMIN', 'SUPPORT_MANAGER'];

function canAccess(minRole: string | undefined, userRole: string): boolean {
  if (!minRole) return true;
  if (userRole === 'OWNER') return true;
  if (minRole === 'SUPPORT_MANAGER' && MANAGER_ROLES.includes(userRole)) return true;
  if (minRole === 'FINANCE_ADMIN' && BILLING_ROLES.includes(userRole)) return true;
  if (minRole === 'SUPER_ADMIN' && ADMIN_ONLY_ROLES.includes(userRole)) return true;
  return false;
}

const statusDot: Record<string, string> = {
  ONLINE: 'bg-emerald-500',
  BUSY: 'bg-red-500',
  AWAY: 'bg-amber-500',
  OFFLINE: 'bg-slate-400',
  IN_MEETING: 'bg-purple-500',
  BREAK: 'bg-amber-500',
};

export function AdminSidebar({ email, role }: { email: string; role: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [agentsOnline, setAgentsOnline] = useState(0);
  const [myStatus, setMyStatus] = useState('');
  const [myOnline, setMyOnline] = useState(false);
  const [myBusy, setMyBusy] = useState(false);
  const [myActiveChats, setMyActiveChats] = useState(0);
  const [myMaxChats, setMyMaxChats] = useState(5);
  const [toggling, setToggling] = useState(false);

  const fetchMeta = async () => {
    try {
      const [agentsRes] = await Promise.all([
        fetch('/api/admin/agents?limit=100'),
      ]);
      const agentsData = await agentsRes.json();
      if (agentsData.agents) {
        setAgentsOnline(agentsData.agents.filter((a: any) => a.isOnline).length);
        const me = agentsData.agents.find((a: any) => a.email === email);
        if (me) {
          setMyStatus(me.status || 'OFFLINE');
          setMyOnline(me.isOnline || false);
          setMyBusy(me.isBusy || false);
          setMyActiveChats(me.activeChatCount || 0);
          setMyMaxChats(me.maxConcurrentChats || 5);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchMeta();
    const interval = setInterval(fetchMeta, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleMyOnline = async () => {
    setToggling(true);
    const newStatus = myOnline ? 'OFFLINE' : 'ONLINE';
    try {
      const meRes = await fetch('/api/admin/agents?limit=1');
      const meData = await meRes.json();
      const me = meData.agents?.find((a: any) => a.email === email);
      if (!me) return;
      const res = await fetch(`/api/admin/agents/${me.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setMyStatus(newStatus);
        setMyOnline(newStatus === 'ONLINE');
        setMyBusy(false);
        fetchMeta();
      }
    } catch {}
    setToggling(false);
  };

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  const statusLabel = myOnline ? (myBusy ? 'Busy' : 'Online') : 'Offline';
  const statusColor = myOnline ? (myBusy ? 'text-amber-400' : 'text-emerald-400') : 'text-slate-500';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-slate-800/60 px-6 shrink-0 bg-slate-900/80 backdrop-blur-sm">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg group" onClick={() => setOpen(false)}>
          <img src="/logo.png" alt="MozAssets" className="h-9 w-auto" />
          <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            MozAssets
          </span>
          <span className="text-[10px] font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Admin</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent hover:scrollbar-thumb-slate-600" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
        {navSections.map((section) => {
          if (!canAccess(section.minRole, role)) return null;
          const visibleItems = section.items.filter(item => canAccess(item.minRole, role));
          if (visibleItems.length === 0) return null;
          const isCollapsed = collapsed[section.title];
          return (
            <div key={section.title} className="mb-2">
              <button
                onClick={() => toggleSection(section.title)}
                className="flex items-center justify-between w-full px-2 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors rounded"
              >
                <span>{section.title}</span>
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              {!isCollapsed && (
                <ul className="space-y-0.5 mt-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                            active
                              ? 'bg-primary/15 text-white shadow-sm shadow-primary/5 border border-primary/10'
                              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 hover:border-slate-700/50 border border-transparent',
                          )}
                        >
                          <Icon className={cn('h-4 w-4 shrink-0', active ? 'text-primary' : 'text-slate-500')} />
                          <span className="truncate">{item.title}</span>
                          {item.badge === 'new' && (
                            <span className="ml-auto text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">NEW</span>
                          )}
                          {item.badge === 'beta' && (
                            <span className="ml-auto text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">BETA</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t border-slate-800/60 bg-slate-900/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${statusDot[myStatus] || 'bg-slate-400'}`} />
            <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
          <button
            onClick={toggleMyOnline}
            disabled={toggling}
            className={cn(
              'text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
              myOnline
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30',
              toggling && 'opacity-50 cursor-wait',
            )}
          >
            {toggling ? '...' : myOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
        {myOnline && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {myActiveChats}/{myMaxChats}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {agentsOnline} online
            </span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-800/60 p-4 shrink-0 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/10 shrink-0">
            <span className="text-sm font-bold text-white">
              {email?.charAt(0)?.toUpperCase() || 'A'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-white">{email?.split('@')[0] || 'Admin'}</p>
            <p className="text-[11px] text-slate-400 truncate capitalize">{role.toLowerCase().replace(/_/g, ' ')}</p>
          </div>
        </div>
        <LogoutButton />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-slate-900 text-white">
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white shadow-2xl border-r border-slate-800/50">
        {sidebarContent}
      </aside>
    </>
  );
}
