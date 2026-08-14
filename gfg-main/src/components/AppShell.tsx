import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileBottomNav } from './MobileBottomNav';
import { AIChatBot } from './AIChatBot';
import { FloatingSendWidget } from './FloatingSendWidget';
import { InstallAppPrompt } from './InstallAppPrompt';
import { SyncStatusWidget } from './SyncStatusWidget';
import { useUI } from '@/context/UIContext';
import { useHotkeys } from '@/hooks/useHotkeys';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const {
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed,
    toggleSidebarCollapsed
  } = useUI();

  const { shortcutsOpen, setShortcutsOpen } = useHotkeys();

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Fixed Sidebar for Layout */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
          sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-64'
        }`}
      >
        {/* TopBar */}
        <TopBar onOpenSidebar={() => setSidebarOpen(true)} />

        {/* Content Area — pb-20 on mobile for bottom nav clearance */}
        <main
          id="main-content"
          className="flex-1 overflow-x-hidden overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 max-w-5xl w-full mx-auto animate-fade-in pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] lg:pb-6"
        >
          {children}
        </main>
      </div>

      {/* Keyboard Shortcuts Dialog Modal */}
      <KeyboardShortcutsModal open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Sync Status Widget */}
      <SyncStatusWidget />

      {/* Gemini AI Assistant Floating Widget */}
      <AIChatBot />

      {/* Movable Floating Direct Send Current Widget */}
      <FloatingSendWidget />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* PWA Install App Prompt */}
      <InstallAppPrompt />
    </div>
  );
}

