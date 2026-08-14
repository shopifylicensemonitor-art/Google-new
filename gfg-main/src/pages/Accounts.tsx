import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, type Account } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { RecentSearchInput } from '@/components/RecentSearchInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Mail, Plus, Trash2, RefreshCw, Play, Pause, User, Sparkles, CheckCircle2, 
  AlertTriangle, Info, Server, Search, Filter, ShieldCheck, Activity, 
  Settings, ArrowLeft, ExternalLink, X, TrendingUp, Check, ShieldAlert,
  Flame, MonitorHeart, SlidersHorizontal, MoreVertical, Layers
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface AccountsProps {
  requirePin?: (label: string, action: () => void) => void;
}

export default function Accounts({ requirePin }: AccountsProps) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingName, setEditingName] = useState<Record<number, string>>({});
  const [editingLimit, setEditingLimit] = useState<Record<number, number>>({});
  const [savingNameId, setSavingNameId] = useState<number | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals
  const [showConnectModal, setShowConnectModal] = useState<boolean>(false);
  const [showSmtpModal, setShowSmtpModal] = useState<boolean>(false);
  const [selectedMailboxDetail, setSelectedMailboxDetail] = useState<Account | null>(null);

  // SMTP Form State
  const [smtpEmail, setSmtpEmail] = useState<string>('');
  const [smtpHost, setSmtpHost] = useState<string>('');
  const [smtpPort, setSmtpPort] = useState<string>('587');
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPass, setSmtpPass] = useState<string>('');
  const [smtpSecure, setSmtpSecure] = useState<boolean>(false);
  const [smtpDisplayName, setSmtpDisplayName] = useState<string>('');
  const [smtpTesting, setSmtpTesting] = useState<boolean>(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await api.getAccounts();
      setAccounts(data);
      const names: Record<number, string> = {};
      const limits: Record<number, number> = {};
      data.forEach(a => {
        names[a.id] = a.display_name || '';
        limits[a.id] = 250; // default cap
      });
      setEditingName(names);
      setEditingLimit(limits);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading mailboxes',
        description: e.message || 'Could not reach server.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        toast({
          title: 'Gmail Mailbox Connected!',
          description: `Successfully linked ${event.data.email}.`
        });
        loadAccounts();
        setShowConnectModal(false);
      } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
        toast({
          variant: 'destructive',
          title: 'Google OAuth Connection Failed',
          description: event.data.error || 'Authorization was cancelled or failed.'
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnectGoogle = () => {
    const action = async () => {
      try {
        toast({
          title: 'Generating Google OAuth link...',
          description: 'Please complete login in the popup window.'
        });
        const res = await api.getAuthUrl();
        window.open(res.url, '_blank', 'width=600,height=700');
        setShowConnectModal(false);

        // Poll for updates
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          await loadAccounts();
          if (attempts > 10) clearInterval(interval);
        }, 3000);
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Connection failed',
          description: e.message || 'Could not retrieve authentication URL.'
        });
      }
    };

    if (requirePin) {
      requirePin('connect new mailbox account', action);
    } else {
      action();
    }
  };

  const handleConnectSmtp = () => {
    const action = async () => {
      if (!smtpEmail || !smtpHost || !smtpUser || !smtpPass) {
        toast({
          variant: 'destructive',
          title: 'Missing Required Fields',
          description: 'Please fill in Sender Email, SMTP Host, Username, and Password.'
        });
        return;
      }
      try {
        setSmtpTesting(true);
        toast({
          title: 'Verifying SMTP Server...',
          description: 'Testing credentials and TLS handshake.'
        });
        const res = await api.connectSmtp({
          email: smtpEmail,
          smtp_host: smtpHost,
          smtp_port: parseInt(String(smtpPort)) || 587,
          smtp_user: smtpUser,
          smtp_pass: smtpPass,
          smtp_secure: smtpSecure,
          display_name: smtpDisplayName || undefined
        });
        if (res.success) {
          toast({
            title: 'Custom SMTP Mailbox Linked',
            description: res.message || 'Mailbox successfully added to rotation pool.'
          });
          setShowSmtpModal(false);
          setShowConnectModal(false);
          // Reset form
          setSmtpEmail('');
          setSmtpHost('');
          setSmtpPort('587');
          setSmtpUser('');
          setSmtpPass('');
          setSmtpSecure(false);
          setSmtpDisplayName('');
          loadAccounts();
        }
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'SMTP Verification Failed',
          description: e.message || 'Could not connect to SMTP server.'
        });
      } finally {
        setSmtpTesting(false);
      }
    };

    if (requirePin) {
      requirePin('connect custom SMTP mailbox', action);
    } else {
      action();
    }
  };

  const handleDelete = (id: number, email: string) => {
    const action = async () => {
      if (!window.confirm(`Permanently disconnect and remove mailbox "${email}"?`)) return;
      try {
        await api.deleteAccount(id);
        toast({
          title: 'Mailbox Disconnected',
          description: `${email} was removed from the sending pool.`
        });
        if (selectedMailboxDetail?.id === id) {
          setSelectedMailboxDetail(null);
        }
        loadAccounts();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error removing mailbox',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('remove connected account', action);
    } else {
      action();
    }
  };

  const handleReset = (id: number) => {
    const action = async () => {
      try {
        await api.resetAccount(id);
        toast({
          title: 'Sending Volume Reset',
          description: 'Daily sending counter set back to 0.'
        });
        loadAccounts();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error resetting counter',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('reset account volume', action);
    } else {
      action();
    }
  };

  const handleToggleStatus = (id: number, currentStatus: 'active' | 'paused') => {
    const action = async () => {
      try {
        if (currentStatus === 'active') {
          await api.pauseAccount(id);
          toast({
            title: 'Mailbox Paused',
            description: 'This mailbox will temporarily pause sending scheduled emails.'
          });
        } else {
          await api.resumeAccount(id);
          toast({
            title: 'Mailbox Resumed',
            description: 'This mailbox is active and receiving queue assignments.'
          });
        }
        loadAccounts();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error updating mailbox status',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('change account status', action);
    } else {
      action();
    }
  };

  const handleSaveName = async (id: number) => {
    try {
      setSavingNameId(id);
      await api.updateDisplayName(id, editingName[id] || '');
      toast({
        title: 'Display Name Saved',
        description: `Emails will send as "${editingName[id]}".`
      });
      loadAccounts();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error saving display name',
        description: e.message
      });
    } finally {
      setSavingNameId(null);
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(a => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchEmail = a.email.toLowerCase().includes(q);
      const matchName = (a.display_name || '').toLowerCase().includes(q);
      if (!matchEmail && !matchName) return false;
    }
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    return true;
  });

  const activeCount = accounts.filter(a => a.status === 'active').length;
  const pausedCount = accounts.filter(a => a.status === 'paused').length;
  const totalSentToday = accounts.reduce((sum, a) => sum + (a.daily_sent || 0), 0);
  const totalDailyCap = accounts.length * 250;

  return (
    <AppShell>
      <SEO
        title="Mailboxes | Outreach Marketing Workspace"
        description="Manage your connected email sending accounts, monitor health diagnostics, SPF/DKIM verification, and daily limit metrics."
      />

      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Mailboxes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your connected sending accounts and monitor deliverability health.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowConnectModal(true)}
              className="h-10 px-5 text-xs font-semibold gap-2 bg-[#635bff] hover:bg-[#493ee5] text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Connect Mailbox
            </Button>
          </div>
        </header>

        {/* Dashboard Stats Bento Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl p-5 border border-border/60 flex flex-col justify-between h-32 relative overflow-hidden shadow-2xs">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Connected</p>
            <div className="flex items-end gap-3">
              <span className="font-heading text-3xl font-bold text-foreground">{accounts.length}</span>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1 mb-1 border border-emerald-500/20">
                <TrendingUp className="h-3 w-3" /> {activeCount} Active
              </span>
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border/60 flex flex-col justify-between h-32 relative overflow-hidden shadow-2xs">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Needs Attention</p>
            <div className="flex items-end gap-3">
              <span className="font-heading text-3xl font-bold text-foreground">{pausedCount}</span>
              <span className="text-[11px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded flex items-center gap-1 mb-1 border border-amber-500/20">
                {pausedCount > 0 ? 'Requires Action' : 'All Healthy'}
              </span>
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border/60 flex flex-col justify-between h-32 relative overflow-hidden shadow-2xs">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sending Volume Today</p>
            <div className="flex items-end gap-3">
              <span className="font-heading text-3xl font-bold text-foreground">{totalSentToday}</span>
              <span className="text-xs text-muted-foreground mb-1 font-mono">
                / {totalDailyCap > 0 ? totalDailyCap : 250} daily limit
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60 shadow-2xs">
          <RecentSearchInput
            storageKey="accounts_search_history"
            placeholder="Search mailboxes by address or display name..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff] transition-all"
            containerClassName="relative w-full md:max-w-md"
            iconClassName="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-[#635bff]"
            >
              <option value="all">Status: All</option>
              <option value="active">Active Senders</option>
              <option value="paused">Paused Senders</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 px-3 text-xs rounded-lg border border-border/60 bg-background text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-[#635bff]"
            >
              <option value="all">Provider: All</option>
              <option value="gmail">Google Workspace / OAuth</option>
              <option value="smtp">Custom SMTP / TLS</option>
            </select>

            <Button
              onClick={loadAccounts}
              disabled={loading}
              variant="outline"
              size="icon"
              className="h-9 w-9 border-border/60 bg-background hover:bg-muted"
              title="Refresh Mailbox List"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Active Accounts Table List */}
        <div className="bg-card rounded-xl border border-border/60 overflow-hidden shadow-2xs">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h3 className="font-heading text-sm font-bold text-foreground">Active Connected Accounts</h3>
            <span className="text-xs text-muted-foreground font-mono">Showing {filteredAccounts.length} of {accounts.length}</span>
          </div>

          {/* Desktop Table Headers */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 border-b border-border/60 bg-muted/30 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-4">Account Details</div>
            <div className="col-span-2">Health Status</div>
            <div className="col-span-3">Sending Stats (Today)</div>
            <div className="col-span-2">Last Sync</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>

          {/* Accounts Rows */}
          <div className="divide-y divide-border/40">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground text-xs">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#635bff]" />
                Checking connected mailboxes...
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground text-xs space-y-2">
                <Mail className="h-8 w-8 mx-auto opacity-30 text-muted-foreground" />
                <p>No mailboxes connected matching current filters.</p>
                <Button
                  onClick={() => setShowConnectModal(true)}
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs font-semibold"
                >
                  Connect Your First Mailbox
                </Button>
              </div>
            ) : (
              filteredAccounts.map((acct) => {
                const sent = acct.daily_sent || 0;
                const limit = 250;
                const pct = Math.min(Math.round((sent / limit) * 100), 100);

                return (
                  <div
                    key={acct.id}
                    onClick={() => setSelectedMailboxDetail(acct)}
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 sm:p-5 items-center hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    {/* Column 1: Account Details */}
                    <div className="col-span-1 md:col-span-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20 flex items-center justify-center font-bold text-xs shrink-0">
                        {acct.type === 'smtp' ? <Server className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs sm:text-sm text-foreground truncate group-hover:text-[#635bff] transition-colors">
                          {acct.email}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {acct.type === 'smtp' ? 'Custom SMTP / TLS' : 'Google Workspace'} • {acct.display_name ? `Sends as "${acct.display_name}"` : 'Main Outreach'}
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Health Status */}
                    <div className="col-span-1 md:col-span-2 flex items-center">
                      {acct.status === 'active' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-xs border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Healthy
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold text-xs border border-amber-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Paused
                        </span>
                      )}
                    </div>

                    {/* Column 3: Sending Stats */}
                    <div className="col-span-1 md:col-span-3 flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-mono text-foreground font-semibold">{sent} Sent</span>
                        <span className="text-muted-foreground font-mono">{limit} Limit</span>
                      </div>
                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${
                            pct > 80 ? 'bg-amber-500' : 'bg-[#635bff]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Column 4: Last Sync */}
                    <div className="col-span-1 md:col-span-2 text-xs text-muted-foreground font-mono">
                      {acct.last_reset ? new Date(acct.last_reset).toLocaleDateString() : 'Active'}
                    </div>

                    {/* Column 5: Actions */}
                    <div className="col-span-1 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(acct.id, acct.status)}
                        className="h-8 px-2 text-[11px] font-bold"
                      >
                        {acct.status === 'active' ? 'Pause' : 'Resume'}
                      </Button>
                      <button
                        onClick={() => setSelectedMailboxDetail(acct)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                        title="View Diagnostics & Settings"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Connection Selection Modal */}
      <Dialog open={showConnectModal} onOpenChange={setShowConnectModal}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-heading text-lg font-bold text-foreground">
              Connect a New Mailbox
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Choose your email provider protocol to connect sending accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 py-4">
            <button
              onClick={handleConnectGoogle}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-[#635bff]/5 hover:border-[#635bff]/40 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-[#635bff]/10 text-[#635bff] flex items-center justify-center font-bold shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-[#635bff] transition-colors">
                  Google Workspace / Gmail OAuth
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Connect securely via Google OAuth 2.0 API with automatic token refresh.
                </p>
              </div>
            </button>

            <button
              onClick={() => {
                setShowConnectModal(false);
                setShowSmtpModal(true);
              }}
              className="flex items-center gap-4 p-4 rounded-xl border border-border/60 bg-muted/20 hover:bg-[#635bff]/5 hover:border-[#635bff]/40 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold shrink-0">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-foreground group-hover:text-[#635bff] transition-colors">
                  Custom SMTP / TLS Protocol
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Connect Office 365, SendGrid, Amazon SES, or custom server hostnames.
                </p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* SMTP Modal */}
      <Dialog open={showSmtpModal} onOpenChange={setShowSmtpModal}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
              <Server className="h-5 w-5 text-[#635bff]" /> Connect Custom SMTP
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add custom SMTP credentials to expand your rotating mailbox pool.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Display Name</label>
                <Input
                  placeholder="e.g. Sales Team"
                  value={smtpDisplayName}
                  onChange={e => setSmtpDisplayName(e.target.value)}
                  className="rounded-lg h-9 border-border/80"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Sender Email*</label>
                <Input
                  type="email"
                  placeholder="e.g. john@acmecorp.com"
                  value={smtpEmail}
                  onChange={e => setSmtpEmail(e.target.value)}
                  className="rounded-lg h-9 border-border/80"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="font-bold text-foreground">SMTP Host*</label>
                <Input
                  placeholder="e.g. smtp.mailgun.org"
                  value={smtpHost}
                  onChange={e => setSmtpHost(e.target.value)}
                  className="rounded-lg h-9 border-border/80"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Port*</label>
                <Input
                  placeholder="587"
                  value={smtpPort}
                  onChange={e => setSmtpPort(e.target.value)}
                  className="rounded-lg h-9 border-border/80"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">SMTP Username*</label>
                <Input
                  placeholder="Username"
                  value={smtpUser}
                  onChange={e => setSmtpUser(e.target.value)}
                  className="rounded-lg h-9 border-border/80"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">SMTP Password*</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={smtpPass}
                  onChange={e => setSmtpPass(e.target.value)}
                  className="rounded-lg h-9 border-border/80"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="smtp-secure"
                checked={smtpSecure}
                onChange={e => setSmtpSecure(e.target.checked)}
                className="h-4 w-4 rounded border-border/80 text-[#635bff] focus:ring-[#635bff]"
              />
              <label htmlFor="smtp-secure" className="text-xs font-semibold text-foreground cursor-pointer">
                Use SSL/TLS (Port 465)
              </label>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSmtpModal(false)}
              className="rounded-lg h-9 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConnectSmtp}
              disabled={smtpTesting}
              className="rounded-lg bg-[#635bff] hover:bg-[#493ee5] text-white h-9 px-5 text-xs font-bold gap-2"
            >
              {smtpTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              <span>{smtpTesting ? 'Verifying...' : 'Verify & Save'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mailbox Detailed Diagnostics Modal / Drawer */}
      {selectedMailboxDetail && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex justify-center items-center z-[9999] p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-card border border-border/80 shadow-2xl rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-4 bg-muted/30 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#635bff]/10 text-[#635bff] border border-[#635bff]/20 flex items-center justify-center font-bold text-xs">
                  {selectedMailboxDetail.type === 'smtp' ? <Server className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-base font-bold text-foreground">
                      {selectedMailboxDetail.email}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                      Healthy
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provider: {selectedMailboxDetail.type === 'smtp' ? 'Custom SMTP' : 'Google Workspace'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMailboxDetail(null)}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6">
              
              {/* Health Diagnostics Section */}
              <div className="space-y-3">
                <h3 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
                  Health Diagnostics & DNS Records
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1 relative">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 absolute top-3 right-3" />
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">SPF Record</span>
                    <p className="font-bold text-xs text-foreground">Verified</p>
                    <p className="text-[10px] text-muted-foreground">Authorized domain server protocol.</p>
                  </div>

                  <div className="p-3 bg-muted/20 border border-border/60 rounded-xl space-y-1 relative">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 absolute top-3 right-3" />
                    <span className="text-[10px] text-muted-foreground font-bold uppercase">DKIM Record</span>
                    <p className="font-bold text-xs text-foreground">Verified</p>
                    <p className="text-[10px] text-muted-foreground">Cryptographic signature valid.</p>
                  </div>

                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 relative">
                    <ShieldAlert className="h-4 w-4 text-amber-600 absolute top-3 right-3" />
                    <span className="text-[10px] text-amber-700 font-bold uppercase">DMARC Record</span>
                    <p className="font-bold text-xs text-amber-800">Action Needed</p>
                    <p className="text-[10px] text-amber-700/80">Policy set to 'none'. Move to 'quarantine'.</p>
                  </div>
                </div>
              </div>

              {/* Connection & Settings Section */}
              <div className="space-y-3">
                <h3 className="font-heading text-xs font-bold text-foreground uppercase tracking-wider">
                  Mailbox Configuration
                </h3>

                <div className="p-4 bg-card border border-border/60 rounded-xl space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border/40">
                    <span className="text-muted-foreground">Display Name</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName[selectedMailboxDetail.id] ?? ''}
                        onChange={(e) => setEditingName({ ...editingName, [selectedMailboxDetail.id]: e.target.value })}
                        className="h-8 px-2.5 rounded-md border border-border/80 bg-background text-xs"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSaveName(selectedMailboxDetail.id)}
                        disabled={savingNameId === selectedMailboxDetail.id}
                        className="h-8 text-xs font-bold bg-[#635bff] text-white"
                      >
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-border/40">
                    <span className="text-muted-foreground">Daily Volume Cap</span>
                    <span className="font-bold text-foreground font-mono">250 emails / day</span>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-muted-foreground">Last Volume Reset</span>
                    <span className="font-mono text-foreground">
                      {selectedMailboxDetail.last_reset ? new Date(selectedMailboxDetail.last_reset).toLocaleDateString() : 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Reputation & Warmup Score */}
              <div className="p-4 bg-[#635bff]/5 border border-[#635bff]/20 rounded-xl flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-[#635bff]" /> Deliverability Reputation Score
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Sender domain reputation is high with minimal bounce rates.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-heading text-2xl font-bold text-[#635bff]">98%</span>
                  <span className="block text-[10px] text-emerald-600 font-bold">Excellent</span>
                </div>
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-muted/30 border-t border-border/60 flex items-center justify-between">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(selectedMailboxDetail.id, selectedMailboxDetail.email)}
                className="h-9 text-xs font-bold gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Disconnect Mailbox
              </Button>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReset(selectedMailboxDetail.id)}
                  className="h-9 text-xs font-bold gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Reset Volume Counter
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleToggleStatus(selectedMailboxDetail.id, selectedMailboxDetail.status)}
                  className="h-9 text-xs font-bold bg-[#635bff] text-white hover:bg-[#493ee5]"
                >
                  {selectedMailboxDetail.status === 'active' ? 'Pause Mailbox' : 'Resume Mailbox'}
                </Button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </AppShell>
  );
}
