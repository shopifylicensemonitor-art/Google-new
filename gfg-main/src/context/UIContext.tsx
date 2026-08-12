import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Network } from '@capacitor/network';
import { WifiOff, Wifi } from 'lucide-react';
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
  isOffline: boolean;
  batterySaver: boolean;
  setBatterySaver: (enabled: boolean) => void;
  toggleBatterySaver: () => void;
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
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const [batterySaver, setBatterySaver] = useState<boolean>(() => {
    return localStorage.getItem('px_battery_saver') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('px_battery_saver', String(batterySaver));
    if (batterySaver) {
      document.documentElement.classList.add('battery-saver');
    } else {
      document.documentElement.classList.remove('battery-saver');
    }
  }, [batterySaver]);

  // Network connectivity status listener via Capacitor Network plugin
  useEffect(() => {
    let networkListener: any = null;

    const checkInitialStatus = async () => {
      try {
        const status = await Network.getStatus();
        setIsOffline(!status.connected);
      } catch {
        setIsOffline(!navigator.onLine);
      }
    };

    checkInitialStatus();

    const initNetworkListener = async () => {
      try {
        networkListener = await Network.addListener('networkStatusChange', (status) => {
          setIsOffline(!status.connected);
        });
      } catch {
        // Fallback to browser online/offline events if plugin listener fails
      }
    };

    initNetworkListener();

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (networkListener && typeof networkListener.remove === 'function') {
        networkListener.remove();
      }
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
  const toggleBatterySaver = () => setBatterySaver(prev => !prev);

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
        isOffline,
        batterySaver,
        setBatterySaver,
        toggleBatterySaver,
      }}
    >
      {/* Subtle Offline Banner at the Top of Screen */}
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/95 text-slate-950 dark:bg-amber-600 dark:text-amber-50 px-3 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm border-b border-amber-600/30 backdrop-blur-md animate-slide-down">
          <WifiOff className="w-3.5 h-3.5 shrink-0 animate-pulse text-amber-950 dark:text-amber-100" />
          <span>Offline mode — internet connection lost. Changes will sync when online.</span>
        </div>
      )}

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
