import { ArrowLeft, CheckCircle2, Copy, Mail, Pencil, Play, Sparkles, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { CampaignItem, LayoutDensity } from './types';

interface CampaignDetailPaneProps {
  campaign?: CampaignItem | null;
  density?: LayoutDensity;
  onBack?: () => void;
}

export default function CampaignDetailPane({
  campaign,
  density = 'comfortable',
  onBack,
}: CampaignDetailPaneProps) {
  if (!campaign) {
    return (
      <section className={cn('flex min-h-[420px] items-center justify-center rounded-xl border border-dashed bg-card/30 p-8 text-center text-muted-foreground', density === 'compact' ? 'p-4' : density === 'spacious' ? 'p-8' : 'p-6')}>
        <div>
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="text-sm font-medium text-foreground">No campaign selected</p>
          <p className="mt-1 text-xs">Choose a campaign to view performance, metadata, and actions.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn('flex min-h-0 flex-col rounded-xl border bg-card shadow-sm', density === 'compact' ? 'gap-2 p-2' : density === 'spacious' ? 'gap-4 p-4' : 'gap-3 p-3')}>
      <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Back to list" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Overview</p>
            <h2 className="text-lg font-semibold text-foreground">{campaign.name}</h2>
          </div>
        </div>
        <Button size="sm" className="gap-2">
          <Play className="h-4 w-4" />
          Launch
        </Button>
      </div>

      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Campaign summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Subject</p>
              <p className="mt-1 text-sm font-medium text-foreground">{campaign.subject}</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
              {campaign.status}
            </span>
          </div>

          <p className="text-sm text-muted-foreground">{campaign.description}</p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Recipients</p>
              <p className="mt-2 flex items-center gap-2 text-base font-semibold text-foreground">
                <Users className="h-4 w-4 text-primary" />
                {campaign.recipients.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Owner</p>
              <p className="mt-2 text-base font-semibold text-foreground">{campaign.owner}</p>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Updated</p>
              <p className="mt-2 text-base font-semibold text-foreground">{campaign.updatedAt}</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Delivery progress</span>
              <span>{campaign.progress}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(campaign.progress, 100)}%` }} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" className="gap-2">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button variant="outline" className="gap-2">
          <Copy className="h-4 w-4" />
          Duplicate
        </Button>
        <Button variant="outline" className="gap-2">
          <Mail className="h-4 w-4" />
          Preview
        </Button>
        <Button variant="outline" className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Validate
        </Button>
      </div>
    </section>
  );
}
