import { cookies } from 'next/headers';
import type { Plan } from '@prisma/client';
import { FinancialReportClient } from '@/components/dashboard/financial-report-client';
import { BackLink } from '@/components/ui/back-button';

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

export default async function FinancialReportsPage() {
  const user = getSessionUser();
  if (!user) return null;

  const canAccess = ['SUPER_ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'].includes(user.role);
  if (!canAccess) return null;

  const userPlan = (user.plan || 'FREE') as Plan;

  return (
    <div className="space-y-6">
      <BackLink href="/dashboard/reports" />
      <FinancialReportClient userPlan={userPlan} />
    </div>
  );
}