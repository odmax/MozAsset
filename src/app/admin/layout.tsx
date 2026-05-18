import { redirect } from 'next/navigation';
import { getSimpleAdminSession } from '@/lib/admin-session';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

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
      <AdminSidebar email={session.email} role={session.role} />
      <main className="lg:pl-64 pt-14 lg:pt-0">
        <div className="container mx-auto p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
