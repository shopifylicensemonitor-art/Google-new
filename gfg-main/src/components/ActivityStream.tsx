import { Activity, ArrowUpRight, CheckCircle2, CircleAlert, Clock3 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type ActivityTone = 'info' | 'success' | 'warning' | 'muted';

export interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  time: string;
  tone?: ActivityTone;
}

export interface ActivityStreamProps {
  title?: string;
  items?: ActivityItem[];
  className?: string;
}

const toneStyles: Record<ActivityTone, string> = {
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  muted: 'bg-muted text-muted-foreground border-border/70',
};

const toneIcons: Record<ActivityTone, typeof Activity> = {
  info: Activity,
  success: CheckCircle2,
  warning: CircleAlert,
  muted: Clock3,
};

const defaultItems: ActivityItem[] = [
  { id: 'new-rule', title: 'New rule published', description: 'Audience filter updated for high-intent leads', time: '2m ago', tone: 'success' },
  { id: 'sync', title: 'Campaign sync running', description: '10 updates queued for the outbound workspace', time: '12m ago', tone: 'info' },
  { id: 'warning', title: 'Review needed', description: 'One automation rule is awaiting approval', time: '1h ago', tone: 'warning' },
  { id: 'idle', title: 'No critical issues', description: 'System health is stable across all workspaces', time: '3h ago', tone: 'muted' },
];

export function ActivityStream({ title = 'Activity stream', items = defaultItems, className }: ActivityStreamProps) {
  return (
    <Card className={cn('border-border/70 bg-card/80 shadow-sm', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Activity className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <Badge variant="outline" className="rounded-full px-2 py-0.5 text-[10px] font-medium">
          Live
        </Badge>
      </CardHeader>

      <CardContent className="space-y-0 pt-0">
        {items.map((item, index) => {
          const Icon = toneIcons[item.tone ?? 'info'];
          const isLast = index === items.length - 1;

          return (
            <div key={item.id} className="relative pl-8">
              {!isLast ? <div className="absolute left-[0.7rem] top-7 h-[calc(100%-0.75rem)] w-px bg-border" /> : null}
              <div className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border bg-background shadow-sm">
                <div className={cn('flex h-5 w-5 items-center justify-center rounded-full border', toneStyles[item.tone ?? 'info'])}>
                  <Icon className="h-3 w-3" />
                </div>
              </div>

              <div className="flex items-start justify-between gap-3 pb-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  {item.description ? <p className="mt-1 text-xs text-muted-foreground">{item.description}</p> : null}
                </div>

                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {item.time}
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export default ActivityStream;
