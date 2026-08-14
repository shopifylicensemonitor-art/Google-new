import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { useUI } from '@/context/UIContext';

export function SyncStatusWidget() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncProgress, setSyncProgress] = useState({ completed: 0, total: 0 });
  const { isOffline } = useUI();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      const data = event.data;
      if (data && data.type === 'SYNC_STARTED') {
        setSyncStatus('syncing');
        setSyncProgress({ completed: 0, total: data.count });
      } else if (data && data.type === 'SYNC_PROGRESS') {
        setSyncProgress({ completed: data.completed, total: data.total });
      } else if (data && data.type === 'SYNC_COMPLETE') {
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  if (syncStatus === 'idle' && !isOffline) return null;

  return (
    <div className="fixed bottom-20 left-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-card border border-border/60 shadow-lg rounded-full px-4 py-2 flex items-center gap-3">
        {isOffline && syncStatus === 'idle' && (
          <>
            <div className="h-2 w-2 bg-amber-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold text-amber-500">Offline (Changes Queued)</span>
          </>
        )}
        
        {syncStatus === 'syncing' && (
          <>
            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
            <span className="text-xs font-bold text-blue-500">
              Syncing... {syncProgress.completed}/{syncProgress.total}
            </span>
          </>
        )}

        {syncStatus === 'success' && (
          <>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-500">Sync Complete</span>
          </>
        )}
      </div>
    </div>
  );
}
