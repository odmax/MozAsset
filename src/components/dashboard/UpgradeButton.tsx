'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Plan } from '@prisma/client';
import { UpgradePlanModal } from '@/components/plan/UpgradePlanModal';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles } from 'lucide-react';

interface UpgradeButtonProps {
  userPlan: string;
  className?: string;
  children?: React.ReactNode;
}

export function UpgradeButton({ userPlan, className = '', children }: UpgradeButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (userPlan === 'FREE') {
      setModalOpen(true);
    } else if (userPlan === 'PRO') {
      setModalOpen(true); // Show modal with only Enterprise option
    }
    // For ENTERPRISE, no action needed
  };

  return (
    <>
      <Button onClick={handleClick} className={className}>
        {children || (
          <>
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade
          </>
        )}
      </Button>
      <UpgradePlanModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentPlan={userPlan as Plan}
      />
    </>
  );
}

interface UpgradeBannerProps {
  userPlan: string;
}

export function UpgradeBanner({ userPlan }: UpgradeBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Crown className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-purple-900">Upgrade to Pro</p>
              <p className="text-sm text-purple-700">
                Get unlimited assets, advanced reports, and export features
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setModalOpen(true)}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade
          </Button>
        </div>
      </div>
      <UpgradePlanModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentPlan={userPlan as Plan}
      />
    </>
  );
}