'use client';

import { useState } from 'react';
import type { Plan } from '@prisma/client';
import { UpgradePlanModal } from '@/components/plan/UpgradePlanModal';

interface DashboardClientProps {
  children: React.ReactNode;
  userPlan: string;
}

export function DashboardClient({ children, userPlan }: DashboardClientProps) {
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  return (
    <>
      {children}
      <UpgradePlanModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentPlan={userPlan as Plan}
      />
      {/* Expose modal opener via custom event */}
      <div
        id="upgrade-modal-trigger"
        style={{ display: 'none' }}
        onClick={() => setUpgradeModalOpen(true)}
      />
    </>
  );
}

export function openUpgradeModal() {
  const trigger = document.getElementById('upgrade-modal-trigger');
  if (trigger) {
    trigger.click();
  }
}