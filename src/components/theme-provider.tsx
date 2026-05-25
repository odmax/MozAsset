'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: 'light' | 'dark' | 'system';
  userTheme?: string;
  userThemeColor?: string;
  forcedTheme?: string;
  storageKey?: string;
  enableSystem?: boolean;
}

export function ThemeProvider({
  children,
  defaultMode = 'light',
  userTheme,
  userThemeColor,
  forcedTheme,
  storageKey,
  enableSystem = true,
}: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (userThemeColor) {
      document.documentElement.style.setProperty('--theme-color', userThemeColor);
    } else {
      document.documentElement.style.removeProperty('--theme-color');
    }
  }, [userThemeColor]);

  const props = {
    attribute: 'class' as const,
    defaultTheme: defaultMode,
    enableSystem,
    forcedTheme,
    storageKey,
  };

  if (!mounted) {
    return (
      <NextThemesProvider {...props}>
        {children}
      </NextThemesProvider>
    );
  }

  return (
    <NextThemesProvider {...props} defaultTheme={userTheme || defaultMode}>
      {children}
    </NextThemesProvider>
  );
}
