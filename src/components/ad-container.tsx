'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

type AdPosition = 'sidebar' | 'inline' | 'footer' | 'banner';

interface AdContainerProps {
  position: AdPosition;
  userPlan?: string;
}

const adSizes = {
  sidebar: { width: '100%', height: '250px' },
  inline: { width: '100%', height: '90px' },
  footer: { width: '100%', height: '60px' },
  banner: { width: '100%', height: '90px' },
};

export function AdContainer({ position, userPlan = 'FREE' }: AdContainerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (userPlan !== 'FREE' || !mounted) {
    return null;
  }

  const size = adSizes[position];

  return (
    <div className="ad-container" data-position={position}>
      <Card 
        className="bg-muted/30 border-dashed border-muted-foreground/20 overflow-hidden"
        style={{ 
          width: size.width, 
          height: size.height,
          maxWidth: position === 'sidebar' ? '300px' : '728px',
          margin: '0 auto'
        }}
      >
        <CardContent className="flex items-center justify-center h-full p-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            Ad space
          </span>
        </CardContent>
      </Card>
    </div>
  );
}

// Google AdSense integration helper
// Replace the placeholder above with actual AdSense code when ready
export function AdContainerWithAdsense({ 
  position, 
  userPlan = 'FREE',
  adClient = 'ca-pub-XXXXXXXXXXXXXXXX', 
  adSlot = '1234567890' 
}: AdContainerProps & { adClient?: string; adSlot?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== 'undefined' && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, []);

  if (userPlan !== 'FREE' || !mounted) {
    return null;
  }

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block', width: '100%' }}
      data-ad-client={adClient}
      data-ad-slot={adSlot}
      data-ad-format={position === 'sidebar' ? 'vertical' : 'auto'}
      data-full-width-responsive="true"
    />
  );
}

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}
