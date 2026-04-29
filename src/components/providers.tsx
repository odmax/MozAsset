'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { useState, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [userTheme, setUserTheme] = useState<string | undefined>(undefined);
  const [userThemeColor, setUserThemeColor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/theme', { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch theme');
        return res.json();
      })
      .then(data => {
        if (data.theme) setUserTheme(data.theme);
        if (data.themeColor) setUserThemeColor(data.themeColor);
      })
      .catch(() => {
        // Use defaults if fetch fails - don't crash
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <>{children}</>;
  }

  return (
    <SessionProvider>
      <ThemeProvider userTheme={userTheme} userThemeColor={userThemeColor}>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
