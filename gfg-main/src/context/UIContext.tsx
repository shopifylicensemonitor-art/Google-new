import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTheme } from '@/hooks/useTheme';

export interface UIContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  compactView: boolean;
  setCompactView: (compact: boolean) => void;
  toggleCompactView: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSoundEnabled: () => void;
  globalSearch: string;
  setGlobalSearch: (search: string) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  requirePin: (label: string, action: () => void) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('px_sidebar_collapsed') === 'true';
  });
  const [compactView, setCompactView] = useState<boolean>(() => {
    return localStorage.getItem('px_compact_view') === 'true';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('px_sound_enabled') !== 'false';
  });
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('px_sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('px_compact_view', String(compactView));
  }, [compactView]);

  useEffect(() => {
    localStorage.setItem('px_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const toggleSidebarCollapsed = () => setSidebarCollapsed(prev => !prev);
  const toggleCompactView = () => setCompactView(prev => !prev);
  const toggleSoundEnabled = () => setSoundEnabled(prev => !prev);

  const requirePin = (label: string, action: () => void) => {
    action();
  };

  return (
    <UIContext.Provider
      value={{
        theme,
        toggleTheme,
        sidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebarCollapsed,
        compactView,
        setCompactView,
        toggleCompactView,
        soundEnabled,
        setSoundEnabled,
        toggleSoundEnabled,
        globalSearch,
        setGlobalSearch,
        notificationsOpen,
        setNotificationsOpen,
        requirePin,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = (): UIContextType => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};
