import React, { useState, useEffect } from 'react';
import { api, type Account } from '../api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Mail, Send, Sparkles, CheckCircle2, AlertCircle, RefreshCw, 
  User, Building, Globe, ChevronDown, ChevronUp, Eye, ShieldCheck,
  Check, Dice5, HelpCircle, ExternalLink, Inbox
} from 'lucide-react';

export interface SendTestEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'template' | 'campaign';
  templateId?: number;
  campaignId?: number;
  stepNumber?: number;
  subject?: string;
  bodyHtml?: string;
  bodyPlain?: string;
  accounts?: Account[];
  campaignName?: string;
  templateName?: string;
  initialVariables?: Record<string, string>;
}

const DEFAULT_SAMPLE_VARS: Record<string, string> = {
  first_name: 'Alex',
  last_name: 'Rivera',
  company_name: 'Starlight Apparel',
  store_name: 'Starlight Apparel',
  niche: 'Fashion & Apparel',
  website: 'starlightapparel.com',
  job_title: 'Head of Growth',
  my_name: 'Gabriel',
  brand: 'Peak Outreach'
};

// Client-side quick spintax resolver for real-time live preview
function parseSpintaxClient(text: string): string {
  if (!text) return '';
  let result = text;
  let matches = result.match(/\{([^{}]+)\}/g);
  let iterations = 0;
  while (matches && matches.length > 0 && iterations < 10) {
    for (const match of matches) {
      if (match.includes('|')) {
        const inner = match.slice(1, -1);
        const options = inner.split('|');
        const chosen = options[Math.floor(Math.random() * options.length)];
        result = result.replace(match, chosen);
      }
    }
    matches = result.match(/\{([^{}]+)\}/g);
    iterations++;
  }
  return result;
}

function renderVariablesClient(text: string, vars: Record<string, string>, senderName: string): string {
  if (!text) return '';
  let result = parseSpintaxClient(text);
  
  const allVars = { ...DEFAULT_SAMPLE_VARS, ...vars, sender: senderName, from_name: senderName, my_name: senderName };
  
  // Replace {{var}}
  result = result.replace(/\{\{([^{}]+)\}\}/g, (_, key) => {
    const norm = key.trim().toLowerCase();
    return allVars[norm] || allVars[key.trim()] || `[${key.trim()}]`;
  });

  // Replace {var} without pipe
  result = result.replace(/\{([a-zA-Z0-9_\-\s]+)\}/g, (_, key) => {
    const norm = key.trim().toLowerCase();
    return allVars[norm] || allVars[key.trim()] || `[${key.trim()}]`;
  });

  return result;
}

export function SendTestEmailModal({
  isOpen,
  onClose,
  type,
  templateId,
  campaignId,
  stepNumber,
  subject = '',
  bodyHtml = '',
  bodyPlain = '',
  accounts: propAccounts,
  campaignName,
  templateName,
  initialVariables = {}
}: SendTestEmailModalProps) {
  const [recipient, setRecipient] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [variables, setVariables] = useState<Record<string, string>>({ ...DEFAULT_SAMPLE_VARS, ...initialVariables });
  const [showVarEditor, setShowVarEditor] = useState<boolean>(false);
  const [previewTab, setPreviewTab] = useState<'visual' | 'variables'>('visual');
  const [spinKey, setSpinKey] = useState<number>(0);
  const [lastResult, setLastResult] = useState<{
    sender: string;
    recipient: string;
    subject: string;
    sent_at: string;
  } | null>(null);

  // Load remembered recipient or current user email
  useEffect(() => {
    if (isOpen) {
      setLastResult(null);
      const savedEmail = localStorage.getItem('peak_last_test_email');
      if (savedEmail) {
        setRecipient(savedEmail);
      } else {
        api.getCurrentUser().then(user => {
          if (user?.email) {
            setRecipient(user.email);
          }
        }).catch(() => {});
      }

      // Load connected accounts if not passed
      if (propAccounts && propAccounts.length > 0) {
        setAccounts(propAccounts);
        const activeOne = propAccounts.find(a => a.status === 'active') || propAccounts[0];
        if (activeOne) setSelectedAccountId(activeOne.id);
      } else {
        setLoadingAccounts(true);
        api.getAccounts().then(accList => {
          setAccounts(accList || []);
          const activeOne = accList.find(a => a.status === 'active') || accList[0];
          if (activeOne) setSelectedAccountId(activeOne.id);
        }).catch(() => {}).finally(() => setLoadingAccounts(false));
      }
    }
  }, [isOpen, propAccounts]);

  const activeAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
  const senderDisplayName = activeAccount?.display_name || activeAccount?.email || 'Sender';

  const previewSubject = renderVariablesClient(subject, variables, senderDisplayName);
  const previewBody = renderVariablesClient(bodyHtml || bodyPlain, variables, senderDisplayName);

  const handleReSpin = () => {
    setSpinKey(prev => prev + 1);
    toast({ title: 'Randomized Preview', description: 'Re-evaluated spintax variations and sample tags.' });
  };

  const handleSendTest = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!recipient.trim() || !recipient.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Valid Recipient Required',
        description: 'Please enter a valid destination email address for testing.'
      });
      return;
    }

    setSending(true);
    setLastResult(null);

    // Save test recipient to localStorage for convenience
    try {
      localStorage.setItem('peak_last_test_email', recipient.trim());
    } catch (error) { void error; }

    try {
      let res;
      if (type === 'template') {
        res = await api.sendTemplateTestEmail({
          template_id: templateId,
          subject: subject.trim() || undefined,
          body_html: bodyHtml || undefined,
          body_plain: bodyPlain || undefined,
          to: recipient.trim(),
          account_id: selectedAccountId,
          variables
        });
      } else {
        res = await api.sendCampaignTestEmail({
          campaign_id: campaignId,
          subject: subject.trim() || undefined,
          body_html: bodyHtml || undefined,
          body_plain: bodyPlain || undefined,
          to: recipient.trim(),
          account_id: selectedAccountId,
          step_number: stepNumber,
          variables
        });
      }

      if (res && res.success) {
        setLastResult({
          sender: res.sender,
          recipient: res.recipient,
          subject: res.subject,
          sent_at: res.sent_at || new Date().toLocaleTimeString()
        });
        toast({
          title: 'Test Email Delivered!',
          description: `Dispatched live test email to ${res.recipient} via ${res.sender}.`
        });
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Delivery Failed',
        description: err.message || 'Could not send test email. Please verify connected sender status.'
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="shrink-0 border-b border-border/60 pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <div className="h-8 w-8 rounded-lg bg-[#635bff]/10 text-[#635bff] flex items-center justify-center">
                <Send className="h-4 w-4" />
              </div>
              <span>Deliverability &amp; Content Test Send</span>
            </DialogTitle>
            <Badge variant="outline" className="text-[10px] font-bold border-[#635bff]/30 text-[#635bff] uppercase">
              {type === 'template' ? 'Template Mode' : 'Campaign Mode'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Dispatch a live single-recipient test email to verify SPF/DKIM compliance, personalization tags, and spam score.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Target Email & Sender Account Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-muted/20 p-3.5 rounded-xl border border-border/60">
            {/* Recipient Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Test Recipient Address</span>
                <span className="text-[10px] text-muted-foreground font-mono">Your test inbox</span>
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5" />
                <Input
                  type="email"
                  placeholder="e.g. you@company.com or seed box"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background border-border/70 font-mono"
                />
              </div>
            </div>

            {/* Sender Account Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Dispatch From Sender</span>
                {loadingAccounts && <RefreshCw className="h-3 w-3 animate-spin text-[#635bff]" />}
              </label>
              <select
                value={selectedAccountId || ''}
                onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                className="w-full h-9 rounded-md border border-border/70 bg-background px-3 text-xs focus:ring-1 focus:ring-[#635bff] font-medium"
              >
                {accounts.length === 0 ? (
                  <option value="">No sender accounts found</option>
                ) : (
                  accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.email} {acc.display_name ? `(${acc.display_name})` : ''} — {acc.type === 'smtp' ? 'SMTP' : 'Gmail API'}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Quick Deliverability Chips */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground overflow-x-auto pb-1">
            <span className="font-semibold text-foreground shrink-0">Test Destinations:</span>
            <button
              type="button"
              onClick={() => {
                api.getCurrentUser().then(u => {
                  if (u?.email) setRecipient(u.email);
                });
              }}
              className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground text-[10px] font-mono shrink-0 transition-colors"
            >
              My Account
            </button>
            <button
              type="button"
              onClick={() => setRecipient('test@mail-tester.com')}
              className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground text-[10px] font-mono shrink-0 transition-colors"
            >
              mail-tester.com
            </button>
          </div>

          {/* Rendered Live Email Preview */}
          <div className="space-y-2 border border-border/60 rounded-xl bg-card overflow-hidden shadow-2xs">
            <div className="bg-muted/30 px-3.5 py-2 border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-3.5 w-3.5 text-[#635bff]" />
                <span className="text-xs font-bold text-foreground">Rendered Dispatch Preview</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReSpin}
                  className="px-2 py-1 rounded text-[10px] font-bold bg-[#635bff]/10 text-[#635bff] hover:bg-[#635bff]/20 flex items-center gap-1 transition-colors"
                  title="Randomize Spintax and re-render"
                >
                  <Dice5 className="h-3 w-3" /> Spin Variations
                </button>
                <button
                  type="button"
                  onClick={() => setShowVarEditor(!showVarEditor)}
                  className="px-2 py-1 rounded text-[10px] font-bold bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <span>Sample Variables</span>
                  {showVarEditor ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
            </div>

            {/* Collapsible Sample Variables Editor */}
            {showVarEditor && (
              <div className="p-3 bg-muted/10 border-b border-border/40 space-y-2 animate-in fade-in duration-150">
                <p className="text-[11px] text-muted-foreground">
                  Customize sample variable values used to render tags like <code className="bg-muted px-1 rounded text-[10px] font-mono text-[#635bff]">&#123;&#123;first_name&#125;&#125;</code> and <code className="bg-muted px-1 rounded text-[10px] font-mono text-[#635bff]">&#123;&#123;store_name&#125;&#125;</code>:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground">first_name</label>
                    <Input
                      value={variables.first_name || ''}
                      onChange={(e) => setVariables({ ...variables, first_name: e.target.value })}
                      className="h-7 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground">company_name</label>
                    <Input
                      value={variables.company_name || ''}
                      onChange={(e) => setVariables({ ...variables, company_name: e.target.value })}
                      className="h-7 text-xs bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground">store_name</label>
                    <Input
                      value={variables.store_name || ''}
                      onChange={(e) => setVariables({ ...variables, store_name: e.target.value })}
                      className="h-7 text-xs bg-background"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Subject Preview */}
            <div className="px-3.5 py-2 border-b border-border/40 bg-muted/10 text-xs">
              <span className="font-bold text-muted-foreground mr-2 text-[10px] uppercase tracking-wider">Subject:</span>
              <span className="font-mono text-foreground font-semibold">
                {previewSubject || '<Empty Subject>'}
              </span>
            </div>

            {/* Body Preview */}
            <div className="p-4 bg-white text-slate-900 min-h-[140px] max-h-[220px] overflow-y-auto text-sm leading-relaxed font-sans">
              <div 
                key={spinKey}
                dangerouslySetInnerHTML={{ 
                  __html: previewBody || '<p style="color:#94a3b8;font-style:italic">No body content defined yet.</p>' 
                }} 
              />
            </div>
          </div>

          {/* Success Banner if Sent */}
          {lastResult && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-start gap-3 text-xs animate-in fade-in duration-200">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
                  <span>Test Email Sent Successfully</span>
                  <span className="font-mono text-[10px] text-muted-foreground font-normal">{lastResult.sent_at}</span>
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Dispatched to <strong className="text-foreground font-mono">{lastResult.recipient}</strong> from <strong className="text-foreground font-mono">{lastResult.sender}</strong>.
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  Check your target inbox (and spam folder) to inspect formatting, link tracking, and sender authentication.
                </p>
              </div>
            </div>
          )}

          {/* Deliverability Guidance Note */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 flex items-start gap-2.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-[#635bff] shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="text-foreground">Deliverability Best Practice:</strong> Check that the test email lands in the Primary tab, contains no broken variables, and displays cleanly on both mobile and desktop before launching to your full contact list.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/60 shrink-0">
          <div className="text-[11px] text-muted-foreground font-mono w-full sm:w-auto text-left">
            Sender: <strong className="text-foreground">{activeAccount?.email || 'None'}</strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs font-bold border-border/60"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => handleSendTest()}
              disabled={sending || accounts.length === 0}
              className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2 shadow-sm"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {sending ? 'Sending Test Email...' : 'Send Live Test Email'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
