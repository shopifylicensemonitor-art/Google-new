import { useState, useEffect } from 'react';
import { api, type Domain, type Account } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { 
  Globe, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Copy, 
  ExternalLink, 
  Server, 
  Flame, 
  Layers, 
  X, 
  Lock,
  ArrowRight,
  Sparkles,
  Link as LinkIcon,
  Mail,
  Eye,
  EyeOff,
  Check,
  Zap,
  ChevronRight,
  Info
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface DomainsProps {
  requirePin?: (label: string, action: () => void) => void;
}

const SMTP_PRESETS = [
  { label: 'Google Workspace', host: 'smtp.gmail.com', port: 587, secure: false },
  { label: 'Microsoft 365 / Outlook', host: 'smtp.office365.com', port: 587, secure: false },
  { label: 'Zoho Mail', host: 'smtppro.zoho.com', port: 465, secure: true },
  { label: 'Namecheap Private Email', host: 'mail.privateemail.com', port: 465, secure: true },
  { label: 'Custom Domain Server (mail.domain.com)', host: 'custom', port: 587, secure: false },
];

export default function Domains({ requirePin }: DomainsProps) {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [verifyingId, setVerifyingId] = useState<number | null>(null);

  // Add Domain Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newDomain, setNewDomain] = useState<string>('');
  const [newTrackingDomain, setNewTrackingDomain] = useState<string>('');
  const [newSelector, setNewSelector] = useState<string>('peak');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Selected Domain Detail / DNS Instructions Modal
  const [selectedDomain, setSelectedDomain] = useState<Domain | null>(null);

  // Create Domain Mailbox Modal State
  const [showMailboxModal, setShowMailboxModal] = useState<boolean>(false);
  const [targetDomain, setTargetDomain] = useState<Domain | null>(null);
  const [mailboxPrefix, setMailboxPrefix] = useState<string>('outreach');
  const [mailboxDisplayName, setMailboxDisplayName] = useState<string>('');
  const [smtpPreset, setSmtpPreset] = useState<string>('Google Workspace');
  const [smtpHost, setSmtpHost] = useState<string>('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState<number>(587);
  const [smtpUser, setSmtpUser] = useState<string>('');
  const [smtpPass, setSmtpPass] = useState<string>('');
  const [smtpSecure, setSmtpSecure] = useState<boolean>(false);
  const [showSmtpPass, setShowSmtpPass] = useState<boolean>(false);
  const [creatingMailbox, setCreatingMailbox] = useState<boolean>(false);

  // Domain Mailboxes view state
  const [domainMailboxes, setDomainMailboxes] = useState<Record<number, Account[]>>({});
  const [loadingMailboxes, setLoadingMailboxes] = useState<Record<number, boolean>>({});

  const loadDomains = async () => {
    setLoading(true);
    try {
      const res = await api.getDomains();
      const domainList = res.domains || [];
      setDomains(domainList);

      // Load mailboxes for each domain
      domainList.forEach(d => {
        loadMailboxesForDomain(d.id);
      });
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading domains',
        description: e.message || 'Could not fetch domain list.'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMailboxesForDomain = async (domainId: number) => {
    setLoadingMailboxes(prev => ({ ...prev, [domainId]: true }));
    try {
      const res = await api.getDomainMailboxes(domainId);
      setDomainMailboxes(prev => ({ ...prev, [domainId]: res.mailboxes || [] }));
    } catch (_) {}
    finally {
      setLoadingMailboxes(prev => ({ ...prev, [domainId]: false }));
    }
  };

  useEffect(() => {
    loadDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;

    const action = async () => {
      try {
        setSubmitting(true);
        const res = await api.createDomain({
          domain: newDomain.trim(),
          custom_tracking_domain: newTrackingDomain.trim() || undefined,
          dkim_selector: newSelector.trim() || 'peak',
        });
        toast({
          title: 'Domain Registered & DKIM Generated!',
          description: `Configured 2048-bit RSA keys for ${res.domain}. Add DNS records to activate.`
        });
        setShowAddModal(false);
        setNewDomain('');
        setNewTrackingDomain('');
        loadDomains();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error adding domain',
          description: e.message
        });
      } finally {
        setSubmitting(false);
      }
    };

    if (requirePin) {
      requirePin('add sender domain', action);
    } else {
      action();
    }
  };

  const handleVerifyDns = async (id: number, domainName: string) => {
    try {
      setVerifyingId(id);
      const res = await api.verifyDomain(id);
      if (res.is_fully_verified) {
        toast({
          title: 'Domain 100% Verified!',
          description: `SPF, DKIM, and DMARC for ${domainName} are active. Ready for high-deliverability sending.`
        });
      } else {
        toast({
          title: `DNS Status: ${res.status.toUpperCase()}`,
          description: 'Some DNS records are propagating. UDP and DoH resolvers will refresh automatically.'
        });
      }
      loadDomains();
      if (selectedDomain?.id === id) {
        const updated = await api.getDomains();
        const match = updated.domains.find(d => d.id === id);
        if (match) setSelectedDomain(match);
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'DNS Verification Failed',
        description: e.message
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteDomain = (id: number, domainName: string) => {
    const action = async () => {
      if (!window.confirm(`Delete domain "${domainName}" and remove its DKIM keys?`)) return;
      try {
        await api.deleteDomain(id);
        toast({
          title: 'Domain Removed',
          description: `${domainName} has been deleted.`
        });
        if (selectedDomain?.id === id) setSelectedDomain(null);
        loadDomains();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error deleting domain',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('remove sender domain', action);
    } else {
      action();
    }
  };

  const handleOpenCreateMailbox = (domain: Domain) => {
    setTargetDomain(domain);
    setMailboxPrefix('outreach');
    setMailboxDisplayName('');
    setSmtpPreset('Google Workspace');
    setSmtpHost('smtp.gmail.com');
    setSmtpPort(587);
    setSmtpSecure(false);
    setSmtpUser(`outreach@${domain.domain}`);
    setSmtpPass('');
    setShowMailboxModal(true);
  };

  const handlePresetChange = (presetLabel: string, currentDomain: string) => {
    setSmtpPreset(presetLabel);
    const found = SMTP_PRESETS.find(p => p.label === presetLabel);
    if (found) {
      if (found.host === 'custom') {
        setSmtpHost(`mail.${currentDomain}`);
      } else {
        setSmtpHost(found.host);
      }
      setSmtpPort(found.port);
      setSmtpSecure(found.secure);
    }
  };

  const handleCreateDomainMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDomain) return;

    const action = async () => {
      setCreatingMailbox(true);
      try {
        const fullEmail = `${mailboxPrefix.trim()}@${targetDomain.domain}`;
        const res = await api.createDomainMailbox(targetDomain.id, {
          email_prefix: mailboxPrefix.trim(),
          smtp_host: smtpHost.trim(),
          smtp_port: smtpPort,
          smtp_user: smtpUser.trim() || fullEmail,
          smtp_pass: smtpPass,
          smtp_secure: smtpSecure,
          display_name: mailboxDisplayName.trim() || undefined
        });

        if (res.success) {
          toast({
            title: 'Domain Mailbox Linked!',
            description: `${res.email} verified and added to your sending rotation.`
          });
          setShowMailboxModal(false);
          loadMailboxesForDomain(targetDomain.id);
        }
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Mailbox Creation Failed',
          description: err.message || 'Could not verify SMTP connection.'
        });
      } finally {
        setCreatingMailbox(false);
      }
    };

    if (requirePin) {
      requirePin('create domain mailbox', action);
    } else {
      action();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to Clipboard',
      description: `${label} copied.`
    });
  };

  return (
    <AppShell title="Sender Domains & EMSP Infrastructure">
      <SEO
        title="Custom Sender Domains & EMSP DNS — Peak Xender"
        description="Configure authenticated custom sender domains with automated 2048-bit DKIM keypairs, live SPF/DMARC verification, and branded custom tracking domains."
      />

      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Globe className="h-6 w-6 text-[#635bff]" /> Sender Domains &amp; DNS Management
              </h1>
              <Badge variant="outline" className="bg-[#635bff]/10 text-[#635bff] border-[#635bff]/30">
                EMSP Mode
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Add your outbound domains, configure 2048-bit DKIM keys, SPF, DMARC, custom tracking, and provision domain mailboxes for 100% primary inbox deliverability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="bg-[#635bff] hover:bg-[#493ee5] text-white font-bold text-xs gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Sender Domain
            </Button>
          </div>
        </div>

        {/* Domains List */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#635bff]" />
            Loading sender domains...
          </div>
        ) : domains.length === 0 ? (
          <div className="bg-card rounded-xl border border-border/60 p-12 text-center space-y-4">
            <Globe className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <div className="space-y-1 max-w-md mx-auto">
              <h3 className="font-heading font-bold text-base text-foreground">No custom domains connected yet</h3>
              <p className="text-xs text-muted-foreground">
                Connect your business domain (e.g. <code>outreach.company.com</code>) to generate dedicated 2048-bit DKIM signatures and create custom domain mailboxes.
              </p>
            </div>
            <Button
              onClick={() => setShowAddModal(true)}
              className="bg-[#635bff] hover:bg-[#493ee5] text-white font-bold text-xs gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add Your First Domain
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {domains.map((d) => {
              const isVerified = d.status === 'verified';
              const mailboxes = domainMailboxes[d.id] || [];

              return (
                <div
                  key={d.id}
                  className="bg-card rounded-2xl border border-border/60 p-5 shadow-2xs hover:border-border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="h-8 w-8 rounded-lg bg-[#635bff]/15 text-[#635bff] flex items-center justify-center font-bold shrink-0">
                        <Globe className="h-4 w-4" />
                      </div>
                      <span className="font-heading font-bold text-base text-foreground truncate">{d.domain}</span>
                      
                      {isVerified ? (
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Fully Verified
                        </Badge>
                      ) : d.status === 'partial' ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px] font-bold gap-1">
                          <AlertTriangle className="h-3 w-3" /> Propagating (Partial)
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/30 text-[10px] font-bold gap-1">
                          <X className="h-3 w-3" /> DNS Pending
                        </Badge>
                      )}

                      <span className="text-xs text-muted-foreground font-mono bg-muted/40 px-2 py-0.5 rounded-md border border-border/40">
                        Selector: {d.dkim_selector || 'peak'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#635bff]" /> 2048-bit RSA DKIM
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono">
                        Tracking: {d.custom_tracking_domain || `track.${d.domain}`}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-semibold text-foreground">
                        <Mail className="h-3.5 w-3.5 text-blue-500" />
                        {mailboxes.length} {mailboxes.length === 1 ? 'Mailbox' : 'Mailboxes'} Linked
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleOpenCreateMailbox(d)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5 h-8"
                    >
                      <Mail className="h-3.5 w-3.5" /> Create Domain Email
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedDomain(d)}
                      className="text-xs font-semibold gap-1.5 border-border/60 h-8"
                    >
                      <Server className="h-3.5 w-3.5 text-[#635bff]" /> View DNS Records
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyDns(d.id, d.domain)}
                      disabled={verifyingId === d.id}
                      className="text-xs font-semibold gap-1.5 border-border/60 h-8"
                    >
                      <RefreshCw className={`h-3 w-3 ${verifyingId === d.id ? 'animate-spin text-[#635bff]' : ''}`} />
                      {verifyingId === d.id ? 'Checking...' : 'Check DNS'}
                    </Button>

                    <button
                      onClick={() => handleDeleteDomain(d.id, d.domain)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove Domain"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Domain Modal */}
        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Globe className="h-5 w-5 text-[#635bff]" /> Add Sender Domain
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Enter your domain name to generate automated 2048-bit RSA DKIM keys and DNS configuration instructions.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddDomain} className="space-y-4 py-3 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Domain Name*</label>
                <Input
                  placeholder="e.g. outreach.mycompany.com or mycompany.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  className="font-mono text-xs h-9"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">Custom Tracking Subdomain (Optional)</label>
                <Input
                  placeholder={`e.g. track.${newDomain.trim() || 'mycompany.com'}`}
                  value={newTrackingDomain}
                  onChange={(e) => setNewTrackingDomain(e.target.value)}
                  className="font-mono text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Branded link and pixel tracking CNAME.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-foreground">DKIM Selector</label>
                <Input
                  value={newSelector}
                  onChange={(e) => setNewSelector(e.target.value)}
                  className="font-mono text-xs h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Defaults to <code>peak</code> (creates <code>peak._domainkey.{newDomain.trim() || 'domain.com'}</code>).
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={submitting} className="bg-[#635bff] hover:bg-[#493ee5] text-white font-bold">
                  {submitting ? 'Generating 2048-bit DKIM...' : 'Register Domain'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Create Domain Mailbox Modal */}
        <Dialog open={showMailboxModal} onOpenChange={setShowMailboxModal}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                <Mail className="h-5 w-5 text-blue-600" /> Create &amp; Connect Domain Email
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Provision a mailbox on <strong>{targetDomain?.domain}</strong> and verify SMTP connection directly into your sending rotation pool.
              </DialogDescription>
            </DialogHeader>

            {targetDomain && (
              <form onSubmit={handleCreateDomainMailbox} className="space-y-4 py-3 text-xs">
                {/* Email address builder */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Mailbox Email Address*</label>
                  <div className="flex items-center gap-1.5">
                    <Input
                      placeholder="outreach"
                      value={mailboxPrefix}
                      onChange={(e) => {
                        const clean = e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, '');
                        setMailboxPrefix(clean);
                        setSmtpUser(`${clean}@${targetDomain.domain}`);
                      }}
                      className="font-mono text-xs h-9 flex-1"
                      required
                    />
                    <span className="font-mono text-xs font-bold text-muted-foreground bg-muted/60 px-3 py-2 rounded-lg border border-border/60">
                      @{targetDomain.domain}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Sender Display Name</label>
                  <Input
                    placeholder="e.g. Alex Rivera"
                    value={mailboxDisplayName}
                    onChange={(e) => setMailboxDisplayName(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                {/* Preset Provider Selector */}
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Mail Provider Preset</label>
                  <select
                    value={smtpPreset}
                    onChange={(e) => handlePresetChange(e.target.value, targetDomain.domain)}
                    className="w-full bg-background border border-border/80 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#635bff]"
                  >
                    {SMTP_PRESETS.map(p => (
                      <option key={p.label} value={p.label}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="font-bold text-foreground">SMTP Host</label>
                    <Input
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="font-mono text-xs h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-bold text-foreground">Port</label>
                    <Input
                      type="number"
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(parseInt(e.target.value) || 587)}
                      className="font-mono text-xs h-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">SMTP Username / Login</label>
                  <Input
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    className="font-mono text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">SMTP Password / App Password*</label>
                  <div className="relative flex items-center">
                    <Input
                      type={showSmtpPass ? 'text' : 'password'}
                      placeholder="Enter mailbox SMTP password..."
                      value={smtpPass}
                      onChange={(e) => setSmtpPass(e.target.value)}
                      className="font-mono text-xs h-9 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPass(!showSmtpPass)}
                      className="absolute right-2 p-1 text-muted-foreground hover:text-foreground"
                    >
                      {showSmtpPass ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowMailboxModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={creatingMailbox || !smtpPass}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-1.5"
                  >
                    {creatingMailbox ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    {creatingMailbox ? 'Verifying SMTP Handshake...' : 'Verify & Add Mailbox'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* DNS Instructions Modal */}
        {selectedDomain && (
          <Dialog open={Boolean(selectedDomain)} onOpenChange={() => setSelectedDomain(null)}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" /> DNS Instructions for {selectedDomain.domain}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Copy these DNS records to your DNS provider (Cloudflare, GoDaddy, Namecheap, Route 53, etc.).
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                {/* Record 1: SPF */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-[10px] font-bold">1. SPF Record (TXT)</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedDomain.spf_record || 'v=spf1 include:_spf.google.com ~all', 'SPF Value')}
                      className="h-6 text-[11px] gap-1 text-[#635bff]"
                    >
                      <Copy className="h-3 w-3" /> Copy Value
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div><strong>Host / Name:</strong> <code>@</code></div>
                    <div><strong>Type:</strong> <code>TXT</code></div>
                    <div><strong>TTL:</strong> <code>Auto / 3600</code></div>
                  </div>
                  <div className="p-2.5 rounded bg-muted/30 font-mono text-[11px] break-all border border-border/40">
                    {selectedDomain.spf_record || 'v=spf1 include:_spf.google.com ~all'}
                  </div>
                </div>

                {/* Record 2: DKIM */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-[10px] font-bold bg-[#635bff]/10 text-[#635bff] border-[#635bff]/30">
                      2. DKIM Key (TXT) — 2048-bit RSA
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedDomain.dkim_record, 'DKIM Value')}
                      className="h-6 text-[11px] gap-1 text-[#635bff]"
                    >
                      <Copy className="h-3 w-3" /> Copy Value
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div><strong>Host / Name:</strong> <code>{selectedDomain.dkim_selector || 'peak'}._domainkey</code></div>
                    <div><strong>Type:</strong> <code>TXT</code></div>
                    <div><strong>TTL:</strong> <code>Auto / 3600</code></div>
                  </div>
                  <div className="p-2.5 rounded bg-muted/30 font-mono text-[10px] break-all border border-border/40 max-h-24 overflow-y-auto">
                    {selectedDomain.dkim_record}
                  </div>
                </div>

                {/* Record 3: DMARC */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-[10px] font-bold">3. DMARC Policy (TXT)</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedDomain.dmarc_record || `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@${selectedDomain.domain}`, 'DMARC Value')}
                      className="h-6 text-[11px] gap-1 text-[#635bff]"
                    >
                      <Copy className="h-3 w-3" /> Copy Value
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div><strong>Host / Name:</strong> <code>_dmarc</code></div>
                    <div><strong>Type:</strong> <code>TXT</code></div>
                    <div><strong>TTL:</strong> <code>Auto / 3600</code></div>
                  </div>
                  <div className="p-2.5 rounded bg-muted/30 font-mono text-[11px] break-all border border-border/40">
                    {selectedDomain.dmarc_record || `v=DMARC1; p=quarantine; pct=100; rua=mailto:dmarc-reports@${selectedDomain.domain}`}
                  </div>
                </div>

                {/* Record 4: Custom Tracking Domain */}
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      4. Branded Tracking CNAME
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedDomain.tracking_target, 'CNAME Target')}
                      className="h-6 text-[11px] gap-1 text-[#635bff]"
                    >
                      <Copy className="h-3 w-3" /> Copy Target
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                    <div><strong>Host / Name:</strong> <code>{selectedDomain.tracking_host.replace(`.${selectedDomain.domain}`, '')}</code></div>
                    <div><strong>Type:</strong> <code>CNAME</code></div>
                    <div><strong>Target:</strong> <code>{selectedDomain.tracking_target}</code></div>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex justify-between items-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDomain(null)}
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleVerifyDns(selectedDomain.id, selectedDomain.domain)}
                  disabled={verifyingId === selectedDomain.id}
                  className="bg-[#635bff] hover:bg-[#534be5] text-white font-bold gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${verifyingId === selectedDomain.id ? 'animate-spin' : ''}`} />
                  {verifyingId === selectedDomain.id ? 'Checking Nameservers...' : 'Run Live DNS Verification'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppShell>
  );
}
