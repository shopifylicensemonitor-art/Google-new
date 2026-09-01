import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useThreePaneLayout } from './ThreePane';
import type { LayoutDensity } from './types';

const densityOptions: { value: LayoutDensity; label: string }[] = [
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'spacious', label: 'Spacious' },
];

export function LayoutSwitcher() {
  const { layoutState, setLayoutState } = useThreePaneLayout();

  return (
    <div className="inline-flex rounded-lg border bg-background/80 p-1 shadow-sm">
      {densityOptions.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={layoutState.density === option.value ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setLayoutState((current) => ({ ...current, density: option.value }))}
          className={cn('min-w-[92px] text-xs', layoutState.density !== option.value && 'text-muted-foreground')}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
