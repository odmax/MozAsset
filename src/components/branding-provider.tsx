'use client';

import { useEffect } from 'react';

interface OrgBranding {
  logo: string | null;
  favicon: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  brandName: string | null;
}

const DEFAULT_FAVICON = '/favicon.png';
const DEFAULT_PRIMARY = '#3b82f6';
const DEFAULT_SECONDARY = '#6366f1';

export function BrandingProvider({
  branding,
  children,
}: {
  branding: OrgBranding | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!branding) return;

    if (branding.primaryColor) {
      document.documentElement.style.setProperty('--brand-primary', branding.primaryColor);
    }
    if (branding.secondaryColor) {
      document.documentElement.style.setProperty('--brand-secondary', branding.secondaryColor);
    }

    if (branding.favicon) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (link) {
        link.href = branding.favicon;
      }
    }

    return () => {
      document.documentElement.style.removeProperty('--brand-primary');
      document.documentElement.style.removeProperty('--brand-secondary');
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (link && link.href !== DEFAULT_FAVICON) {
        link.href = DEFAULT_FAVICON;
      }
    };
  }, [branding]);

  return <>{children}</>;
}
