import React, { useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { useUI } from '@/context/UIContext';
import { 
  CreditCard, Download, Edit, Lock, Bell, Shield, User, Sparkles, 
  AlertTriangle, Plus, Save, Building, Mail, FileText, Globe, Clock, 
  Key, Check, CheckCircle2, RefreshCw, ChevronRight, Laptop, Smartphone,
  Zap, ArrowUpRight, Sun, Moon, Keyboard, BatteryCharging, ZapOff
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Pending';
}

const INITIAL_INVOICES: Invoice[] = [
  { id: 'INV-2023-009', date: 'Sep 15, 2023', amount: '$49.00', status: 'Paid' },
  { id: 'INV-2023-008', date: 'Aug 15, 2023', amount: '$49.00', status: 'Paid' },
  { id: 'INV-2023-007', date: 'Jul 15, 2023', amount: '$49.00', status: 'Paid' },
  { id: 'INV-2023-006', date: 'Jun 15, 2023', amount: '$49.00', status: 'Paid' },
];

export default function Settings() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const { batterySaver, toggleBatterySaver } = useUI();
  const [activeTab, setActiveTab] = useState<'billing' | 'general' | 'security' | 'notifications'>('general');

  // General state
  const [workspaceName, setWorkspaceName] = useState('OutreachFlow Pro');
  const [defaultSenderName, setDefaultSenderName] = useState('Alex Miller');
  const [defaultSenderEmail, setDefaultSenderEmail] = useState('alex@acmecorp.com');
  const [timezone, setTimezone] = useState('America/New_York (UTC-5)');
  const [language, setLanguage] = useState('English (US)');

  // Billing & Payment Details state
  const [companyName, setCompanyName] = useState('Acme Corp Ltd.');
  const [billingEmail, setBillingEmail] = useState('billing@acmecorp.com');
  const [taxId, setTaxId] = useState('GB123456789');
  const [editBillingOpen, setEditBillingOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);

  // Card details form
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4421');
  const [cardExpiry, setCardExpiry] = useState('12/25');
  const [cardCvc, setCardCvc] = useState('•••');
  const [cardHolder, setCardHolder] = useState('Alex Miller');

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);

  // Notification state
  const [notifyLowQuota, setNotifyLowQuota] = useState(true);
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(true);
  const [notifyCampaignComplete, setNotifyCampaignComplete] = useState(true);
  const [notifyBounceWarning, setNotifyBounceWarning] = useState(true);

  // Handlers
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: 'General Settings Saved',
      description: 'Your workspace preferences have been updated successfully.'
    });
  };

  const handleSaveBillingDetails = () => {
    setEditBillingOpen(false);
    toast({
      title: 'Billing Details Updated',
      description: 'Company information and VAT ID saved.'
    });
  };

  const handleAddPaymentMethod = () => {
    setAddPaymentOpen(false);
    toast({
      title: 'Payment Method Added',
      description: 'Primary billing card successfully updated.'
    });
  };

  const handleDownloadInvoice = (inv: Invoice) => {
    toast({
      title: `Downloading ${inv.id}`,
      description: `PDF receipt for ${inv.amount} (${inv.date}) is ready.`
    });
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords Do Not Match',
        description: 'Please ensure your new password and confirmation match.'
      });
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast({
      title: 'Password Updated',
      description: 'Your account password has been changed.'
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: 'Notification Preferences Saved',
      description: 'Alert and email preferences updated.'
    });
  };

  return (
    <AppShell>
      <SEO
        title="Workspace Settings & Billing | OutreachFlow"
        description="Manage workspace preferences, subscription plans, usage quotas, invoice history, security, and team notifications."
      />

      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Settings
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your workspace preferences and billing details.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Pro Workspace Active
            </span>
          </div>
        </header>

        {/* Tab Navigation Bar */}
        <div className="border-b border-border/60 flex overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === 'general'
                ? 'border-[#635bff] text-[#635bff]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === 'billing'
                ? 'border-[#635bff] text-[#635bff]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Billing &amp; Plans
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === 'security'
                ? 'border-[#635bff] text-[#635bff]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === 'notifications'
                ? 'border-[#635bff] text-[#635bff]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Notifications
          </button>
        </div>

        {/* TAB 1: GENERAL */}
        {activeTab === 'general' && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-5">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <Building className="h-4 w-4 text-[#635bff]" /> Workspace Identity
              </h3>

              <form onSubmit={handleSaveGeneral} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Workspace Name</label>
                  <Input
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    className="h-10 text-xs bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Default Sender Name</label>
                    <Input
                      value={defaultSenderName}
                      onChange={(e) => setDefaultSenderName(e.target.value)}
                      className="h-10 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Default Sender Email</label>
                    <Input
                      type="email"
                      value={defaultSenderEmail}
                      onChange={(e) => setDefaultSenderEmail(e.target.value)}
                      className="h-10 text-xs bg-background"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" /> Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border/60 bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff]"
                    >
                      <option value="America/New_York (UTC-5)">Eastern Time (US &amp; Canada)</option>
                      <option value="America/Chicago (UTC-6)">Central Time (US &amp; Canada)</option>
                      <option value="America/Los_Angeles (UTC-8)">Pacific Time (US &amp; Canada)</option>
                      <option value="Europe/London (UTC+0)">London (GMT / UTC)</option>
                      <option value="Europe/Paris (UTC+1)">Paris, Berlin, Madrid</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Default Language
                    </label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border/60 bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff]"
                    >
                      <option value="English (US)">English (US)</option>
                      <option value="English (UK)">English (UK)</option>
                      <option value="Spanish">Spanish</option>
                      <option value="German">German</option>
                      <option value="French">French</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                  >
                    <Save className="h-4 w-4" /> Save Workspace Settings
                  </Button>
                </div>
              </form>
            </div>

            {/* Appearance & Theme Switcher Card */}
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                    <Sun className="h-4 w-4 text-[#635bff]" /> Appearance &amp; Color Theme
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Toggle your visual mode. Your selection is automatically saved in <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground">localStorage</code>.
                  </p>
                </div>
                <Badge className="bg-[#635bff]/10 text-[#635bff] border-[#635bff]/20 font-mono text-[10px] uppercase font-bold">
                  Current: {theme.toUpperCase()} MODE
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {/* Light Mode Button */}
                <button
                  type="button"
                  onClick={() => {
                    setTheme('light');
                    toast({ title: '☀️ Light Mode Active', description: 'Appearance saved to localStorage.' });
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    theme === 'light'
                      ? 'border-[#635bff] bg-[#635bff]/5 ring-2 ring-[#635bff]/20 shadow-xs'
                      : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${theme === 'light' ? 'bg-[#635bff] text-white' : 'bg-muted text-muted-foreground'}`}>
                    <Sun className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      Light Mode
                      {theme === 'light' && <Check className="h-3.5 w-3.5 text-[#635bff]" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Clean high-contrast daytime interface</p>
                  </div>
                </button>

                {/* Dark Mode Button */}
                <button
                  type="button"
                  onClick={() => {
                    setTheme('dark');
                    toast({ title: '🌙 Dark Mode Active', description: 'Appearance saved to localStorage.' });
                  }}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                    theme === 'dark'
                      ? 'border-[#635bff] bg-[#635bff]/5 ring-2 ring-[#635bff]/20 shadow-xs'
                      : 'border-border/60 bg-muted/20 hover:border-border hover:bg-muted/40'
                  }`}
                >
                  <div className={`p-2.5 rounded-lg shrink-0 ${theme === 'dark' ? 'bg-[#635bff] text-white' : 'bg-muted text-muted-foreground'}`}>
                    <Moon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground flex items-center gap-1.5">
                      Dark Mode
                      {theme === 'dark' && <Check className="h-3.5 w-3.5 text-[#635bff]" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Low-glare dark luxury console</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Battery Saver & Performance Optimization Card */}
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                    <BatteryCharging className="h-4 w-4 text-amber-500" /> Battery Saver Mode
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reduces UI animations, CSS transitions, and throttles background email sync polling to extend battery life on mobile devices.
                  </p>
                </div>
                <Badge className={batterySaver ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-mono text-[10px] uppercase font-bold" : "bg-muted text-muted-foreground border-border font-mono text-[10px] uppercase font-bold"}>
                  {batterySaver ? 'ACTIVE' : 'OFF'}
                </Badge>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg shrink-0 ${batterySaver ? 'bg-amber-500 text-slate-950' : 'bg-muted text-muted-foreground'}`}>
                    {batterySaver ? <ZapOff className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-foreground">
                      Power Optimization &amp; Reduced Motion
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {batterySaver
                        ? 'Animations disabled • Slowed background sync polling (60s)'
                        : 'Full smooth 60fps animations • High-frequency background sync (10s)'}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant={batterySaver ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    toggleBatterySaver();
                    toast({
                      title: !batterySaver ? '⚡ Battery Saver Enabled' : '🔋 Standard Performance Restored',
                      description: !batterySaver
                        ? 'UI animations reduced and background email sync rate throttled.'
                        : 'Restored standard animations and high-frequency sync.',
                    });
                  }}
                  className={`h-9 px-4 text-xs font-bold shrink-0 ${
                    batterySaver ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold border-none' : ''
                  }`}
                >
                  {batterySaver ? 'Disable Battery Saver' : 'Enable Battery Saver'}
                </Button>
              </div>
            </div>

            {/* Keyboard Shortcuts Card */}
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-3">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-[#635bff]" /> Power User Keyboard Shortcuts
              </h3>
              <p className="text-xs text-muted-foreground">
                Navigate the platform effortlessly with built-in global hotkeys:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-muted-foreground font-medium">Dashboard</span>
                  <kbd className="px-2 py-0.5 rounded bg-card border border-border text-[10px] font-mono font-bold text-[#635bff]">Alt + D or g d</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-muted-foreground font-medium">Campaigns</span>
                  <kbd className="px-2 py-0.5 rounded bg-card border border-border text-[10px] font-mono font-bold text-[#635bff]">Alt + C or g c</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-muted-foreground font-medium">Inbox</span>
                  <kbd className="px-2 py-0.5 rounded bg-card border border-border text-[10px] font-mono font-bold text-[#635bff]">Alt + I or g i</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/40">
                  <span className="text-muted-foreground font-medium">Toggle Theme</span>
                  <kbd className="px-2 py-0.5 rounded bg-card border border-border text-[10px] font-mono font-bold text-[#635bff]">Alt + M</kbd>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BILLING & PLANS */}
        {activeTab === 'billing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Plan & Usage */}
            <div className="lg:col-span-2 space-y-6">
              {/* Current Plan Card */}
              <div className="bg-card border border-border/60 rounded-xl p-6 shadow-2xs space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="font-heading text-lg font-bold text-foreground">Pro Workspace</h2>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#635bff]/10 text-[#635bff] text-[11px] font-bold border border-[#635bff]/20">
                        Active
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Billed <strong className="text-foreground">$49.00</strong> monthly. Next billing date: <span className="font-mono text-foreground font-semibold">Oct 15, 2024</span>.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast({ title: 'Plan Management', description: 'Contact support to modify or downgrade subscription.' })}
                      className="h-9 px-3 text-xs font-bold border-border/60"
                    >
                      Cancel Plan
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => toast({ title: 'Enterprise Tier Upgrade', description: 'Directing to enterprise workspace custom plan selector.' })}
                      className="h-9 px-4 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white"
                    >
                      Upgrade Plan
                    </Button>
                  </div>
                </div>

                {/* Email Usage Progress Bar */}
                <div className="bg-muted/30 rounded-xl p-4 border border-border/50 space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="text-xs font-bold text-foreground block">Email Usage</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        45,000 / 50,000 sent this month
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#635bff] font-mono">90%</span>
                  </div>

                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <div className="bg-[#635bff] h-2.5 rounded-full transition-all duration-500" style={{ width: '90%' }}></div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Approaching monthly limit (90% capacity used)
                    </span>
                    <span className="text-muted-foreground font-mono">Limit resets in 12 days</span>
                  </div>
                </div>
              </div>

              {/* Recent Invoices Table */}
              <div className="bg-card border border-border/60 rounded-xl shadow-2xs overflow-hidden">
                <div className="p-4 border-b border-border/60 flex justify-between items-center bg-muted/20">
                  <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#635bff]" /> Recent Invoices
                  </h3>
                  <button
                    onClick={() => toast({ title: 'All Invoices', description: 'Showing complete 24-month invoice audit trail.' })}
                    className="text-xs font-bold text-[#635bff] hover:underline"
                  >
                    View All
                  </button>
                </div>

                <div className="divide-y divide-border/40">
                  {INITIAL_INVOICES.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors group text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground shrink-0 border border-border/50">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold font-mono text-foreground">{inv.id}</p>
                          <p className="text-[11px] text-muted-foreground">{inv.date}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold text-foreground">{inv.amount}</span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          {inv.status}
                        </span>
                        <button
                          onClick={() => handleDownloadInvoice(inv)}
                          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Payment Method & Billing Details */}
            <div className="space-y-6">
              {/* Payment Method Card */}
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-2xs space-y-4">
                <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#635bff]" /> Payment Method
                </h3>

                <div className="border border-border/60 rounded-xl p-3.5 flex items-center justify-between bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-8 bg-background rounded-md flex items-center justify-center border border-border/60 shadow-2xs shrink-0">
                      <div className="flex -space-x-1">
                        <div className="w-3.5 h-3.5 rounded-full bg-rose-500 opacity-90"></div>
                        <div className="w-3.5 h-3.5 rounded-full bg-amber-500 opacity-90"></div>
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-xs text-foreground">Mastercard ending in 4421</p>
                      <p className="text-[11px] text-muted-foreground font-mono">Expires 12/25</p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                </div>

                <Button
                  variant="outline"
                  onClick={() => setAddPaymentOpen(true)}
                  className="w-full h-9 text-xs font-bold border-border/60 hover:border-[#635bff] hover:text-[#635bff] gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Payment Method
                </Button>
              </div>

              {/* Billing Details Card */}
              <div className="bg-card border border-border/60 rounded-xl p-5 shadow-2xs space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-heading text-sm font-bold text-foreground">Billing Details</h3>
                  <button
                    onClick={() => setEditBillingOpen(true)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Company Name</p>
                    <p className="font-bold text-foreground">{companyName}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Billing Email</p>
                    <p className="font-mono text-foreground">{billingEmail}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Tax ID / VAT</p>
                    <p className="font-mono text-foreground">{taxId}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-6 max-w-3xl">
            {/* Password Management */}
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-5">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-[#635bff]" /> Change Password
              </h3>

              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Current Password</label>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-10 text-xs bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">New Password</label>
                    <Input
                      type="password"
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-10 text-xs bg-background"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Confirm New Password</label>
                    <Input
                      type="password"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-10 text-xs bg-background"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                >
                  <Save className="h-4 w-4" /> Update Password
                </Button>
              </form>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                    <Shield className="h-4 w-4 text-[#635bff]" /> Two-Factor Authentication (2FA)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Secure your account with TOTP authenticator apps (Google Authenticator, 1Password).
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={twoFactorEnabled}
                    onChange={(e) => {
                      setTwoFactorEnabled(e.target.checked);
                      toast({
                        title: e.target.checked ? '2FA Enabled' : '2FA Disabled',
                        description: e.target.checked ? 'Authenticator app verification required on login.' : 'Two-factor protection disabled.'
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#635bff]"></div>
                </label>
              </div>
            </div>

            {/* Active Sessions */}
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-4">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <Laptop className="h-4 w-4 text-[#635bff]" /> Active Login Sessions
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 text-xs">
                  <div className="flex items-center gap-3">
                    <Laptop className="h-4 w-4 text-[#635bff]" />
                    <div>
                      <p className="font-bold text-foreground">MacBook Pro — Chrome Browser</p>
                      <p className="text-[11px] text-muted-foreground font-mono">New York, US • Current Session</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[10px]">Active Now</Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20 text-xs">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-bold text-foreground">iPhone 15 — Mobile App</p>
                      <p className="text-[11px] text-muted-foreground font-mono">New York, US • 2 hours ago</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toast({ title: 'Session Revoked', description: 'iPhone 15 session terminated.' })}
                    className="h-7 text-[11px] text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                  >
                    Revoke
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-5">
              <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                <Bell className="h-4 w-4 text-[#635bff]" /> Email &amp; Workspace Alerts
              </h3>

              <div className="space-y-4 text-xs divide-y divide-border/40">
                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="font-bold text-foreground">Low Quota &amp; Usage Alerts</p>
                    <p className="text-muted-foreground">Receive warnings when email usage reaches 80% or 90% of limit.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyLowQuota}
                    onChange={(e) => setNotifyLowQuota(e.target.checked)}
                    className="h-4 w-4 rounded border-border/80 text-[#635bff] focus:ring-[#635bff]"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <p className="font-bold text-foreground">Daily Outreach Summary Digest</p>
                    <p className="text-muted-foreground">Get a daily morning email breakdown of opens, replies, and sends.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyDailyDigest}
                    onChange={(e) => setNotifyDailyDigest(e.target.checked)}
                    className="h-4 w-4 rounded border-border/80 text-[#635bff] focus:ring-[#635bff]"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <p className="font-bold text-foreground">Campaign Completion Notifications</p>
                    <p className="text-muted-foreground">Notify team when scheduled sequence batches finish sending.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyCampaignComplete}
                    onChange={(e) => setNotifyCampaignComplete(e.target.checked)}
                    className="h-4 w-4 rounded border-border/80 text-[#635bff] focus:ring-[#635bff]"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <div>
                    <p className="font-bold text-foreground">High Bounce Threshold Safeguard</p>
                    <p className="text-muted-foreground">Alert immediately if bounce rate exceeds 3% on any sending domain.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifyBounceWarning}
                    onChange={(e) => setNotifyBounceWarning(e.target.checked)}
                    className="h-4 w-4 rounded border-border/80 text-[#635bff] focus:ring-[#635bff]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={handleSaveNotifications}
                  className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                >
                  <Save className="h-4 w-4" /> Save Notification Preferences
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Billing Details Modal */}
      <Dialog open={editBillingOpen} onOpenChange={setEditBillingOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-bold text-foreground">Edit Billing Details</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Update details used on official PDF receipts and invoices.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Company Name</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-foreground">Billing Email</label>
              <Input
                type="email"
                value={billingEmail}
                onChange={(e) => setBillingEmail(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-foreground">Tax ID / VAT Number</label>
              <Input
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditBillingOpen(false)} className="h-9 text-xs font-bold">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveBillingDetails} className="h-9 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white">
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Method Modal */}
      <Dialog open={addPaymentOpen} onOpenChange={setAddPaymentOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-base font-bold text-foreground">Add Payment Card</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter payment method details for automatic monthly billing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-foreground">Cardholder Name</label>
              <Input
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-bold text-foreground">Card Number</label>
              <Input
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="h-9 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Expiry (MM/YY)</label>
                <Input
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">CVC / CVV</label>
                <Input
                  type="password"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  className="h-9 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddPaymentOpen(false)} className="h-9 text-xs font-bold">
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddPaymentMethod} className="h-9 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white">
              Save Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
