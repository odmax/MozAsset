'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Building2,
  MapPin,
  Truck,
  Users,
  Menu,
  Activity,
  LogOut,
  FileText,
  CreditCard,
  Settings,
  Bell,
  ClipboardCheck,
  TrendingDown,
  BarChart3,
  Key,
  Shield,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import type { Role, LucideIcon } from '@/types';
import { AdContainer } from '@/components/ad-container';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
}

interface SidebarProps {
  userRole: Role;
  userPlan?: string;
  companyLogoUrl?: string | null;
  companyBrandName?: string;
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'],
  },
  {
    title: 'Assets',
    href: '/dashboard/assets',
    icon: Package,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'],
  },
  {
    title: 'Categories',
    href: '/dashboard/categories',
    icon: FolderTree,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER'],
  },
  {
    title: 'Departments',
    href: '/dashboard/departments',
    icon: Building2,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER'],
  },
  {
    title: 'Locations',
    href: '/dashboard/locations',
    icon: MapPin,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER'],
  },
  {
    title: 'Vendors',
    href: '/dashboard/vendors',
    icon: Truck,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER'],
  },
  {
    title: 'Users',
    href: '/dashboard/users',
    icon: Users,
    roles: ['SUPER_ADMIN'],
  },
  {
    title: 'Audit Logs',
    href: '/dashboard/audit-logs',
    icon: Activity,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER'],
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: FileText,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER'],
  },
  {
    title: 'Billing',
    href: '/billing',
    icon: CreditCard,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER'],
  },
  {
    title: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'],
  },
  {
    title: 'Settings',
    href: '/dashboard/settings',
    icon: Settings,
    roles: ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'],
  },
];

function SidebarContent({
  pathname,
  navItems,
  onNavigate,
  userPlan,
  companyLogoUrl,
  companyBrandName,
}: {
  pathname: string;
  navItems: NavItem[];
  onNavigate?: () => void;
  userPlan?: string;
  companyLogoUrl?: string | null;
  companyBrandName?: string;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.removeProperty('--theme-color');
      document.documentElement.style.removeProperty('--brand-primary');
      document.documentElement.style.removeProperty('--brand-secondary');
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (link && link.href.includes('org-')) {
        link.href = '/favicon.png';
      }
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/');
    } catch (error) {
      console.error('Logout error:', error);
      router.replace('/');
    }
  };

  return (
    <>
      <div className="flex h-16 items-center justify-between border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg">
          {companyLogoUrl ? (
            <img 
              src={companyLogoUrl} 
              alt="Logo" 
              className="h-8 w-auto object-contain"
            />
          ) : (
            <>
              <img src="/logo1.png" alt="MozAssets" className="h-8 w-auto" />
            </>
          )}
          {companyBrandName && (
            <span className="text-sm font-semibold truncate max-w-[140px]">{companyBrandName}</span>
          )}
        </Link>
        <NotificationBell />
      </div>
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isExactMatch = pathname === item.href;
            const isChildMatch = item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`);
            const isActive = isExactMatch || isChildMatch;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </li>
            );
          })}
          {userPlan === 'ENTERPRISE' && (
            <>
              <li className="pt-4 pb-1"><span className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Enterprise</span></li>
              {[
                { title: 'Advanced Analytics', href: '/dashboard/advanced-analytics', icon: BarChart3 },
                { title: 'Stock Verification', href: '/dashboard/stock-verification', icon: ClipboardCheck },
                { title: 'Depreciation', href: '/dashboard/depreciation', icon: TrendingDown },
                { title: 'API Keys', href: '/dashboard/settings/api-keys', icon: Key },
                { title: 'Approvals', href: '/dashboard/approvals', icon: FileCheck },
                { title: 'Compliance', href: '/dashboard/compliance', icon: ShieldCheck },
                { title: 'Branding', href: '/dashboard/settings/branding', icon: Shield },
              ].map((item) => {
                const Icon = item.icon;
                const isExactMatch = pathname === item.href;
                const isChildMatch = pathname.startsWith(`${item.href}/`);
                const isActive = isExactMatch || isChildMatch;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </>
          )}
        </ul>
      </nav>
      <div className="px-4 pb-4">
        <AdContainer position="sidebar" userPlan={userPlan} />
      </div>
      <div className="border-t p-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </>
  );
}

export function Sidebar({ userRole, userPlan = 'FREE', companyLogoUrl, companyBrandName }: SidebarProps) {
  const pathname = usePathname();
  const [currentPath, setCurrentPath] = useState(pathname);

  useEffect(() => {
    setCurrentPath(pathname);
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  const handleNavigate = () => {
    setCurrentPath(window.location.pathname);
  };

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet>
        <SheetTrigger asChild className="lg:hidden">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col">
            <SidebarContent pathname={currentPath} navItems={filteredNavItems} onNavigate={handleNavigate} userPlan={userPlan} companyLogoUrl={companyLogoUrl} companyBrandName={companyBrandName} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-card border-r">
        <SidebarContent pathname={currentPath} navItems={filteredNavItems} onNavigate={handleNavigate} userPlan={userPlan} companyLogoUrl={companyLogoUrl} companyBrandName={companyBrandName} />
      </aside>
    </>
  );
}
