'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, Building2, CreditCard, Mail,
  Package, UserCog, DollarSign, Receipt, MessageSquare,
  Shield, HardDrive, Activity, Headphones, UserPlus,
  ChevronDown, ChevronRight, Wifi, WifiOff,
} from 'lucide-react';
import LogoutButton from '@/app/admin/logout-button';

interface NavItem {
  title: string;
  href: string;
  icon: any;
  badge?: 'new' | 'beta';
}

interface NavSection {
  title: string;
  items: NavItem[];
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
      { title: 'Support Agents', href: '/admin/agents', icon: UserPlus },
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
  },
];

export function AdminSidebar({ email, role }: { email: string; role: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [agentsOnline, setAgentsOnline] = useState(0);
  const [unreadTickets, setUnreadTickets] = useState(0);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [agentsRes] = await Promise.all([
          fetch('/api/admin/agents?limit=1'),
        ]);
        const agentsData = await agentsRes.json();
        if (agentsData.agents) {
          setAgentsOnline(agentsData.agents.filter((a: any) => a.isActive).length);
        }
      } catch {}
    };
    fetchMeta();
    const interval = setInterval(fetchMeta, 30000);
    return () => clearInterval(interval);
  }, []);

  const toggleSection = (title: string) => {
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white flex flex-col shadow-2xl border-r border-slate-800/50">
      {/* Header */}
      <div className="flex h-16 items-center border-b border-slate-800/60 px-6 shrink-0 bg-slate-900/80 backdrop-blur-sm">
        <Link href="/admin" className="flex items-center gap-2 font-bold text-lg group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
            <Package className="h-4 w-4 text-white" />
          </div>
          <span className="bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            MozAssets
          </span>
          <span className="text-[10px] font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Admin</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent hover:scrollbar-thumb-slate-600" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
        {navSections.map((section) => {
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
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
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

      {/* Agent Status Bar */}
      <div className="px-4 py-2 border-t border-slate-800/60 bg-slate-900/60">
        <Link href="/admin/agents" className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 transition-colors">
          {agentsOnline > 0 ? (
            <Wifi className="h-3 w-3 text-emerald-400" />
          ) : (
            <WifiOff className="h-3 w-3 text-slate-500" />
          )}
          <span>{agentsOnline} agent{agentsOnline !== 1 ? 's' : ''} online</span>
        </Link>
      </div>

      {/* Footer */}
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
    </aside>
  );
}
