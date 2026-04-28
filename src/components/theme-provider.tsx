'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: 'light' | 'dark' | 'system';
  userTheme?: string;
  userThemeColor?: string;
}

export function ThemeProvider({ children, defaultMode = 'light', userTheme, userThemeColor }: ThemeProviderProps) {
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

  if (!mounted) {
    return (
      <NextThemesProvider attribute="class" defaultTheme={defaultMode} enableSystem>
        {children}
      </NextThemesProvider>
    );
  }

  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme={userTheme || defaultMode} 
      enableSystem
    >
      {children}
    </NextThemesProvider>
  );
}
