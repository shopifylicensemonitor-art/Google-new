import { useEffect, useSyncExternalStore } from 'react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

type Theme = 'light' | 'dark';

const THEME_KEY = 'bulk-email-theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  // Dark is the product default — it matches the marketing site.
  return 'dark';
}

// Module-level store so every component shares one theme value.
let currentTheme: Theme = readInitialTheme();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setThemeGlobal(next: Theme) {
  if (next === currentTheme) return;
  currentTheme = next;
  listeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribe,
    () => currentTheme,
    () => 'dark' as Theme,
  );

  useEffect(() => {
    const root = document.documentElement;
    const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();

    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
      if (isNative) {
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#0a0f1c' }).catch(() => {});
      }
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
      if (isNative) {
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
        StatusBar.setBackgroundColor({ color: '#ece8e4' }).catch(() => {});
      }
    }
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setThemeGlobal(currentTheme === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (next: Theme) => {
    setThemeGlobal(next);
  };

  return { theme, toggleTheme, setTheme };
}
