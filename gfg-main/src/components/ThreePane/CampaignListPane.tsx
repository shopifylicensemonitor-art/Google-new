import { ListFilter, MoreHorizontal, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CampaignItem, LayoutDensity } from './types';

interface CampaignListPaneProps {
  campaigns: CampaignItem[];
  selectedCampaignId?: string;
  onSelectCampaign: (campaign: CampaignItem) => void;
  density?: LayoutDensity;
  onOpenFilters?: () => void;
  onOpenNewCampaign?: () => void;
}

export default function CampaignListPane({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  density = 'comfortable',
  onOpenFilters,
  onOpenNewCampaign,
}: CampaignListPaneProps) {
  return (
    <section className={cn('flex min-h-0 flex-col rounded-xl border bg-card shadow-sm', density === 'compact' ? 'gap-2 p-2' : density === 'spacious' ? 'gap-4 p-4' : 'gap-3 p-3')}>
      <header className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Campaigns</p>
          <h2 className="text-lg font-semibold text-foreground">Active queues</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Search campaigns" className="h-9 w-9">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="More campaign actions" className="h-9 w-9">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button size="sm" className="gap-2" onClick={onOpenNewCampaign}>
            <Plus className="h-4 w-4" />
            New
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          {campaigns.length} live campaigns
        </div>
        <Button variant="ghost" size="sm" className="gap-2" onClick={onOpenFilters}>
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </Button>
      </div>

      <div className="space-y-2 overflow-y-auto">
        {campaigns.map((campaign) => {
          const isSelected = campaign.id === selectedCampaignId;

          return (
            <button
              key={campaign.id}
              type="button"
              onClick={() => onSelectCampaign(campaign)}
              aria-pressed={isSelected}
              className={cn(
                'w-full rounded-xl border p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-ring',
                isSelected ? 'border-primary bg-primary/5 shadow-sm' : 'border-border bg-background/60 hover:bg-muted/40',
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{campaign.name}</p>
                  <p className="text-xs text-muted-foreground">{campaign.subject}</p>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {campaign.status}
                </span>
              </div>

              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{campaign.owner}</span>
                <span>{campaign.updatedAt}</span>
              </div>

              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(campaign.progress, 100)}%` }} />
              </div>

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{campaign.recipients.toLocaleString()} recipients</span>
                <span>{campaign.progress}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
