import type { ReactNode } from 'react';

export type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
export type LayoutMode = 'mobile' | 'tablet' | 'desktop';

export interface FolderTreeItem {
  id: string;
  label: string;
  icon?: string;
  count?: number;
  isActive?: boolean;
  children?: FolderTreeItem[];
}

export interface CampaignItem {
  id: string;
  name: string;
  subject: string;
  owner: string;
  status: 'Draft' | 'Scheduled' | 'Running' | 'Paused' | 'Completed';
  updatedAt: string;
  recipients: number;
  progress: number;
  description: string;
}

export interface ThreePaneLayoutState {
  sidebarCollapsed: boolean;
  density: LayoutDensity;
}

export interface ThreePaneProps {
  folders?: FolderTreeItem[];
  campaigns?: CampaignItem[];
  selectedCampaignId?: string;
  onSelectCampaign?: (campaign: CampaignItem) => void;
  header?: ReactNode;
  className?: string;
}
