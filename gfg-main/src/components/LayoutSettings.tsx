import { Check, PanelTop, Rows3, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type LayoutDensity = 'comfortable' | 'cozy' | 'compact';

export interface LayoutSettingsProps {
  value?: LayoutDensity;
  onChange?: (density: LayoutDensity) => void;
  compactLabel?: string;
  className?: string;
}

const densities: Array<{ value: LayoutDensity; label: string; description: string; icon: typeof Rows3 }> = [
  { value: 'comfortable', label: 'Comfortable', description: 'Balanced spacing', icon: PanelTop },
  { value: 'cozy', label: 'Cozy', description: 'Denser view', icon: Rows3 },
  { value: 'compact', label: 'Compact', description: 'Maximum density', icon: SlidersHorizontal },
];

export function LayoutSettings({
  value = 'comfortable',
  onChange,
  compactLabel = 'Density',
  className,
}: LayoutSettingsProps) {
  return (
    <Card className={cn('border-border/70 bg-card/80 shadow-sm', className)}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          {compactLabel}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        <div className="grid gap-2 sm:grid-cols-3">
          {densities.map(({ value: optionValue, label, description, icon: Icon }) => {
            const isSelected = optionValue === value;

            return (
              <button
                key={optionValue}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onChange?.(optionValue)}
                className={cn(
                  'group rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border/70 bg-background/70 hover:bg-accent/50',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-foreground/80">
                    <Icon className="h-4 w-4" />
                  </div>
                  {isSelected ? <Check className="h-4 w-4" /> : null}
                </div>
                <div className="mt-3 text-sm font-semibold">{label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{description}</div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs">
            Reset layout
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default LayoutSettings;
