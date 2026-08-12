import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Campaign, type Account } from '../api';
import { SEO } from '@/components/SEO';
import { AppShell } from '@/components/AppShell';
import { PullToRefresh } from '@/components/PullToRefresh';
import { DashboardSkeleton } from '@/components/DashboardSkeleton';
import { Button } from '@/components/ui/button';
import { 
  Send, Users, Mail, MessageSquare, AlertTriangle, CheckCircle2, Clock, 
  RotateCw, Play, Pause, Plus, TrendingUp, TrendingDown,
  Lock, AlertCircle, Calendar, ArrowRight, ShieldCheck, Sparkles, Inbox
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useUI } from '@/context/UIContext';

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
  } | null>(null);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Gabriel');

  const fetchDashboardData = useCallback(async () => {
    try {
      const [dashData, accountsData] = await Promise.all([
        api.getDashboardData(),
        api.getAccounts()
      ]);
      setServerData(dashData);
      setAccounts(accountsData);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Could not connect to the Outreach API server.');
    }
  }, []);

  useEffect(() => {
    fetchDashboardData().finally(() => setLoading(false));
    const intervalMs = batterySaver ? 60000 : 10000;
    const interval = setInterval(fetchDashboardData, intervalMs);
    return () => clearInterval(interval);
  }, [fetchDashboardData, batterySaver]);

  // Load user profile name if stored
  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.name) setUserName(parsed.name.split(' ')[0]);
      }
    } catch (e) {
      // default fallback
    }
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
  const todaySent = serverData?.stats.today_sent ?? 342;
  const activeCampaignsCount = serverData?.stats.active_campaigns ?? 8;
  const totalOpens = serverData?.stats.opens ?? 142;
  const totalClicks = serverData?.stats.clicks ?? 38;

  // Count accounts that require re-auth
  const needsAttentionAccounts = accounts.filter(a => a.status === 'paused' || a.status === 'error');

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
          <div className="flex items-center gap-3">
            <button className="px-3.5 py-2 rounded-lg bg-card border border-border text-foreground font-medium text-xs hover:bg-muted/60 transition-colors shadow-sm flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              Date Range: Today
            </button>
            <Button
              onClick={() => navigate('/campaigns')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs px-4 py-2 rounded-lg shadow-sm flex items-center gap-2"
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
          <div className="lg:col-span-1 bg-card border border-destructive/30 rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-32 h-32 bg-destructive/5 rounded-bl-full -mr-10 -mt-10 pointer-events-none" />
            
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Needs Attention
                </h2>
                <span className="bg-destructive/10 text-destructive font-semibold text-xs px-2.5 py-0.5 rounded-full">
                  {needsAttentionAccounts.length > 0 ? `${needsAttentionAccounts.length} items` : '2 items'}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  to="/accounts"
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 hover:border-destructive/40 transition-colors group"
                >
                  <div className="mt-0.5 bg-destructive/10 p-1.5 rounded-md text-destructive shrink-0">
                    <Lock className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground group-hover:text-destructive transition-colors">
                      Disconnected Mailbox
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {accounts.length > 0 ? `${accounts[0]?.email || 'hello@acme.co'} needs re-authentication.` : 'hello@acme.co needs re-authentication.'}
                    </p>
                  </div>
                </Link>

                <Link
                  to="/campaigns"
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 hover:border-destructive/40 transition-colors group"
                >
                  <div className="mt-0.5 bg-destructive/10 p-1.5 rounded-md text-destructive shrink-0">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-foreground group-hover:text-destructive transition-colors">
                      Campaign Delivery Limit
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Q3 Enterprise Outreach: Delivery rate near daily provider quota.
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-border/40 flex justify-end">
              <Link to="/accounts" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Review Mailboxes <ArrowRight className="h-3 w-3" />
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
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs font-semibold">
                  <TrendingUp className="h-3.5 w-3.5" /> +12%
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Total Contacts</p>
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">1,284</h3>
              </div>
            </div>

            {/* Metric: Emails Sent */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-secondary/10 text-secondary">
                  <Send className="h-5 w-5" />
                </span>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs font-semibold">
                  <TrendingUp className="h-3.5 w-3.5" /> +5%
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Emails Sent (7d)</p>
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">{todaySent}</h3>
              </div>
            </div>

            {/* Metric: Replies Received */}
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="p-2.5 rounded-lg bg-warning/10 text-warning">
                  <MessageSquare className="h-5 w-5" />
                </span>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-xs font-semibold">
                  <TrendingUp className="h-3.5 w-3.5" /> 3.4% rate
                </div>
              </div>
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-1">Replies Received</p>
                <h3 className="text-2xl font-extrabold text-foreground tracking-tight">432</h3>
              </div>
            </div>
          </div>
        </div>

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

            <div className="p-6 flex-1 flex flex-col gap-6">
              {/* Feed Item 1 */}
              <div className="flex gap-4 relative">
                <div className="absolute left-[15px] top-8 bottom-[-24px] w-[1px] bg-border/60" />
                <div className="z-10 bg-primary/10 text-primary h-8 w-8 rounded-full flex items-center justify-center shrink-0 border border-primary/20">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="pt-0.5">
                  <p className="text-xs font-semibold text-foreground">Sequence Step Completed</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Step 2 (Email) sent to 45 contacts in 'Q3 Enterprise Target'.
                  </p>
                  <span className="text-[10px] text-muted-foreground/70 font-mono block mt-1">10:24 AM</span>
                </div>
              </div>

              {/* Feed Item 2 */}
              <div className="flex gap-4 relative">
                <div className="absolute left-[15px] top-8 bottom-[-24px] w-[1px] bg-border/60" />
                <div className="z-10 bg-muted text-muted-foreground h-8 w-8 rounded-full flex items-center justify-center border border-border shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="pt-0.5">
                  <p className="text-xs font-semibold text-foreground">Follow-up Scheduled</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Automated follow-up set for Sarah Jenkins regarding 'Pricing Inquiry'.
                  </p>
                  <span className="text-[10px] text-muted-foreground/70 font-mono block mt-1">09:15 AM</span>
                </div>
              </div>

              {/* Feed Item 3 */}
              <div className="flex gap-4 relative">
                <div className="absolute left-[15px] top-8 bottom-[-24px] w-[1px] bg-border/60" />
                <div className="z-10 bg-secondary/10 text-secondary h-8 w-8 rounded-full flex items-center justify-center border border-secondary/20 shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div className="pt-0.5">
                  <p className="text-xs font-semibold text-foreground">New Contacts Imported</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Imported 120 contacts from 'Dreamforce_Leads_2024.csv'.
                  </p>
                  <span className="text-[10px] text-muted-foreground/70 font-mono block mt-1">Yesterday, 4:30 PM</span>
                </div>
              </div>

              {/* Feed Item 4 */}
              <div className="flex gap-4 relative">
                <div className="z-10 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 h-8 w-8 rounded-full flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <Play className="h-4 w-4 fill-current" />
                </div>
                <div className="pt-0.5">
                  <p className="text-xs font-semibold text-foreground">Campaign Activated</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    'Startup Founder Outreach' campaign is now live.
                  </p>
                  <span className="text-[10px] text-muted-foreground/70 font-mono block mt-1">Yesterday, 1:15 PM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Replies Sidebar Panel (1 Span) */}
          <div className="lg:col-span-1 bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col h-[480px]">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-card/80 backdrop-blur-sm sticky top-0 z-10">
              <h2 className="text-base font-semibold text-foreground">Recent Replies</h2>
              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                <Inbox className="h-3.5 w-3.5" /> 4 New
              </span>
            </div>

            <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-2 divide-y divide-border/30">
              {/* Reply Item 1 */}
              <div className="pt-2 first:pt-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground truncate">Michael Chen</span>
                  <span className="text-[10px] text-muted-foreground font-mono">10m ago</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                  Thanks for reaching out. The platform looks interesting. Can we schedule a brief demo next Tuesday?
                </p>
                <span className="inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Positive
                </span>
              </div>

              {/* Reply Item 2 */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground truncate">Elena Rodriguez</span>
                  <span className="text-[10px] text-muted-foreground font-mono">1h ago</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                  Could you send over the pricing tiers for teams larger than 50? I need to review it with our VP.
                </p>
                <span className="inline-block bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Info Request
                </span>
              </div>

              {/* Reply Item 3 */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground truncate">David Smith</span>
                  <span className="text-[10px] text-muted-foreground font-mono">3h ago</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                  Not interested at this time. Please remove me from your list.
                </p>
                <span className="inline-block bg-muted border border-border text-muted-foreground font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Unsubscribe
                </span>
              </div>

              {/* Reply Item 4 */}
              <div className="pt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground truncate">Amanda Lee</span>
                  <span className="text-[10px] text-muted-foreground font-mono">Yesterday</span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                  I'm out of the office until the 15th. I will review this upon my return.
                </p>
                <span className="inline-block bg-muted border border-border text-muted-foreground font-bold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Auto-Reply
                </span>
              </div>
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

