import { useEffect, useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock, Server, Send } from 'lucide-react';
import { useUI } from '@/context/UIContext';
import { Card } from '@/components/ui/card';

export function CampaignQueueStatus() {
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncProgress, setSyncProgress] = useState({ completed: 0, total: 0 });
  const { isOffline } = useUI();
  const [queuedEmails, setQueuedEmails] = useState(0);

  // Poll IndexedDB for queued items
  useEffect(() => {
    const checkQueue = async () => {
      try {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const req = indexedDB.open('PeakXOfflineDB', 1);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        });

        if (!db.objectStoreNames.contains('campaignQueue')) {
          setQueuedEmails(0);
          return;
        }

        const tx = db.transaction('campaignQueue', 'readonly');
        const store = tx.objectStore('campaignQueue');
        const countReq = store.count();
        countReq.onsuccess = () => setQueuedEmails(countReq.result);
      } catch (e) {
        console.error("Failed to read indexedDB:", e);
      }
    };

    checkQueue();
    const interval = setInterval(checkQueue, 2000);
    return () => clearInterval(interval);
  }, []);

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
        setTimeout(() => setSyncStatus('idle'), 4000);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  // Visual state mappings
  const isSyncing = syncStatus === 'syncing';
  const hasQueue = queuedEmails > 0;

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col mb-6">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <Server className="h-4 w-4 text-primary" /> Background Dispatch Queue
        </h2>
        <div className="flex items-center gap-2">
           {isOffline ? (
              <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Offline Mode
              </span>
           ) : (
              <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Online Connected
              </span>
           )}
        </div>
      </div>

      <div className="p-5 flex flex-col md:flex-row items-center gap-6">
        {/* Metric block 1 */}
        <div className="flex-1 w-full bg-muted/30 border border-border/50 rounded-xl p-4 flex items-center gap-4">
          <div className="h-10 w-10 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">Queued Emails</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold text-foreground leading-none">{queuedEmails}</h3>
              {hasQueue && <span className="text-[10px] text-muted-foreground">pending dispatch</span>}
            </div>
          </div>
        </div>

        {/* Sync Progress Visualizer */}
        <div className="flex-[2] w-full bg-muted/30 border border-border/50 rounded-xl p-4 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-2">
              {isSyncing ? (
                <><RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" /> Syncing in progress...</>
              ) : syncStatus === 'success' ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Sync Completed Successfully</>
              ) : hasQueue && isOffline ? (
                <><AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Waiting for connection to sync</>
              ) : (
                <><Send className="h-3.5 w-3.5 text-muted-foreground" /> Service Worker Idle</>
              )}
            </p>
            {isSyncing && (
              <span className="text-xs font-bold text-primary">
                {syncProgress.completed} / {syncProgress.total}
              </span>
            )}
          </div>
          
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                isSyncing ? 'bg-primary' : 
                syncStatus === 'success' ? 'bg-emerald-500' : 
                hasQueue && isOffline ? 'bg-amber-500' : 
                'bg-muted-foreground/20'
              }`}
              style={{ width: isSyncing && syncProgress.total > 0 ? `${(syncProgress.completed / syncProgress.total) * 100}%` : (syncStatus === 'success' ? '100%' : hasQueue ? '10%' : '0%') }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
