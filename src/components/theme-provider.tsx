'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultMode?: 'light' | 'dark' | 'system';
}

export function ThemeProvider({ children, defaultMode = 'system' }: ThemeProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider attribute="class" defaultTheme={defaultMode} enableSystem>
      {children}
    </NextThemesProvider>
  );
}
