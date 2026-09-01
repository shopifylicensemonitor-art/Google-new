import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import FolderTree from './FolderTree';
import CampaignListPane from './CampaignListPane';
import CampaignDetailPane from './CampaignDetailPane';
import { LayoutSwitcher } from './LayoutSwitcher';
import styles from './ThreePane.module.css';
import type { CampaignItem, FolderTreeItem, LayoutDensity, LayoutMode, ThreePaneLayoutState, ThreePaneProps } from './types';

const STORAGE_KEY = 'peak-xender-three-pane-state';

const defaultLayoutState: ThreePaneLayoutState = {
  sidebarCollapsed: false,
  density: 'comfortable',
};

interface ThreePaneContextValue {
  layoutState: ThreePaneLayoutState;
  setLayoutState: React.Dispatch<React.SetStateAction<ThreePaneLayoutState>>;
  breakpoint: LayoutMode;
  sidebarVisible: boolean;
  toggleSidebar: () => void;
}

const ThreePaneContext = createContext<ThreePaneContextValue | null>(null);

export function useThreePaneLayout() {
  const context = useContext(ThreePaneContext);

  if (!context) {
    throw new Error('useThreePaneLayout must be used within a ThreePane provider.');
  }

  return context;
}

function readStoredState(): ThreePaneLayoutState {
  if (typeof window === 'undefined') {
    return defaultLayoutState;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return defaultLayoutState;
    }

    const parsed = JSON.parse(stored) as Partial<ThreePaneLayoutState>;
    return {
      sidebarCollapsed: Boolean(parsed.sidebarCollapsed),
      density: parsed.density === 'compact' || parsed.density === 'spacious' ? parsed.density : 'comfortable',
    };
  } catch {
    return defaultLayoutState;
  }
}

function getBreakpoint(width: number): LayoutMode {
  if (width < 640) return 'mobile';
  if (width <= 1024) return 'tablet';
  return 'desktop';
}

export function ThreePane({
  folders = [],
  campaigns = [],
  selectedCampaignId,
  onSelectCampaign,
  header,
  className,
}: ThreePaneProps) {
  const [layoutState, setLayoutState] = useState<ThreePaneLayoutState>(readStoredState);
  const [breakpoint, setBreakpoint] = useState<LayoutMode>(() => getBreakpoint(typeof window === 'undefined' ? 1440 : window.innerWidth));
  const [mobilePane, setMobilePane] = useState<'list' | 'detail'>('list');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutState));
  }, [layoutState]);

  useEffect(() => {
    const handleResize = () => {
      const nextBreakpoint = getBreakpoint(window.innerWidth);
      setBreakpoint(nextBreakpoint);

      if (nextBreakpoint !== 'mobile') {
        setMobileSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? campaigns[0] ?? null,
    [campaigns, selectedCampaignId],
  );

  const sidebarVisible = breakpoint === 'desktop' ? !layoutState.sidebarCollapsed : mobileSidebarOpen;

  const handleCampaignSelect = (campaign: CampaignItem) => {
    setMobilePane('detail');
    onSelectCampaign?.(campaign);
  };

  const toggleSidebar = () => {
    if (breakpoint === 'mobile') {
      setMobileSidebarOpen((current) => !current);
      return;
    }

    setLayoutState((current) => ({
      ...current,
      sidebarCollapsed: !current.sidebarCollapsed,
    }));
  };

  const contextValue = {
    layoutState,
    setLayoutState,
    breakpoint,
    sidebarVisible,
    toggleSidebar,
  };

  return (
    <ThreePaneContext.Provider value={contextValue}>
      <div className={cn('relative h-full w-full', styles.threePaneRoot, className)}>
        {breakpoint === 'mobile' && mobileSidebarOpen && (
          <button
            type="button"
            aria-label="Close folder menu"
            onClick={() => setMobileSidebarOpen(false)}
            className={cn(styles.mobileBackdrop, 'cursor-default')}
          />
        )}

        <div className={cn('flex h-full w-full flex-col gap-3 p-3', breakpoint === 'mobile' ? 'pb-6' : '')}>
          {header && (
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card/70 px-3 py-2 shadow-sm">
              {header}
              <LayoutSwitcher />
            </div>
          )}

          {!header && (
            <div className="flex items-center justify-between gap-3 rounded-xl border bg-card/70 px-3 py-2 shadow-sm">
              <div className="flex items-center gap-2">
                {breakpoint === 'mobile' && (
                  <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Toggle folder menu" onClick={toggleSidebar}>
                    {mobileSidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
                  </Button>
                )}
                {breakpoint !== 'mobile' && (
                  <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Collapse folder tree" onClick={toggleSidebar}>
                    {layoutState.sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                  </Button>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
                  <h1 className="text-base font-semibold text-foreground">Campaign hub</h1>
                </div>
              </div>
              <LayoutSwitcher />
            </div>
          )}

          {breakpoint === 'desktop' && (
            <div className={cn(styles.desktopGrid, 'flex-1')}>
              <aside className={cn(styles.pane, layoutState.sidebarCollapsed && styles.sidebarCollapsed)}>
                <FolderTree
                  items={folders}
                  selectedId={selectedCampaignId}
                  collapsed={layoutState.sidebarCollapsed}
                  onSelect={(item) => {
                    if (item.children?.length) return;
                    if (item.label) {
                      // Folder selection is intentionally lightweight; it keeps layout state unchanged.
                    }
                  }}
                />
              </aside>

              <CampaignListPane
                campaigns={campaigns}
                selectedCampaignId={selectedCampaignId}
                onSelectCampaign={handleCampaignSelect}
                density={layoutState.density}
              />

              <CampaignDetailPane
                campaign={activeCampaign}
                density={layoutState.density}
              />
            </div>
          )}

          {breakpoint === 'tablet' && (
            <div className={cn(styles.tabletGrid, 'flex-1')}>
              <CampaignListPane
                campaigns={campaigns}
                selectedCampaignId={selectedCampaignId}
                onSelectCampaign={handleCampaignSelect}
                density={layoutState.density}
              />

              <CampaignDetailPane
                campaign={activeCampaign}
                density={layoutState.density}
              />
            </div>
          )}

          {breakpoint === 'mobile' && (
            <>
              {mobileSidebarOpen && (
                <aside className={cn(styles.mobileDrawer, 'bg-card shadow-xl')}>
                  <div className="h-full p-3">
                    <FolderTree items={folders} selectedId={selectedCampaignId} collapsed={false} onSelect={() => setMobileSidebarOpen(false)} />
                  </div>
                </aside>
              )}

              <div className={cn(styles.mobileSinglePane, 'flex-1')}>
                {mobilePane === 'list' ? (
                  <CampaignListPane
                    campaigns={campaigns}
                    selectedCampaignId={selectedCampaignId}
                    onSelectCampaign={handleCampaignSelect}
                    density={layoutState.density}
                  />
                ) : (
                  <CampaignDetailPane
                    campaign={activeCampaign}
                    density={layoutState.density}
                    onBack={() => setMobilePane('list')}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </ThreePaneContext.Provider>
  );
}

export default ThreePane;
