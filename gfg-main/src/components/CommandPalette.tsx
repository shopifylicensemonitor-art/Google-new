import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Command, Search, Sparkles, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface CommandPaletteItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  keywords?: string;
  icon?: LucideIcon;
  action?: () => void;
}

export interface CommandPaletteProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  items?: CommandPaletteItem[];
  renderTrigger?: (openPalette: () => void) => ReactNode;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

const defaultItems: CommandPaletteItem[] = [
  {
    id: 'overview',
    category: 'Navigation',
    title: 'Overview',
    description: 'Jump to the main workspace summary',
    icon: Sparkles,
    keywords: 'home dashboard summary metrics',
  },
  {
    id: 'search',
    category: 'Navigation',
    title: 'Search and filter',
    description: 'Find records across the workspace',
    icon: Search,
    keywords: 'lookup find records filters',
  },
  {
    id: 'new-rule',
    category: 'Quick Actions',
    title: 'Create new rule',
    description: 'Open the rule builder in a new draft',
    icon: Command,
    keywords: 'rule automation trigger workflow',
  },
];

export function CommandPalette({
  open,
  onOpenChange,
  items = defaultItems,
  renderTrigger,
  title = 'Command palette',
  emptyMessage = 'No matching commands',
  className,
}: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOpen = open ?? internalOpen;
  const setOpen = (nextOpen: boolean) => {
    if (typeof open === 'boolean') {
      onOpenChange?.(nextOpen);
      return;
    }

    setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return items;
    }

    const normalized = query.toLowerCase().trim();
    return items.filter((item) => {
      const haystack = [item.title, item.description ?? '', item.category ?? '', item.keywords ?? ''].join(' ').toLowerCase();
      return haystack.includes(normalized);
    });
  }, [items, query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!isOpen);
      }

      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleCommandSelect = (command: CommandPaletteItem) => {
    command.action?.();
    setOpen(false);
  };

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % Math.max(1, filteredCommands.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selectedCommand = filteredCommands[selectedIndex];
      if (selectedCommand) {
        handleCommandSelect(selectedCommand);
      }
    }
  };

  return (
    <>
      {renderTrigger ? renderTrigger(() => setOpen(true)) : null}

      {isOpen
        ? createPortal(
            <div className="fixed inset-0 z-[99999] flex items-start justify-center bg-black/60 px-4 pt-20 backdrop-blur-sm sm:pt-28">
              <div
                className={cn(
                  'w-full max-w-xl overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-2xl',
                  className,
                )}
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center gap-3 border-b border-border/60 bg-muted/30 px-4 py-3.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setSelectedIndex(0);
                    }}
                    onKeyDown={handleInputKeyDown}
                    className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                    placeholder="Search commands, filters, and actions..."
                    aria-label={title}
                  />

                  {query ? (
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}

                  <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground sm:inline-flex">
                    ESC
                  </kbd>
                </div>

                <div className="max-h-[420px] space-y-1 overflow-y-auto p-2">
                  {!filteredCommands.length ? (
                    <div className="px-3 py-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>
                  ) : (
                    filteredCommands.map((command, index) => {
                      const Icon = command.icon ?? Sparkles;
                      const isSelected = index === selectedIndex;

                      return (
                        <button
                          key={command.id}
                          type="button"
                          onMouseEnter={() => setSelectedIndex(index)}
                          onClick={() => handleCommandSelect(command)}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-accent/50',
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                              <Icon className="h-4 w-4" />
                            </div>

                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium">{command.title}</div>
                              {command.description ? <div className="truncate text-xs text-muted-foreground">{command.description}</div> : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-muted-foreground">
                            {command.category ? (
                              <span className="hidden rounded-full border border-border/80 bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground sm:inline-flex">
                                {command.category}
                              </span>
                            ) : null}
                            <ArrowRight className={cn('h-3.5 w-3.5', isSelected ? 'text-primary' : 'opacity-60')} />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">↑</kbd>
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">↓</kbd>
                    <span>Navigate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-semibold">↵</kbd>
                    <span>Select</span>
                  </div>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export default CommandPalette;
