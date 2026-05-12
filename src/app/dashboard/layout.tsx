import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@prisma/client';
import { Sidebar } from '@/components/layout/sidebar';
import { UpgradeBanner } from '@/components/dashboard/ads';
import SupportWidget from '@/components/support-widget';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { getSimpleUserSession } from '@/lib/customer-session';

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
  const session = getSimpleUserSession();

  if (!session) {
    redirect('/login');
  }

  const userPlan = session.plan || 'FREE';
  const userRole = (session.role || 'EMPLOYEE') as Role;
  const companyLogoUrl = await getUserLogo(session.userId);

  return (
    <DashboardClient userPlan={userPlan}>
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
    </DashboardClient>
  );
}