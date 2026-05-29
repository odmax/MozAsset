import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import type { Role } from '@prisma/client';
import { Sidebar } from '@/components/layout/sidebar';
import { UpgradeBanner } from '@/components/dashboard/ads';
import SupportWidget from '@/components/support-widget';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { BrandingProvider } from '@/components/branding-provider';
import { getSimpleUserSession } from '@/lib/customer-session';

import { DeactivatedBanner } from '@/components/dashboard/deactivated-banner';

async function getUserInfo(userId: string, organizationId: string | null) {
  const [user, org] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { companyLogoUrl: true, isDeactivated: true, deactivationReason: true },
    }),
    organizationId
      ? prisma.organization.findUnique({
          where: { id: organizationId },
          select: { logo: true, favicon: true, primaryColor: true, secondaryColor: true, brandName: true, plan: true },
        })
      : null,
  ]);
  return {
    ...user,
    branding: org?.plan === 'ENTERPRISE' ? {
      logo: org.logo || null,
      favicon: org.favicon || null,
      primaryColor: org.primaryColor || null,
      secondaryColor: org.secondaryColor || null,
      brandName: org.brandName || null,
    } : null,
  };
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
  const userInfo = await getUserInfo(session.userId, session.organizationId);

  return (
    <DashboardClient>
      <BrandingProvider branding={userInfo?.branding ?? null}>
        <div className="min-h-screen bg-background">
          <Sidebar
            userRole={userRole}
            userPlan={userPlan}
            companyLogoUrl={userInfo?.branding?.logo || userInfo?.companyLogoUrl}
            companyBrandName={userInfo?.branding?.brandName || undefined}
          />
          <main className="lg:pl-64 pt-14 lg:pt-0">
            <div className="container mx-auto p-4 sm:p-6 space-y-6">
              {userInfo?.isDeactivated && <DeactivatedBanner reason={userInfo.deactivationReason ?? null} />}
              {!userInfo?.isDeactivated && userPlan === 'FREE' && <UpgradeBanner userPlan={userPlan} />}
              {children}
            </div>
          </main>
          <SupportWidget userPlan={userPlan} />
        </div>
      </BrandingProvider>
    </DashboardClient>
  );
}