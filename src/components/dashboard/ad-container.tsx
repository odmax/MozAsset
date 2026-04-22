'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface AdContainerProps {
  userPlan?: string;
}

export function AdContainer({ userPlan = 'FREE' }: AdContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (userPlan !== 'FREE' || !mounted) return null;

  return (
    <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-slate-200 my-4">
      <CardContent className="p-3 text-center">
        <div className="min-h-[90px] flex items-center justify-center bg-slate-200/50 rounded-lg">
          <span className="text-xs text-muted-foreground">
            Advertisement Placeholder
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function GoogleAdPlaceholder({ slot = '1234567890' }: { slot?: string }) {
  return (
    <div className="bg-muted rounded-lg h-[90px] flex items-center justify-center">
      <span className="text-muted-foreground text-sm">
        Ad Slot: {slot}
      </span>
    </div>
  );
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}