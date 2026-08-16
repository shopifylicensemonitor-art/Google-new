import React, { useState } from 'react';
import { useKPITargets, KPITargets, DEFAULT_KPI_TARGETS } from '@/hooks/useKPITargets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { 
  Target, TrendingUp, MailOpen, MousePointerClick, MessageSquare, 
  Clock, RotateCcw, Check, X, ShieldAlert
} from 'lucide-react';

interface KPITargetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KPITargetsModal({ isOpen, onClose }: KPITargetsModalProps) {
  const { targets, updateTargets, resetTargets } = useKPITargets();
  const [form, setForm] = useState<KPITargets>(targets);

  // Sync form with current targets when opened
  React.useEffect(() => {
    if (isOpen) {
      setForm(targets);
    }
  }, [isOpen, targets]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTargets(form);
    toast({
      title: '🎯 KPI Targets Updated',
      description: 'Your custom outreach benchmarks and delivery safety thresholds have been saved.',
    });
    onClose();
  };

  const handleReset = () => {
    resetTargets();
    setForm(DEFAULT_KPI_TARGETS);
    toast({
      title: 'Benchmarks Reset',
      description: 'KPI targets have been reset to industry recommended standards.',
    });
  };

  const setDailyPreset = (val: number) => {
    setForm(prev => ({ ...prev, dailyGoal: val }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-xl rounded-2xl border border-border/80 shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center">
            <Target className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">Configure KPI Targets & Benchmarks</h2>
            <p className="text-xs text-muted-foreground">Customize your daily outreach goals and deliverability safety thresholds.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Daily Goal */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-primary" />
                Daily Outreach Target (Emails / Day)
              </label>
              <span className="text-xs font-mono font-bold text-primary">
                {form.dailyGoal.toLocaleString()} emails
              </span>
            </div>
            
            <Input
              type="number"
              min="1"
              max="50000"
              value={form.dailyGoal || ''}
              onChange={(e) => setForm(prev => ({ ...prev, dailyGoal: parseInt(e.target.value, 10) || 0 }))}
              placeholder="e.g. 500"
              className="font-mono text-sm"
              required
            />

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
              {[100, 250, 500, 1000, 2500].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDailyPreset(val)}
                  className={`text-[11px] px-2.5 py-0.5 rounded-md font-mono border transition-all ${
                    form.dailyGoal === val 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
                  }`}
                >
                  {val.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {/* Performance Rate Benchmarks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Target Open Rate */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MailOpen className="h-3.5 w-3.5 text-blue-500" />
                Target Open %
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="1"
                  max="100"
                  value={form.targetOpenRate || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, targetOpenRate: parseFloat(e.target.value) || 0 }))}
                  className="font-mono text-xs pr-6"
                  required
                />
                <span className="absolute right-2 top-2.5 text-xs text-muted-foreground font-mono">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Standard: 40-50%</p>
            </div>

            {/* Target Click Rate */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MousePointerClick className="h-3.5 w-3.5 text-amber-500" />
                Target Click %
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={form.targetClickRate || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, targetClickRate: parseFloat(e.target.value) || 0 }))}
                  className="font-mono text-xs pr-6"
                  required
                />
                <span className="absolute right-2 top-2.5 text-xs text-muted-foreground font-mono">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Standard: 5-10%</p>
            </div>

            {/* Target Reply Rate */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                Target Reply %
              </label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="100"
                  value={form.targetReplyRate || ''}
                  onChange={(e) => setForm(prev => ({ ...prev, targetReplyRate: parseFloat(e.target.value) || 0 }))}
                  className="font-mono text-xs pr-6"
                  required
                />
                <span className="absolute right-2 top-2.5 text-xs text-muted-foreground font-mono">%</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Standard: 3-8%</p>
            </div>
          </div>

          {/* Safety & Thresholds */}
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-rose-500" />
                High Bounce Alert Threshold (%)
              </label>
              <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                {form.maxBounceRate}% max
              </span>
            </div>
            
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                min="0.5"
                max="20"
                value={form.maxBounceRate || ''}
                onChange={(e) => setForm(prev => ({ ...prev, maxBounceRate: parseFloat(e.target.value) || 0 }))}
                className="font-mono text-sm pr-6 border-rose-500/30"
                required
              />
              <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-mono">%</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Peak Xender will flag an urgent warning if your campaign bounce rate exceeds this percentage to protect mailbox health.
            </p>
          </div>

          {/* Sending Jitter / Delay Range */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3">
            <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-primary" />
              Recommended Sending Jitter Range (Seconds Between Emails)
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Min Delay</span>
                <div className="relative">
                  <Input
                    type="number"
                    min="5"
                    max="600"
                    value={form.minDelaySeconds || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, minDelaySeconds: parseInt(e.target.value, 10) || 0 }))}
                    className="font-mono text-xs pr-7"
                    required
                  />
                  <span className="absolute right-2 top-2 text-[11px] text-muted-foreground font-mono">sec</span>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground block mb-1">Max Delay</span>
                <div className="relative">
                  <Input
                    type="number"
                    min="10"
                    max="1200"
                    value={form.maxDelaySeconds || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, maxDelaySeconds: parseInt(e.target.value, 10) || 0 }))}
                    className="font-mono text-xs pr-7"
                    required
                  />
                  <span className="absolute right-2 top-2 text-[11px] text-muted-foreground font-mono">sec</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-primary text-primary-foreground text-xs font-bold gap-1.5"
              >
                <Check className="h-3.5 w-3.5" /> Save KPI Targets
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
