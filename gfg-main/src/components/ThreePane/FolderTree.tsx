import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Inbox, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { FolderTreeItem } from './types';

interface FolderTreeProps {
  items: FolderTreeItem[];
  selectedId?: string;
  collapsed?: boolean;
  onSelect?: (item: FolderTreeItem) => void;
}

const defaultExpanded: Record<string, boolean> = {
  workspace: true,
  active: true,
  archived: false,
};

export default function FolderTree({
  items,
  selectedId,
  collapsed = false,
  onSelect,
}: FolderTreeProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(defaultExpanded);

  const visibleItems = useMemo(() => items ?? [], [items]);

  const handleToggle = (id: string) => {
    setExpanded((current) => ({
      ...current,
      [id]: !(current[id] ?? true),
    }));
  };

  const renderItem = (item: FolderTreeItem, depth = 0) => {
    const isExpanded = expanded[item.id] ?? true;
    const hasChildren = Boolean(item.children?.length);
    const isSelected = selectedId === item.id || item.isActive;

    return (
      <div key={item.id} className="w-full">
        <button
          type="button"
          aria-label={item.label}
          onClick={() => {
            if (hasChildren) {
              handleToggle(item.id);
            }
            onSelect?.(item);
          }}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ring',
            isSelected && 'bg-accent text-accent-foreground',
            depth > 0 && 'ml-2',
          )}
        >
          <span className="flex h-4 w-4 items-center justify-center text-muted-foreground">
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-muted-foreground/70" />
            )}
          </span>

          <span className="flex h-5 w-5 items-center justify-center text-muted-foreground">
            {hasChildren ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
          </span>

          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {typeof item.count === 'number' && (
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {item.count}
                </span>
              )}
            </>
          )}
        </button>

        {hasChildren && !collapsed && isExpanded && (
          <div className="mt-1 space-y-1 border-l border-border pl-3">
            {item.children?.map((child) => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col rounded-xl border bg-card/80 p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Inbox className="h-4 w-4" />
          </div>
          {!collapsed && <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
            <h3 className="text-sm font-semibold text-foreground">Peak Xender</h3>
          </div>}
        </div>
        {!collapsed && (
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Search folders">
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        {!collapsed && 'Workflow views'}
      </div>

      <nav className="space-y-1 overflow-y-auto pr-1" aria-label="Folder tree navigation">
        {visibleItems.map((item) => renderItem(item, 0))}
      </nav>
    </div>
  );
}
