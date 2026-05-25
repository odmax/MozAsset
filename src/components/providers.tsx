'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/admin-login',
  '/onboarding',
];

function decodeUserId(): string | null {
  try {
    for (const cookie of document.cookie.split(';')) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith('simpleUserAuth=')) {
        const raw = decodeURIComponent(trimmed.substring('simpleUserAuth='.length));
        const session = JSON.parse(atob(raw));
        return session?.userId || null;
      }
    }
  } catch {}
  return null;
}

function hasAdminSession(): boolean {
  return document.cookie.split(';').some(c => c.trim().startsWith('simpleAdminAuth='));
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [userTheme, setUserTheme] = useState<string | undefined>(undefined);
  const [userThemeColor, setUserThemeColor] = useState<string | undefined>(undefined);
  const [scopeKey, setScopeKey] = useState<string>('public');
  const pathname = usePathname();

  const isPublicPage = PUBLIC_ROUTES.some(route => pathname?.startsWith(route));

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('theme');
    }

    if (hasAdminSession()) {
      setScopeKey('admin');
      setUserTheme(undefined);
      setUserThemeColor(undefined);
      return;
    }

    const userId = decodeUserId();

    if (!userId) {
      setScopeKey('public');
      setUserTheme(undefined);
      setUserThemeColor(undefined);
      return;
    }

    setScopeKey(`user:${userId}`);

    fetch('/api/user/theme', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch theme');
        return res.json();
      })
      .then(data => {
        if (data.theme) setUserTheme(data.theme);
        if (data.themeColor) setUserThemeColor(data.themeColor);
      })
      .catch(() => {});
  }, [pathname]);

  return (
    <SessionProvider>
      <ThemeProvider
        key={scopeKey}
        userTheme={userTheme}
        userThemeColor={userThemeColor}
        forcedTheme={isPublicPage ? 'light' : undefined}
        storageKey={`mozassets-theme-${scopeKey}`}
        enableSystem={!isPublicPage}
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
