import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  CreditCard, 
  Mail,
  LogOut,
  Package,
  UserCog,
  DollarSign,
  Receipt,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import LogoutButton from './logout-button';

function getUserSession() {
  const sessionCookie = cookies().get('session');
  const adminSessionCookie = cookies().get('adminSession');
  
  if (adminSessionCookie?.value) {
    try {
      const decoded = Buffer.from(adminSessionCookie.value, 'base64').toString('utf-8');
      return { ...JSON.parse(decoded), sessionType: 'admin' };
    } catch {
      return null;
    }
  }
  
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return { ...JSON.parse(decoded), sessionType: 'user' };
    } catch {
      return null;
    }
  }
  
  return null;
}

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
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = getUserSession();
  
  if (!session || session.sessionType !== 'admin') {
    redirect('/login');
  }

  const user = session;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 text-white">
        <div className="flex h-16 items-center border-b border-slate-800 px-6">
          <Link href="/admin" className="flex items-center gap-2 font-bold text-lg">
            <Package className="h-6 w-6" />
            <span>MozAssets Admin</span>
          </Link>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4">
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

        <div className="border-t border-slate-800 p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-sm font-medium">
                {user.name?.charAt(0) || user.email?.charAt(0) || 'A'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name || 'Admin'}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard" className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-slate-900">
                User Dashboard
              </Button>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        <div className="container mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}