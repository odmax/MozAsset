'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock, ChevronRight } from 'lucide-react';
import { UpgradePlanModal } from '@/components/plan/UpgradePlanModal';
import type { Plan } from '@prisma/client';

interface FeatureLockProps {
  featureName: string;
  featureDescription: string;
  requiredPlan: 'PRO' | 'ENTERPRISE';
  currentPlan: string;
}

export function FeatureLock({ featureName, featureDescription, requiredPlan, currentPlan }: FeatureLockProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const upgradeTo = requiredPlan === 'ENTERPRISE' && currentPlan === 'PRO' ? 'ENTERPRISE' : 'PRO';
  const canUpgrade = currentPlan !== 'ENTERPRISE';

  return (
    <>
      <Card className="border-dashed border-2 bg-slate-50/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl">{featureName}</CardTitle>
          <CardDescription className="mt-2 max-w-md mx-auto">
            {featureDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center pt-0">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
            <Crown className="h-4 w-4" />
            <span>Available on {requiredPlan} and above</span>
          </div>
          {canUpgrade ? (
            <Button onClick={() => setModalOpen(true)}>
              Upgrade to {upgradeTo}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              You have access to all features
            </p>
          )}
        </CardContent>
      </Card>
      <UpgradePlanModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentPlan={currentPlan as Plan}
      />
    </>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground mb-6">{description}</p>
        {action && (
          <Button asChild variant="outline">
            <a href={action.href}>{action.label}</a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}