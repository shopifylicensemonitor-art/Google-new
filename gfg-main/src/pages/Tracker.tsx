import React, { useState, useMemo, useEffect } from 'react';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { useOutreachTracker } from '@/hooks/useOutreachTracker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { api, type Campaign } from '../api';
import { 
  TrendingUp, TrendingDown, Minus, Trash2, Search, Download, Trash, 
  Layers, CheckCircle2, Mail, ExternalLink, Calendar, AlertCircle,
  Send, MailOpen, MousePointerClick, MessageSquare, AlertTriangle, Filter,
  BarChart3, RefreshCw
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend 
} from 'recharts';

const TREND_DATA = [
  { day: 'Mon', opens: 4200, clicks: 1800 },
  { day: 'Tue', opens: 6100, clicks: 2500 },
  { day: 'Wed', opens: 8800, clicks: 4100 },
  { day: 'Thu', opens: 5200, clicks: 2100 },
  { day: 'Fri', opens: 7400, clicks: 3600 },
  { day: 'Sat', opens: 3100, clicks: 1200 },
  { day: 'Sun', opens: 2800, clicks: 900 }
];

export default function Tracker() {
  const { logs, deleteLog, clearLogs } = useOutreachTracker();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'individual' | 'bcc'>('all');
  const [timeRange, setTimeRange] = useState<'30' | '7' | '90'>('30');
  const [selectedCampaignFilter, setSelectedCampaignFilter] = useState<string>('all');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true);
        const data = await api.getCampaigns();
        setCampaigns(data);
      } catch (e) {
        // Fallback silently if API fails
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, []);

  // Calculate stats from actual logs + system stats
  const stats = useMemo(() => {
    const total = logs.length;
    const individualCount = logs.filter(l => l.type === 'individual').length;
    const bccCount = logs.filter(l => l.type === 'bcc').length;

    // Filter by today
    const todayStr = new Date().toDateString();
    const todayCount = logs.filter(l => new Date(l.timestamp).toDateString() === todayStr).length;

    return { total, individualCount, bccCount, todayCount };
  }, [logs]);

  // Handle Search and Type Filters for Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (typeFilter !== 'all' && l.type !== typeFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        l.email.toLowerCase().includes(q) ||
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.storeName && l.storeName.toLowerCase().includes(q)) ||
        (l.niche && l.niche.toLowerCase().includes(q))
      );
    });
  }, [logs, searchQuery, typeFilter]);

  // Export Tracking Logs to CSV
  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast({
        title: "No logs to export",
        description: "Your outreach sent logs history is currently empty.",
        variant: "destructive"
      });
      return;
    }

    const headers = 'ID,Email,Name,Store/Website,Niche,Type,Time Sent\n';
    const rows = logs.map(l => {
      const dateStr = new Date(l.timestamp).toISOString();
      const escapedName = l.name ? `"${l.name.replace(/"/g, '""')}"` : '';
      const escapedStore = l.storeName ? `"${l.storeName.replace(/"/g, '""')}"` : '';
      const escapedNiche = l.niche ? `"${l.niche.replace(/"/g, '""')}"` : '';
      return `${l.id},${l.email},${escapedName},${escapedStore},${escapedNiche},${l.type},${dateStr}`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `outreach-analytics-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Analytics CSV Exported",
      description: `${logs.length} tracking logs downloaded.`
    });
  };

  const handleClearHistory = () => {
    if (!window.confirm("Are you sure you want to clear your entire tracking history? This action cannot be undone.")) return;
    clearLogs();
    toast({
      title: "Tracking History Cleared",
      description: "All outreach sent tracking logs have been removed."
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getInitials = (email: string, name?: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return parts[0].substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <AppShell>
      <SEO
        title="Analytics Overview | Outreach Marketing Workspace"
        description="Track campaign engagement, open rates, response trends, deliverability stats, and client-side sent logs."
      />

      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Header & Controls */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Analytics Overview
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Track your campaign performance and engagement metrics.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {/* Campaign Select */}
            <select
              value={selectedCampaignFilter}
              onChange={(e) => setSelectedCampaignFilter(e.target.value)}
              className="h-10 px-3 text-xs rounded-lg border border-border/60 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff]"
            >
              <option value="all">All Campaigns</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Time Range Select */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="h-10 px-3 text-xs rounded-lg border border-border/60 bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff]"
            >
              <option value="30">Last 30 Days</option>
              <option value="7">Last 7 Days</option>
              <option value="90">Last 90 Days</option>
            </select>

            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="icon"
              className="h-10 w-10 border-border/60 bg-card hover:bg-muted"
              title="Export CSV Data"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* KPI Bento Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Sent */}
          <div className="bg-card rounded-xl p-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Send className="h-4 w-4 text-[#635bff]" />
              <span className="text-xs font-bold uppercase tracking-wider">Sent</span>
            </div>
            <div className="font-heading text-2xl font-bold text-foreground">
              {stats.total > 0 ? stats.total.toLocaleString() : '124k'}
            </div>
            <div className="flex items-center gap-1 mt-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
              <TrendingUp className="h-3 w-3" /> +12.5%
            </div>
          </div>

          {/* Delivered */}
          <div className="bg-card rounded-xl p-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-bold uppercase tracking-wider">Delivered</span>
            </div>
            <div className="font-heading text-2xl font-bold text-foreground">98.2%</div>
            <div className="flex items-center gap-1 mt-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
              <TrendingUp className="h-3 w-3" /> +2.1%
            </div>
          </div>

          {/* Opened */}
          <div className="bg-card rounded-xl p-4 border border-border/60 shadow-2xs relative overflow-hidden">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <MailOpen className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Opened</span>
            </div>
            <div className="font-heading text-2xl font-bold text-foreground">42.3%</div>
            <div className="flex items-center gap-1 mt-1 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">
              <TrendingUp className="h-3 w-3" /> +5.4%
            </div>
          </div>

          {/* Clicked */}
          <div className="bg-card rounded-xl p-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <MousePointerClick className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Clicked</span>
            </div>
            <div className="font-heading text-2xl font-bold text-foreground">8.7%</div>
            <div className="flex items-center gap-1 mt-1 text-muted-foreground text-[11px] font-bold">
              <Minus className="h-3 w-3" /> 0.0%
            </div>
          </div>

          {/* Replied */}
          <div className="bg-card rounded-xl p-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <MessageSquare className="h-4 w-4 text-purple-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Replied</span>
            </div>
            <div className="font-heading text-2xl font-bold text-foreground">3.2%</div>
            <div className="flex items-center gap-1 mt-1 text-rose-500 text-[11px] font-bold">
              <TrendingDown className="h-3 w-3" /> -1.1%
            </div>
          </div>

          {/* Bounced */}
          <div className="bg-card rounded-xl p-4 border border-border/60 shadow-2xs">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <AlertTriangle className="h-4 w-4 text-rose-500" />
              <span className="text-xs font-bold uppercase tracking-wider">Bounced</span>
            </div>
            <div className="font-heading text-2xl font-bold text-foreground">2.0%</div>
            <div className="flex items-center gap-1 mt-1 text-emerald-600 text-[11px] font-bold">
              <TrendingDown className="h-3 w-3" /> -0.5%
            </div>
          </div>
        </div>

        {/* Charts & Top Campaigns Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Engagement Trends Chart */}
          <div className="lg:col-span-2 bg-card rounded-xl border border-border/60 p-5 shadow-2xs flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-[#635bff]" /> Engagement Trends
              </h3>
              <span className="text-xs text-muted-foreground font-mono">Weekly Breakdown</span>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={TREND_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(119, 117, 135, 0.2)" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#777587' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#777587' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#151c27', 
                      borderColor: '#2D323C', 
                      borderRadius: '8px', 
                      color: '#ffffff',
                      fontSize: '12px'
                    }} 
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="opens" name="Opens" fill="#635bff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="clicks" name="Clicks" fill="#ffb68f" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Campaigns Ranking List */}
          <div className="bg-card rounded-xl border border-border/60 p-5 shadow-2xs flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-heading text-sm font-bold text-foreground">Top Campaigns</h3>
              <span className="text-xs text-[#635bff] font-bold cursor-pointer hover:underline">View All</span>
            </div>

            <div className="space-y-3 flex-1">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20 flex items-center justify-center font-bold text-xs">
                    Q3
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground">Q3 Enterprise Nurture</div>
                    <div className="text-[10px] text-muted-foreground font-mono">12,450 Sent</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-foreground">52% Open</div>
                  <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end">
                    <TrendingUp className="h-3 w-3 mr-0.5" /> +4.2%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center font-bold text-xs">
                    C2
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground">Cold Outreach v2</div>
                    <div className="text-[10px] text-muted-foreground font-mono">45,200 Sent</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-foreground">38% Open</div>
                  <div className="text-[10px] text-muted-foreground font-bold flex items-center justify-end">
                    <Minus className="h-3 w-3 mr-0.5" /> 0.0%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                    W1
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground">Webinar Invites</div>
                    <div className="text-[10px] text-muted-foreground font-mono">8,100 Sent</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-foreground">61% Open</div>
                  <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end">
                    <TrendingUp className="h-3 w-3 mr-0.5" /> +8.1%
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center font-bold text-xs">
                    R1
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground">Re-engagement</div>
                    <div className="text-[10px] text-muted-foreground font-mono">15,000 Sent</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs text-foreground">15% Open</div>
                  <div className="text-[10px] text-rose-500 font-bold flex items-center justify-end">
                    <TrendingDown className="h-3 w-3 mr-0.5" /> -2.4%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Sent History Logs Section */}
        <div className="bg-card rounded-xl border border-border/60 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="font-heading text-sm font-bold text-foreground">Outreach Sent Logs</h3>
              <p className="text-xs text-muted-foreground">Detailed record of emails triggered through your connected sending accounts.</p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearHistory}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <Trash className="h-3.5 w-3.5" /> Clear History
            </Button>
          </div>

          {/* Search & Filter bar for logs */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search logs by email, name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <div className="flex gap-1.5 w-full sm:w-auto bg-muted/40 p-1 rounded-lg border border-border/40">
              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  typeFilter === 'all' ? 'bg-card text-[#635bff] shadow-2xs' : 'text-muted-foreground'
                }`}
              >
                All Logs ({logs.length})
              </button>
              <button
                onClick={() => setTypeFilter('individual')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  typeFilter === 'individual' ? 'bg-card text-[#635bff] shadow-2xs' : 'text-muted-foreground'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setTypeFilter('bcc')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  typeFilter === 'bcc' ? 'bg-card text-[#635bff] shadow-2xs' : 'text-muted-foreground'
                }`}
              >
                BCC Batches
              </button>
            </div>
          </div>

          {/* Logs List Table */}
          <div className="min-h-[200px] max-h-[400px] overflow-y-auto border border-border/40 rounded-xl bg-background/50 divide-y divide-border/30 pr-1">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 hover:bg-muted/20 transition-colors text-xs group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className="h-8 w-8 rounded-full bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20 flex items-center justify-center font-mono font-bold shrink-0 text-xs">
                      {getInitials(log.email, log.name)}
                    </div>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        {log.name ? (
                          <span className="font-bold text-foreground truncate">
                            {log.name}
                          </span>
                        ) : (
                          <span className="font-mono text-muted-foreground">
                            Recipient
                          </span>
                        )}
                        <a
                          href={`mailto:${log.email}`}
                          className="font-mono text-muted-foreground hover:text-[#635bff] transition-colors flex items-center gap-0.5 truncate hover:underline"
                        >
                          &lt;{log.email}&gt;
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </div>

                      {(log.storeName || log.niche) && (
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                          {log.storeName && (
                            <span className="truncate">🏢 {log.storeName}</span>
                          )}
                          {log.niche && (
                            <span className="truncate italic">🏷️ {log.niche}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                    <Badge
                      className={`text-[10px] h-5 px-2 border-none font-bold ${
                        log.type === 'individual'
                          ? 'bg-blue-500/10 text-blue-500'
                          : 'bg-purple-500/10 text-purple-500'
                      }`}
                    >
                      {log.type === 'individual' ? 'INDIVIDUAL' : 'BCC BATCH'}
                    </Badge>

                    <span className="text-[11px] text-muted-foreground">
                      {formatTime(log.timestamp)}
                    </span>

                    <button
                      className="p-1 text-muted-foreground hover:text-destructive rounded-md"
                      onClick={() => deleteLog(log.id)}
                      title="Delete Entry"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground space-y-2">
                <Mail className="h-8 w-8 opacity-30" />
                <p className="text-xs font-semibold text-foreground">No Sent Logs Found</p>
                <p className="text-[11px] text-muted-foreground max-w-xs">
                  Sent history logs register automatically whenever you send emails through your campaigns or direct send tools.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
