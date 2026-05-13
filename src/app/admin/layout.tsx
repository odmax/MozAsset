import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard, 
  Mail,
  Package,
  UserCog,
  DollarSign,
  Receipt,
  MessageSquare,
  Shield,
  HardDrive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LogoutButton from './logout-button';
// TEMP_ADMIN_AUTH: simple admin auth until full platform auth is rebuilt.
import { getSimpleAdminSession } from '@/lib/admin-session';

const navItems = [
  { title: 'Overview', href: '/admin', icon: LayoutDashboard },
  { title: 'Platform Admins', href: '/admin/platform-admins', icon: UserCog },
  { title: 'Users', href: '/admin/users', icon: Users },
  { title: 'Organizations', href: '/admin/organizations', icon: Building2 },
  { title: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
  { title: 'Payments', href: '/admin/payments', icon: Receipt },
  { title: 'Revenue', href: '/admin/revenue', icon: DollarSign },
  { title: 'Support Tickets', href: '/admin/support-tickets', icon: MessageSquare },
  { title: 'Contact Submissions', href: '/admin/contact-submissions', icon: Mail },
  { title: 'Email Logs', href: '/admin/emails', icon: Mail },
  { title: 'Security', href: '/admin/security', icon: Shield },
  { title: 'File Storage', href: '/admin/storage', icon: HardDrive },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TEMP_ADMIN_AUTH: check simpleAdminAuth only
  const session = getSimpleAdminSession();

  if (!session) {
    console.log('ADMIN LAYOUT: no simpleAdminAuth, redirecting to /admin-login');
    redirect('/admin-login');
  }

  console.log('ADMIN LAYOUT: simpleAdminAuth valid for', session.email);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 text-white flex flex-col">
        <div className="flex h-16 items-center border-b border-slate-800 px-6 shrink-0">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
            <Package className="h-6 w-6" />
            <span>MozAssets Admin</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 hover:scrollbar-thumb-slate-600" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 #0f172a' }}>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      'text-slate-300 hover:bg-slate-800 hover:text-white',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-800 p-4 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {session.email?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{session.email}</p>
              <p className="text-xs text-slate-400 truncate">{session.role}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <LogoutButton />
          </div>
        </div>
      </aside>

      <main className="pl-64">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
