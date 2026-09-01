import { Check, ChevronDown, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface WorkspaceOption {
  id: string;
  name: string;
  role?: string;
  description?: string;
  accent?: string;
}

export interface WorkspaceSwitcherProps {
  workspaces?: WorkspaceOption[];
  value?: string;
  onChange?: (workspace: WorkspaceOption) => void;
  className?: string;
  label?: string;
}

const defaultWorkspaces: WorkspaceOption[] = [
  {
    id: 'ops',
    name: 'Operations',
    role: 'Owner',
    description: 'Cross-functional execution and reporting',
    accent: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  },
  {
    id: 'growth',
    name: 'Growth',
    role: 'Admin',
    description: 'Campaign planning and experimentation',
    accent: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  },
  {
    id: 'support',
    name: 'Support',
    role: 'Viewer',
    description: 'Inbox triage and customer follow-up',
    accent: 'bg-violet-500/15 text-violet-600 border-violet-500/30',
  },
];

export function WorkspaceSwitcher({
  workspaces = defaultWorkspaces,
  value,
  onChange,
  className,
  label = 'Workspace',
}: WorkspaceSwitcherProps) {
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === value) ?? workspaces[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-auto justify-between gap-3 rounded-xl border bg-card/80 px-3 py-2 text-left shadow-sm hover:bg-accent/50',
            className,
          )}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
              <p className="truncate text-sm font-semibold text-foreground">{selectedWorkspace?.name ?? 'Select workspace'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedWorkspace?.role ? (
              <Badge variant="secondary" className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] font-medium">
                {selectedWorkspace.role}
              </Badge>
            ) : null}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[320px] p-2">
        <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Switch workspace
        </div>

        <DropdownMenuRadioGroup
          value={selectedWorkspace?.id}
          onValueChange={(nextValue) => {
            const nextWorkspace = workspaces.find((workspace) => workspace.id === nextValue);
            if (nextWorkspace) {
              onChange?.(nextWorkspace);
            }
          }}
        >
          {workspaces.map((workspace) => (
            <DropdownMenuRadioItem key={workspace.id} value={workspace.id} className="rounded-lg px-2 py-2 focus:bg-accent/60">
              <div className="flex w-full items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className={cn('mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border text-[11px] font-semibold', workspace.accent ?? 'bg-muted text-foreground')}>
                    {workspace.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{workspace.name}</span>
                      {workspace.role ? (
                        <Badge variant="outline" className="rounded-full px-1.5 py-0 text-[9px] font-medium">
                          {workspace.role}
                        </Badge>
                      ) : null}
                    </div>
                    {workspace.description ? <div className="mt-0.5 text-xs text-muted-foreground">{workspace.description}</div> : null}
                  </div>
                </div>

                <Check className={cn('mt-1 h-4 w-4 text-primary', selectedWorkspace?.id === workspace.id ? 'opacity-100' : 'opacity-0')} />
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default WorkspaceSwitcher;
