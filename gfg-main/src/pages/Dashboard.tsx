import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Campaign, type Account, type InboxMessage } from '../api';
import { SEO } from '@/components/SEO';
import { AppShell } from '@/components/AppShell';
import { PullToRefresh } from '@/components/PullToRefresh';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { CampaignQueueStatus } from '@/components/CampaignQueueStatus';
import { Button } from '@/components/ui/button';
import { 
  Send, Users, Mail, MessageSquare, AlertTriangle, CheckCircle2, Clock, 
  RotateCw, Play, Pause, Plus, TrendingUp, TrendingDown,
  Lock, AlertCircle, Calendar, ArrowRight, ShieldCheck, Sparkles, Inbox,
  Download, Info
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useUI } from '@/context/UIContext';
import { UsageSummaryChart } from '@/components/UsageSummaryChart';

export default function Dashboard() {
  const navigate = useNavigate();
  const { batterySaver } = useUI();
  const [serverData, setServerData] = useState<{
    stats: {
      today_sent: number;
      active_accounts: number;
      pending: number;
      active_campaigns: number;
      failed: number;
      opens?: number;
      clicks?: number;
    };
    campaigns: Campaign[];
    queue: {
      id: number;
      recipient_email: string;
      campaign_name: string | null;
      account_email: string | null;
      status: string;
    }[];
    chartData: {
      date: string;
      sent: number;
      failed: number;
    }[];
    recent_logs?: {
      id?: number;
      status: string;
      message?: string;
      recipient_email?: string;
      campaign_name?: string;
      created_at: string;
    }[];
  } | null>(null);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [recentReplies, setRecentReplies] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');
  const [days, setDays] = useState<number>(7);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [dashData, accountsData, inboxData] = await Promise.all([
        api.getDashboardData(days),
        api.getAccounts(),
        api.getInboxMessages(5).catch(() => [] as InboxMessage[])
      ]);
      setServerData(dashData);
      setAccounts(accountsData);
      setRecentReplies(Array.isArray(inboxData) ? inboxData : []);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not connect to the Outreach API server.');
    }
  }, [days]);

  useEffect(() => {
    fetchDashboardData().finally(() => {
      setLoading(false);
      // Run toast checks
      api.getDashboardData().then(dash => {
        if (dash.stats.failed > 50 && dash.stats.failed > dash.stats.today_sent * 0.1) {
          toast({ variant: 'destructive', title: 'High Bounce Rate Detected', description: `${dash.stats.failed} emails have failed recently. Check your campaigns.`});
        }
      });
      api.getAccounts().then(accs => {
        const disconnected = accs.find(a => a.status === 'disconnected' || a.status === 'error');
        if (disconnected) {
          toast({ variant: 'destructive', title: 'Gmail Auth Error', description: `Account ${disconnected.email} is disconnected. Please re-authenticate.` });
        }
      });
    });
    const intervalMs = batterySaver ? 60000 : 10000;
    const interval = setInterval(fetchDashboardData, intervalMs);
    return () => clearInterval(interval);
  }, [fetchDashboardData, batterySaver]);

  // Load actual user profile from API
  useEffect(() => {
    api.getCurrentUser().then(user => {
      if (user && user.name) {
        setUserName(user.name.split(' ')[0]);
      } else if (user && user.email) {
        setUserName(user.email.split('@')[0]);
      }
    }).catch(() => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed.name) setUserName(parsed.name.split(' ')[0]);
        }
      } catch (error) { void error; }
    });
  }, []);

  const handleToggleCampaign = async (id: number, currentStatus: string) => {
    try {
      if (currentStatus === 'sending') {
        await api.pauseCampaign(id);
        toast({ title: 'Campaign paused', description: 'Sending scheduled emails is suspended.' });
      } else {
        await api.resumeCampaign(id);
        toast({ title: 'Campaign resumed', description: 'Scheduler will resume sending emails.' });
      }
      fetchDashboardData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Operation failed',
        description: err.message || 'Could not toggle campaign.'
      });
    }
  };

  // Metrics calculation
  const todaySent = serverData?.stats.today_sent ?? 0;
  const activeCampaignsCount = serverData?.stats.active_campaigns ?? 0;
  const totalOpens = serverData?.stats.opens ?? 0;
  const totalClicks = serverData?.stats.clicks ?? 0;

  // Chart totals and rates calculation
  const chartTotalSent = (serverData?.chartData && serverData.chartData.length > 0)
    ? serverData.chartData.reduce((acc: number, d: any) => acc + (Number(d.sent) || 0), 0)
    : (serverData?.stats?.today_sent ?? todaySent);

  const openRate = chartTotalSent > 0
    ? ((totalOpens / chartTotalSent) * 100)
    : 0;

  const replyRate = serverData?.stats?.today_sent && serverData?.stats?.replies
    ? (((serverData.stats.replies) / Math.max(serverData.stats.today_sent, 1)) * 100).toFixed(1)
    : '0.0';

  // Dynamic attention items
  const attentionItems: { title: string; desc: string; link: string; icon: any }[] = [];
  accounts.forEach(a => {
    if (a.status === 'disconnected' || a.status === 'error' || a.status === 'paused') {
      attentionItems.push({
        title: 'Mailbox Re-auth Needed',
        desc: `${a.email} is ${a.status}. Re-authenticate to resume sending.`,
        link: '/accounts',
        icon: Lock,
      });
    }
  });

  (serverData?.campaigns || []).forEach(c => {
    if (c.failed_count && c.failed_count > 0 && c.failed_count > c.sent_count * 0.1) {
      attentionItems.push({
        title: 'High Bounce Rate',
        desc: `${c.name}: ${c.failed_count} failed deliveries detected.`,
        link: '/campaigns',
        icon: AlertCircle,
      });
    }
  });

  const totalContactsCount = serverData?.stats.total_contacts ?? 0;
  const repliesCount = serverData?.stats.replies ?? recentReplies.length;

  return (
    <AppShell>
      <SEO
        title="Dashboard - Outreach SaaS"
        description="Overview dashboard for email outreach campaigns, metrics, activity feed, and inbox replies."
        noindex={true}
      />

      <PullToRefresh onRefresh={fetchDashboardData}>
        {loading && !serverData ? (
          <DashboardSkeleton />
        ) : (
        <div className="space-y-6 max-w-[1440px] mx-auto pb-6">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Good morning, {userName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Here's a snapshot of your outreach performance today.
            </p>
          </div>
                    <div className="flex flex-wrap items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg bg-card border border-border text-foreground font-medium text-xs hover:bg-muted/60 transition-colors shadow-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!serverData?.campaigns) return;
                const headers = ['ID,Name,Status,Total Contacts,Sent,Failed,Opens,Clicks'];
                const rows = serverData.campaigns.map(c => 
                  `${c.id},"${c.name}",${c.status},${c.total_contacts},${c.sent_count},${c.failed_count},${c.total_opens || 0},${c.total_clicks || 0}`
                );
                const csv = headers.concat(rows).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `campaign_performance_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
              }}
              className="text-xs px-3 shadow-sm h-8 flex items-center gap-2"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              onClick={() => navigate('/campaigns')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 h-8 rounded-lg shadow-sm flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Campaign
            </Button>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between text-xs text-destructive leading-relaxed shadow-sm">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />
              <div>
                <p className="font-bold">Automation Server Warning</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={fetchDashboardData} className="text-xs">
              Retry Connection
            </Button>
          </div>
        )}

        {/* Critical Attention Area & Metrics Grid (Bento Top Row) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Needs Attention Bento Card */}
          <div className="lg:col-span-1 bg-card border border-border rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  {attentionItems.length > 0 ? (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  )}
                  System Health
                </h2>
                <span className={`font-semibold text-xs px-2.5 py-0.5 rounded-full ${
                  attentionItems.length > 0
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {attentionItems.length > 0 ? `${attentionItems.length} ${attentionItems.length === 1 ? 'item' : 'items'}` : 'All Operational'}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {attentionItems.length === 0 ? (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="mt-0.5 bg-emerald-500/10 p-1.5 rounded-md text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-semibold text-foreground">
                        All Mailboxes & Campaigns Healthy
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        No deliverability warnings or authentication issues detected.
                      </p>
                    </div>
                  </div>
                ) : (
                  attentionItems.map((item, idx) => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={idx}
                        to={item.link}
                        className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 hover:border-destructive/40 transition-colors group"
                      >
                        <div className="mt-0.5 bg-destructive/10 p-1.5 rounded-md text-destructive shrink-0">
                          <ItemIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="text-xs font-semibold text-foreground group-hover:text-destructive transition-colors">
                            {item.title}
                          </h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
              <Link to="/accounts" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Manage Mailboxes <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Key Metrics Cards (2 Columns) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Metric: Total Contacts */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </span>
                <div className="flex items-center gap-1 text-primary bg-primary/10 px-2 py-0.5 rounded-full text-xs font-semibold">
                  Contacts
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Contacts</p>
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                  {totalContactsCount.toLocaleString()}
                </h3>
              </div>
            </div>

            {/* Metric: Emails Sent */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-secondary/10 text-secondary">
                  <Send className="h-5 w-5" />
                </span>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs font-semibold">
                  <TrendingUp className="h-3.5 w-3.5" /> Active
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Emails Sent ({days}d)</p>
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                  {chartTotalSent.toLocaleString()}
                </h3>
              </div>
            </div>

            {/* Metric: Replies Received */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-warning/10 text-warning">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {replyRate}% rate
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Replies Received</p>
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">
                  {repliesCount.toLocaleString()}
                </h3>
              </div>
            </div>
          </div>
        </div>

        {/* Usage Summary Chart and Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-foreground">Usage Summary</h2>
                <p className="text-xs text-muted-foreground mt-1">Daily email outreach volume over the last {days} days.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="flex-1">
              {serverData?.chartData ? (
                <UsageSummaryChart data={serverData.chartData} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground">
                  Loading chart data...
                </div>
              )}
            </div>
          </div>
          
          {/* Summary Cards Side Panel */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <Send className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider">Total Sent ({days}d)</span>
              </div>
              <div className="text-3xl font-extrabold text-foreground">{chartTotalSent.toLocaleString()}</div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <Mail className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-semibold uppercase tracking-wider">Open Rate</span>
              </div>
              <div className="text-3xl font-extrabold text-foreground">{openRate.toFixed(1)}%</div>
            </div>
            
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2 text-muted-foreground">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-semibold uppercase tracking-wider">Reply Rate</span>
              </div>
              <div className="text-3xl font-extrabold text-foreground">{replyRate}%</div>
            </div>
          </div>
        </div>

        {/* Campaign Queue & Sync Status */}
        <CampaignQueueStatus />

        {/* Main Content Area (Two Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Activity Feed (Span 2) */}
          <div className="lg:col-span-2 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm">
              <h2 className="text-base font-semibold text-foreground">Today's Activity</h2>
              <Link to="/tracker" className="text-xs font-medium text-primary hover:underline">
                View All Reports
              </Link>
            </div>

            <div className="p-6 flex-1 flex flex-col gap-6 overflow-y-auto max-h-[400px]">
              {!serverData?.recent_logs || serverData.recent_logs.length === 0 ? (
                <div className="text-center text-xs text-muted-foreground py-8">No recent activity.</div>
              ) : (
                serverData.recent_logs.map((log, idx) => (
                  <div key={log.id || idx} className="flex gap-4 relative">
                    {idx !== (serverData.recent_logs?.length || 0) - 1 && (
                      <div className="absolute left-[15px] top-8 bottom-[-24px] w-[1px] bg-border/60" />
                    )}
                    <div className={`z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 border ${
                      log.status === 'sent' 
                        ? 'bg-primary/10 text-primary border-primary/20' 
                        : log.status === 'failed' || log.status === 'error'
                          ? 'bg-destructive/10 text-destructive border-destructive/20'
                          : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {log.status === 'sent' ? <CheckCircle2 className="h-4 w-4" /> : log.status === 'failed' || log.status === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
                    </div>
                    <div className="pt-0.5">
                      <p className="text-xs font-semibold text-foreground capitalize">{log.status} Event</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {log.message || `Email ${log.status} to ${log.recipient_email || 'unknown'}`} {log.campaign_name ? `in '${log.campaign_name}'` : ''}
                      </p>
                      <span className="text-[10px] text-muted-foreground/70 font-mono block mt-1">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Replies Sidebar Panel (1 Span) */}
          <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[480px]">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm sticky top-0 z-10">
              <h2 className="text-base font-semibold text-foreground">Recent Replies</h2>
              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                <Inbox className="h-3.5 w-3.5" /> {recentReplies.length} {recentReplies.length === 1 ? 'Message' : 'Messages'}
              </span>
            </div>

            <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-2 divide-y divide-border/30">
              {recentReplies.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-14 text-center text-muted-foreground">
                  <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No replies yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Incoming prospect emails will sync here</p>
                </div>
              ) : (
                recentReplies.map((msg) => (
                  <div key={msg.id} className="pt-3 first:pt-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                        {msg.sender_name || msg.sender_email}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {msg.created_at ? new Date(msg.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                      {msg.body_text || msg.subject || 'No preview available'}
                    </p>
                    <span className={`inline-block font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      msg.sentiment === 'hot_lead'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : msg.sentiment === 'question'
                          ? 'bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400'
                          : msg.sentiment === 'unsubscribe'
                            ? 'bg-destructive/10 border border-destructive/20 text-destructive'
                            : 'bg-muted border border-border text-muted-foreground'
                    }`}>
                      {msg.sentiment === 'hot_lead' ? 'Positive' : msg.sentiment === 'question' ? 'Question' : msg.sentiment === 'unsubscribe' ? 'Unsubscribe' : 'Neutral'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-border bg-muted/20 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate('/inbox')}
                className="text-xs font-semibold text-primary hover:text-primary/90 hover:bg-primary/5 w-full h-8"
              >
                Go to Inbox
              </Button>
            </div>
          </div>
        </div>

        {/* Campaign Progress Table & Dispatch Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Campaigns Table (2 Span) */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Active Outbound Campaigns
              </h2>
              <Link to="/campaigns" className="text-xs font-semibold text-primary hover:underline">
                View All
              </Link>
            </div>
            
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/60 text-[10px] font-bold text-muted-foreground uppercase bg-muted/40">
                      <th className="p-3">Campaign Name</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Outreach Progress</th>
                      <th className="p-3 text-right">Opens</th>
                      <th className="p-3 text-right">Clicks</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 text-xs">
                    {!serverData?.campaigns || serverData.campaigns.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No active outreach campaigns found.
                        </td>
                      </tr>
                    ) : (
                      serverData.campaigns.map(c => {
                        const pct = c.total_contacts > 0 ? Math.round((c.sent_count / c.total_contacts) * 100) : 0;
                        const sentCount = c.sent_count || 0;
                        const opens = c.total_opens || 0;
                        const clicks = c.total_clicks || 0;
                        const openRate = sentCount > 0 ? ((opens / sentCount) * 100).toFixed(1) : '0.0';
                        const clickRate = sentCount > 0 ? ((clicks / sentCount) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-semibold text-foreground max-w-[160px] truncate">
                              <div className="truncate">{c.name}</div>
                              <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                                {c.subject}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                                c.status === 'sending'
                                  ? 'bg-primary/10 text-primary border-primary/20'
                                  : c.status === 'paused'
                                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              }`}>
                                {c.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="font-semibold text-foreground">{c.sent_count} / {c.total_contacts}</div>
                              <div className="w-20 bg-muted h-1.5 rounded-full overflow-hidden ml-auto mt-1">
                                <div className="bg-primary h-full transition-all duration-300" style={{ width: `${pct}%` }} />
                              </div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="font-semibold text-foreground">{opens}</div>
                              <div className="text-[10px] text-primary font-semibold">{openRate}%</div>
                            </td>
                            <td className="p-3 text-right">
                              <div className="font-semibold text-foreground">{clicks}</div>
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{clickRate}%</div>
                            </td>
                            <td className="p-3 text-right">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleToggleCampaign(c.id, c.status)}
                                className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                                title={c.status === 'sending' ? 'Pause Campaign' : 'Resume Campaign'}
                              >
                                {c.status === 'sending' ? (
                                  <Pause className="h-3.5 w-3.5" />
                                ) : (
                                  <Play className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Live Dispatch Queue Monitor (1 Span) */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <RotateCw className="h-4 w-4 text-primary animate-spin" /> Dispatch Queue
            </h2>
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
              <div className="p-0 max-h-[300px] overflow-y-auto divide-y divide-border/30">
                {!serverData?.queue || serverData.queue.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    Dispatch queue is currently idle.
                  </div>
                ) : (
                  serverData.queue.map(item => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-2 truncate">
                        <span className="shrink-0">
                          {item.status.toLowerCase() === 'sent' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Clock className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </span>
                        <div className="truncate">
                          <p className="font-semibold text-foreground truncate">{item.recipient_email}</p>
                          <p className="text-[10px] text-muted-foreground truncate font-mono">
                            {item.account_email || 'System'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold uppercase ${
                        item.status.toLowerCase() === 'sent' 
                          ? 'text-emerald-500' 
                          : 'text-amber-500'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
      </PullToRefresh>
    </AppShell>
  );
}

