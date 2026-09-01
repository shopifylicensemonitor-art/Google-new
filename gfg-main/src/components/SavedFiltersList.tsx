import { MoreHorizontal, PencilLine, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SavedFilterItem {
  id: string;
  name: string;
  description?: string;
  count?: number;
  tags?: string[];
  isActive?: boolean;
}

export interface SavedFiltersListProps {
  filters?: SavedFilterItem[];
  onSelect?: (filter: SavedFilterItem) => void;
  onEdit?: (filter: SavedFilterItem) => void;
  onDelete?: (filter: SavedFilterItem) => void;
  emptyMessage?: string;
  className?: string;
}

const defaultFilters: SavedFilterItem[] = [
  {
    id: 'hot-leads',
    name: 'Hot leads',
    description: 'High intent accounts with recent activity',
    count: 24,
    tags: ['Priority', 'Sales'],
    isActive: true,
  },
  {
    id: 're-engage',
    name: 'Re-engage',
    description: 'Dormant contacts timed for a follow-up sequence',
    count: 18,
    tags: ['Lifecycle'],
  },
  {
    id: 'review-team',
    name: 'Review team',
    description: 'Accounts owned by the review squad',
    count: 9,
    tags: ['Team'],
  },
];

export function SavedFiltersList({
  filters = defaultFilters,
  onSelect,
  onEdit,
  onDelete,
  emptyMessage = 'No saved filters yet.',
  className,
}: SavedFiltersListProps) {
  if (!filters.length) {
    return (
      <Card className={cn('border-dashed border-border/80 bg-card/60 shadow-none', className)}>
        <CardContent className="flex min-h-[120px] items-center justify-center px-5 py-8 text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onSelect?.(filter)}
          className={cn(
            'group flex w-full items-center justify-between gap-3 rounded-xl border bg-card/80 p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            filter.isActive ? 'border-primary/40 bg-primary/5' : 'border-border/70',
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-foreground">{filter.name}</span>
              {filter.isActive ? <Badge variant="secondary" className="rounded-full px-1.5 py-0.5 text-[9px]">Live</Badge> : null}
            </div>
            {filter.description ? <p className="mt-1 truncate text-xs text-muted-foreground">{filter.description}</p> : null}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {filter.tags?.map((tag) => (
                <Badge key={tag} variant="outline" className="rounded-full px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {typeof filter.count === 'number' ? (
              <Badge variant="secondary" className="rounded-full px-2 py-1 text-[10px] font-medium">
                {filter.count}
              </Badge>
            ) : null}

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-70 hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      onEdit?.(filter);
                    }}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit filter</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-70 hover:opacity-100"
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete?.(filter);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete filter</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </button>
      ))}
    </div>
  );
}

export default SavedFiltersList;
