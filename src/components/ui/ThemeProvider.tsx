'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: 'dark', toggle: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Always start dark; only override if user explicitly toggled before
    const stored = localStorage.getItem('theme') as Theme | null;
    setTheme(stored || 'dark');
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme, mounted]);

  const toggle = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  if (!mounted) {
    return <div className="min-h-screen" style={{ backgroundColor: '#000000' }} />;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
