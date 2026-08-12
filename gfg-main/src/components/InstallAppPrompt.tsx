import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InstallAppPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone app mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setInstalled(true);
      return;
    }

    // Check if user previously dismissed prompt
    const isDismissed = localStorage.getItem('px_pwa_dismissed') === 'true';

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('px_pwa_dismissed', 'true');
  };

  if (installed || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-16 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[90] animate-slide-up">
      <div className="p-4 rounded-xl bg-card border border-[#635bff]/30 shadow-xl backdrop-blur-lg flex items-start gap-3 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2.5 right-2.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          aria-label="Dismiss app install prompt"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-10 h-10 rounded-xl bg-[#635bff]/10 border border-[#635bff]/20 flex items-center justify-center shrink-0 text-[#635bff]">
          <Smartphone className="w-5 h-5" />
        </div>

        <div className="flex-1 pr-4 space-y-1">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            Install Peak Xender
            <span className="text-[9px] font-semibold px-1.5 py-0.2 bg-[#635bff]/15 text-[#635bff] rounded-full">
              PWA
            </span>
          </h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Add Peak Xender to your home screen for quick mobile campaign management and offline access.
          </p>

          <div className="pt-2 flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="h-8 px-3 text-xs font-bold bg-[#635bff] hover:bg-[#5248e5] text-white gap-1.5 rounded-lg shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDismiss}
              className="h-8 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Not now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
