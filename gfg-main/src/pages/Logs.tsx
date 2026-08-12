import { useState, useEffect, useCallback } from 'react';
import { api, type LogItem } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, RefreshCw, Send, CheckCircle2, XCircle, AlertCircle, Filter, 
  Clock, Eye, Terminal, Check
} from 'lucide-react';

export default function Logs() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [limit, setLimit] = useState<number>(50);
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getRecentLogs(limit);
      setLogs(data);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading logs',
        description: e.message || 'Could not fetch active email transactions.'
      });
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = logs.filter(log => {
    if (statusFilter === 'all') return true;
    return log.status.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <AppShell>
      <SEO
        title="Outreach Dispatch Logs | OutreachFlow"
        description="Verify delivery audits, track account rotating records, and inspect error details for outreach sends."
        noindex={true}
      />
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Audit Logs
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Trace real-time email transactions, delivery receipts, and system responses.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="h-10 px-3 text-xs rounded-lg border border-border/60 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff]"
            >
              <option value={20}>Show 20</option>
              <option value={50}>Show 50</option>
              <option value={100}>Show 100</option>
            </select>

            <Button
              variant="outline"
              onClick={loadLogs}
              disabled={loading}
              className="h-10 px-4 text-xs font-bold border-border/60 bg-card hover:bg-muted/40 gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#635bff] ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Logs</span>
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex gap-2 bg-card p-1.5 rounded-xl border border-border/60 w-fit">
          {['all', 'sent', 'failed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === status
                  ? 'bg-[#635bff] text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {status.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Logs Table Card */}
        <div className="bg-card rounded-xl border border-border/60 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-border/60 bg-muted/20 flex justify-between items-center">
            <div>
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <Terminal className="h-4 w-4 text-[#635bff]" /> Transaction Trace Logs ({filteredLogs.length})
              </h3>
              <p className="text-xs text-muted-foreground">Detailed audit trace of sending API requests and status responses.</p>
            </div>
          </div>

          <div>
            {filteredLogs.length === 0 ? (
              <div className="text-center p-12 text-muted-foreground text-xs space-y-2">
                <FileText className="h-8 w-8 mx-auto opacity-30 text-muted-foreground" />
                <p className="font-medium text-foreground">No recent email logs recorded.</p>
                <p className="text-muted-foreground">Active campaign dispatches and direct sends populate trace entries here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/60 text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-3 w-12 text-center">Status</th>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Sender (Account)</th>
                      <th className="p-3">Campaign / Details</th>
                      <th className="p-3 w-32 text-right">Timestamp</th>
                      <th className="p-3 w-16 text-center">Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filteredLogs.map(log => {
                      const isSent = log.status.toLowerCase() === 'sent';
                      return (
                        <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-3 text-center">
                            {isSent ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 mx-auto" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-500 mx-auto" />
                            )}
                          </td>
                          <td className="p-3 font-mono font-bold text-foreground">
                            {log.recipient_email}
                          </td>
                          <td className="p-3 text-muted-foreground font-mono truncate max-w-[160px]">
                            {log.sender_email || '—'}
                          </td>
                          <td className="p-3 space-y-0.5">
                            <div className="text-foreground font-bold">
                              {log.campaign_name || 'Direct Send'}
                            </div>
                            {log.error_message && (
                              <div className="text-[11px] text-rose-500 font-mono truncate max-w-[280px]">
                                {log.error_message}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right text-muted-foreground font-mono text-[11px]">
                            {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => {
                                setSelectedLog(log);
                                setIsPreviewOpen(true);
                              }}
                              className="p-1.5 text-muted-foreground hover:text-[#635bff] hover:bg-muted/40 rounded-lg transition-colors"
                              title="Inspect Payload"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Inspection Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-bold text-foreground">Transaction Trace Detail</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Complete metadata and response payload for log entry.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 py-2 text-xs font-mono">
              <div className="bg-muted/40 p-3 rounded-xl border border-border/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="font-bold text-foreground">{selectedLog.recipient_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sender:</span>
                  <span className="text-foreground">{selectedLog.sender_email || 'System'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`font-bold ${selectedLog.status.toLowerCase() === 'sent' ? 'text-emerald-600' : 'text-rose-500'}`}>
                    {selectedLog.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="text-foreground">{new Date(selectedLog.created_at).toISOString()}</span>
                </div>
              </div>

              {selectedLog.error_message && (
                <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-500 text-[11px] leading-relaxed">
                  <div className="font-bold mb-1">Error Trace:</div>
                  {selectedLog.error_message}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
