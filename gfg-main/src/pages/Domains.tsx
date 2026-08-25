import { useState, useEffect } from 'react';
import { api, type Domain } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Link as LinkIcon
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface DomainsProps {
  requirePin?: (label: string, action: () => void) => void;
}

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

  const loadDomains = async () => {
    setLoading(true);
    try {
      const res = await api.getDomains();
      setDomains(res.domains || []);
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
          title: 'Domain Added & DKIM Key Generated!',
          description: `Configured 2048-bit RSA keys for ${res.domain}. Add the DNS records to verify.`
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
          description: 'Some DNS records are not detected yet. DNS propagation can take 5-30 minutes.'
        });
      }
      loadDomains();
      if (selectedDomain?.id === id) {
        // Refresh detail modal
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
              Add your outbound domains, configure 2048-bit DKIM keys, SPF, DMARC, and custom tracking CNAMEs for 100% primary inbox deliverability.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadDomains}
              disabled={loading}
              className="text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="bg-[#635bff] hover:bg-[#534be5] text-white text-xs font-bold gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Sender Domain
            </Button>
          </div>
        </div>

        {/* Deliverability Education Banner */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-foreground">Why Authenticate Custom Domains?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Inbox providers (Google, Microsoft, Yahoo) require valid SPF, DKIM, and DMARC records. Authenticating your domains establishes domain reputation and eliminates spam flags.
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-none font-bold text-[11px] shrink-0">
            2048-bit RSA Enabled
          </Badge>
        </div>

        {/* Domain List Table */}
        <div className="bg-card rounded-xl border border-border/80 overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
            <h2 className="font-bold text-sm">Configured Sender Domains</h2>
            <span className="text-xs text-muted-foreground font-mono">{domains.length} Domains</span>
          </div>

          <div className="divide-y divide-border/40">
            {loading ? (
              <div className="p-12 text-center text-xs text-muted-foreground">
                <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#635bff]" />
                Checking domain DNS status...
              </div>
            ) : domains.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Globe className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <h3 className="font-bold text-sm">No Custom Domains Added</h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Add your sending domain to generate custom DKIM records and configure branded tracking URLs.
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#635bff] text-white font-bold text-xs"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Your First Domain
                </Button>
              </div>
            ) : (
              domains.map((dom) => {
                const isVerified = dom.status === 'verified';
                const isPartial = dom.status === 'partial';

                return (
                  <div
                    key={dom.id}
                    className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-foreground">{dom.domain}</span>
                        {isVerified ? (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Fully Authenticated
                          </Badge>
                        ) : isPartial ? (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Partial DNS Setup
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
                            Pending DNS
                          </Badge>
                        )}

                        {dom.tracking_status === 'verified' && (
                          <Badge variant="outline" className="bg-indigo-500/10 text-[#635bff] border-[#635bff]/30 text-[10px] font-bold">
                            <LinkIcon className="w-2.5 h-2.5 mr-1" /> Branded Tracking Active
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span>DKIM Selector: <code className="text-foreground">{dom.dkim_selector || 'peak'}</code></span>
                        <span>Tracking: <code className="text-foreground">{dom.custom_tracking_domain || `track.${dom.domain}`}</code></span>
                        <span>Added: {new Date(dom.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDomain(dom)}
                        className="text-xs font-bold"
                      >
                        View DNS Records
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleVerifyDns(dom.id, dom.domain)}
                        disabled={verifyingId === dom.id}
                        className="bg-[#635bff] hover:bg-[#534be5] text-white text-xs font-bold gap-1.5"
                      >
                        <RefreshCw className={`h-3 w-3 ${verifyingId === dom.id ? 'animate-spin' : ''}`} />
                        {verifyingId === dom.id ? 'Verifying...' : 'Verify DNS'}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteDomain(dom.id, dom.domain)}
                        className="text-muted-foreground hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Add Domain Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Globe className="h-5 w-5 text-[#635bff]" /> Add Sender Domain
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your root domain or subdomain. Peak Xender will generate a unique 2048-bit RSA DKIM keypair.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddDomain} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Sender Domain</label>
              <input
                required
                type="text"
                placeholder="outreach.company.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#635bff]"
              />
              <p className="text-[10px] text-muted-foreground">We recommend using a dedicated outreach subdomain like <code>outreach.company.com</code>.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Custom Tracking Subdomain (Optional)</label>
              <input
                type="text"
                placeholder="track.company.com"
                value={newTrackingDomain}
                onChange={(e) => setNewTrackingDomain(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#635bff]"
              />
              <p className="text-[10px] text-muted-foreground">Branded CNAME for opens and clicks tracking. Defaults to <code>track.domain.com</code>.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold">DKIM Selector</label>
              <input
                type="text"
                value={newSelector}
                onChange={(e) => setNewSelector(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#635bff]"
              />
              <p className="text-[10px] text-muted-foreground">Defaults to <code>peak</code> (creates <code>peak._domainkey.domain.com</code>).</p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-[#635bff] hover:bg-[#534be5] text-white font-bold">
                {submitting ? 'Generating DKIM...' : 'Generate DNS Records'}
              </Button>
            </DialogFooter>
          </form>
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
    </AppShell>
  );
}
