'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { useState, useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [userTheme, setUserTheme] = useState<string | undefined>(undefined);
  const [userThemeColor, setUserThemeColor] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/theme')
      .then(res => res.json())
      .then(data => {
        if (data.theme) setUserTheme(data.theme);
        if (data.themeColor) setUserThemeColor(data.themeColor);
      })
      .catch(() => {})
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
