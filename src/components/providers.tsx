'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

function getSessionCookie(): string | null {
  if (typeof document === 'undefined') return null;
  for (const cookie of document.cookie.split(';')) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith('simpleUserAuth=') || trimmed.startsWith('session=')) {
      return trimmed;
    }
  }
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [userTheme, setUserTheme] = useState<string | undefined>(undefined);
  const [userThemeColor, setUserThemeColor] = useState<string | undefined>(undefined);
  const prevSessionRef = useRef<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const currentSession = getSessionCookie();
    const prevSession = prevSessionRef.current;
    prevSessionRef.current = currentSession;

    if (currentSession === prevSession) return;

    if (!currentSession) {
      setUserTheme(undefined);
      setUserThemeColor(undefined);
      return;
    }

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
      <ThemeProvider userTheme={userTheme} userThemeColor={userThemeColor}>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
