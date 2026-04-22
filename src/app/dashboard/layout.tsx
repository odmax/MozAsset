import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { Sidebar } from '@/components/layout/sidebar';
import { UpgradeBanner } from '@/components/dashboard/ads';
import SupportWidget from '@/components/support-widget';

function getSessionUser() {
  const sessionCookie = cookies().get('session');
  
  if (sessionCookie?.value) {
    try {
      const decoded = Buffer.from(sessionCookie.value, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
  
  return null;
}

async function getUserLogo(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyLogoUrl: true },
  });
  return user?.companyLogoUrl;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionCookie = cookies().get('session');
  
  if (!sessionCookie?.value) {
    redirect('/login');
  }

  const user = getSessionUser();
  
  if (!user) {
    redirect('/login');
  }

  if (user.isPlatformAdmin) {
    redirect('/admin');
  }

  const userPlan = user.plan || 'FREE';
  const userRole = user.role || 'EMPLOYEE';
  const companyLogoUrl = await getUserLogo(user.id);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar userRole={userRole} userPlan={userPlan} companyLogoUrl={companyLogoUrl} />
      <main className="lg:pl-64">
        <div className="container mx-auto p-6 space-y-6">
          {userPlan === 'FREE' && <UpgradeBanner userPlan={userPlan} />}
          {children}
        </div>
      </main>
      <SupportWidget userPlan={userPlan} />
    </div>
  );
}