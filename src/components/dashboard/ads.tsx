'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Crown, Sparkles } from 'lucide-react';

interface AdBannerProps {
  userPlan?: string;
  onDismiss?: () => void;
  variant?: 'banner' | 'sidebar';
}

export function UpgradeBanner({ userPlan = 'FREE', onDismiss }: AdBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  if (userPlan !== 'FREE' || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      className={`transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 dark:from-green-950/40 dark:via-emerald-950/40 dark:to-green-950/40 border-green-200 dark:border-green-900">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Crown className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-green-800 dark:text-green-400">Upgrade to Pro</p>
                <p className="text-sm text-green-600 dark:text-green-500">Remove ads and unlock advanced features</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => router.push('/billing?upgrade=true')}
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Upgrade
              </Button>
              <Button variant="ghost" size="icon" onClick={handleDismiss}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface SidebarAdProps {
  userPlan?: string;
}

export function SidebarAd({ userPlan = 'FREE' }: SidebarAdProps) {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  if (userPlan !== 'FREE') return null;

  return (
    <div
      className={`transition-all duration-500 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border-green-200 dark:border-green-900 mt-4">
        <CardContent className="p-4 text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm shadow-green-200 dark:shadow-green-950">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <p className="font-semibold text-sm mb-2 text-green-800 dark:text-green-400">Upgrade to Pro</p>
          <p className="text-xs text-green-600 dark:text-green-500 mb-3">
            Remove ads and unlock all features
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
    </div>
  );
}

interface ReportsAdProps {
  userPlan?: string;
}

export function ReportsAd({ userPlan = 'FREE' }: ReportsAdProps) {
  const router = useRouter();

  if (userPlan !== 'FREE') return null;

  return (
    <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 dark:from-green-950/40 dark:via-emerald-950/40 dark:to-green-950/40 border-green-200 dark:border-green-900 mt-6">
      <CardContent className="p-6 text-center">
        <Crown className="h-10 w-10 text-green-600 dark:text-green-400 mx-auto mb-3" />
        <h3 className="font-semibold text-green-800 dark:text-green-400 mb-2">Unlock Full Reports</h3>
        <p className="text-sm text-green-600 dark:text-green-500 mb-4">
          Get advanced analytics, custom reports, and export features with Pro
        </p>
        <Button
          onClick={() => router.push('/billing?upgrade=true')}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Upgrade Now
        </Button>
      </CardContent>
    </Card>
  );
}

interface GoogleAdProps {
  slot?: string;
  adClient?: string;
}

export function GoogleAd({ slot = '1234567890', adClient = 'ca-pub-XXXXXXXXXXXXXXXX' }: GoogleAdProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined' && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('Ad error:', e);
      }
    }
  }, []);

  if (!mounted) {
    return (
      <div className="bg-muted rounded-lg h-[90px] flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Advertisement</span>
      </div>
    );
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={adClient}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}