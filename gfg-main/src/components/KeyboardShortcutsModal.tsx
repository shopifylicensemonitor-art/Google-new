import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SHORTCUTS_LIST } from '@/hooks/useHotkeys';
import { Keyboard, Command, Navigation, Zap, Eye, Sparkles } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const categories = ['Navigation', 'Actions', 'View'] as const;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[#635bff] mb-1">
            <Keyboard className="h-5 w-5" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider">Power User Controls</span>
          </div>
          <DialogTitle className="font-heading text-lg font-bold text-foreground">
            Keyboard Shortcuts Cheat Sheet
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Speed up your cold email workflow with instant hotkeys.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {categories.map((cat) => {
            const items = SHORTCUTS_LIST.filter(s => s.category === cat);
            if (items.length === 0) return null;

            return (
              <div key={cat} className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 px-1">
                  {cat === 'Navigation' && <Navigation className="h-3 w-3 text-[#635bff]" />}
                  {cat === 'Actions' && <Zap className="h-3 w-3 text-amber-500" />}
                  {cat === 'View' && <Eye className="h-3 w-3 text-emerald-500" />}
                  <span>{cat} Shortcuts</span>
                </h4>

                <div className="bg-muted/30 rounded-xl border border-border/50 divide-y divide-border/40 overflow-hidden">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                      <span className="text-foreground font-medium">{item.description}</span>
                      <kbd className="px-2 py-1 rounded-md bg-card border border-border/80 text-[11px] font-mono font-bold text-[#635bff] shadow-2xs">
                        {item.keyCombo}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-[#635bff]" /> Press <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-foreground font-bold">Shift + ?</kbd> anywhere to open
          </span>
          <button
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 rounded-lg bg-[#635bff] text-white font-bold text-xs hover:bg-[#493ee5] transition-colors"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
