'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Crown, Sparkles, Zap, BarChart3 } from 'lucide-react';

type AdPosition = 'sidebar' | 'inline' | 'footer' | 'banner';

interface AdContainerProps {
  position: AdPosition;
  userPlan?: string;
}

const contentByPosition: Record<AdPosition, { icon: any; title: string; desc: string }> = {
  sidebar: {
    icon: Crown,
    title: 'Upgrade to Pro',
    desc: 'Remove limits and unlock all features',
  },
  inline: {
    icon: Zap,
    title: 'Go Pro',
    desc: 'Unlimited assets, departments & more',
  },
  footer: {
    icon: BarChart3,
    title: 'Unlock Full Reports',
    desc: 'Advanced analytics & custom exports',
  },
  banner: {
    icon: Sparkles,
    title: 'Upgrade to Pro',
    desc: 'Get the most out of MozAssets',
  },
};

export function AdContainer({ position, userPlan = 'FREE' }: AdContainerProps) {
  const router = useRouter();

  if (userPlan !== 'FREE') return null;

  const content = contentByPosition[position];

  if (position === 'sidebar') {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border-green-200 dark:border-green-900 mt-4">
        <CardContent className="p-4 text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm shadow-green-200 dark:shadow-green-950">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <p className="font-semibold text-sm mb-2 text-green-800 dark:text-green-400">Upgrade to Pro</p>
          <p className="text-xs text-green-600 dark:text-green-500 mb-3">
            Remove limits and unlock all features
          </p>
          <Button
            size="sm"
            className="w-full"
            onClick={() => router.push('/billing?upgrade=true')}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 dark:from-green-950/40 dark:via-emerald-950/40 dark:to-green-950/40 border-green-200 dark:border-green-900 overflow-hidden">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg shrink-0">
              <content.icon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-green-800 dark:text-green-400 truncate">{content.title}</p>
              <p className="text-xs text-green-600 dark:text-green-500 truncate">{content.desc}</p>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => router.push('/billing?upgrade=true')}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Upgrade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
