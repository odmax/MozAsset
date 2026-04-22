'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Crown, Sparkles } from 'lucide-react';
import Link from 'next/link';

interface AdBannerProps {
  userPlan?: string;
  onDismiss?: () => void;
  variant?: 'banner' | 'sidebar';
}

export function UpgradeBanner({ userPlan = 'FREE', onDismiss }: AdBannerProps) {
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
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Crown className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-purple-900">Upgrade to Pro</p>
                <p className="text-sm text-purple-700">Remove ads and unlock advanced features</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard/upgrade">
                <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Upgrade
                </Button>
              </Link>
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
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 mt-4">
        <CardContent className="p-4 text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <Crown className="h-6 w-6 text-white" />
          </div>
          <p className="font-medium text-sm mb-2">Upgrade to Pro</p>
          <p className="text-xs text-muted-foreground mb-3">
            Remove ads and unlock all features
          </p>
          <Link href="/dashboard/upgrade">
            <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700">
              <Sparkles className="h-3 w-3 mr-1" />
              Upgrade
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

interface ReportsAdProps {
  userPlan?: string;
}

export function ReportsAd({ userPlan = 'FREE' }: ReportsAdProps) {
  if (userPlan !== 'FREE') return null;

  return (
    <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 mt-6">
      <CardContent className="p-6 text-center">
        <Crown className="h-10 w-10 text-purple-600 mx-auto mb-3" />
        <h3 className="font-semibold text-purple-900 mb-2">Unlock Full Reports</h3>
        <p className="text-sm text-purple-700 mb-4">
          Get advanced analytics, custom reports, and export features with Pro
        </p>
        <Link href="/dashboard/upgrade">
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
        </Link>
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