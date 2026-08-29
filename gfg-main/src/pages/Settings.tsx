import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useTheme } from '@/hooks/useTheme';
import { useUI } from '@/context/UIContext';
import { useKPITargets, DEFAULT_KPI_TARGETS } from '@/hooks/useKPITargets';
import { 
  CreditCard, Download, Edit, Lock, Bell, Shield, User, Sparkles, 
  AlertTriangle, Plus, Save, Building, Mail, FileText, Globe, Clock, 
  Key, Check, CheckCircle2, RefreshCw, ChevronRight, Laptop, Smartphone,
  Zap, ArrowUpRight, Sun, Moon, Keyboard, BatteryCharging, ZapOff,
  Target, TrendingUp, MailOpen, MousePointerClick, MessageSquare, ShieldAlert, RotateCcw,
  Eye, EyeOff
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: 'Paid' | 'Pending';
}

export default function Settings() {
  const { theme, setTheme, toggleTheme } = useTheme();
  const { batterySaver, toggleBatterySaver } = useUI();
  const [activeTab, setActiveTab] = useState<'profile' | 'billing' | 'general' | 'security' | 'notifications'>('profile');

  // User Profile state
  const [profileName, setProfileName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [profileRole, setProfileRole] = useState('user');
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // General state
  const [workspaceName, setWorkspaceName] = useState('Peak Console');
  const [defaultSenderName, setDefaultSenderName] = useState('');
  const [defaultSenderEmail, setDefaultSenderEmail] = useState('');
  const [timezone, setTimezone] = useState('America/New_York (UTC-5)');
  const [language, setLanguage] = useState('English (US)');

  // Billing & Payment Details state
  // KPI Targets & Benchmarks state
  const { targets: savedKpiTargets, updateTargets: updateKpiTargets, resetTargets: resetKpiTargets } = useKPITargets();
  const [kpiForm, setKpiForm] = useState(savedKpiTargets);

  useEffect(() => {
    setKpiForm(savedKpiTargets);
  }, [savedKpiTargets]);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [companyName, setCompanyName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [taxId, setTaxId] = useState('');
  const [editBillingOpen, setEditBillingOpen] = useState(false);
  const [addPaymentOpen, setAddPaymentOpen] = useState(false);

  // Card details form
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [cardHolder, setCardHolder] = useState('');

  // Security state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [authProvider, setAuthProvider] = useState<string>('email');
  const [hasPassword, setHasPassword] = useState<boolean>(true);
  const [requestingReset, setRequestingReset] = useState(false);
  const [resetRequested, setResetRequested] = useState(false);

  // Notification state
  const [notifyLowQuota, setNotifyLowQuota] = useState(true);
  const [notifyDailyDigest, setNotifyDailyDigest] = useState(true);
  const [notifyCampaignComplete, setNotifyCampaignComplete] = useState(true);
  const [notifyBounceWarning, setNotifyBounceWarning] = useState(true);

  // Load user profile on mount
  useEffect(() => {
    const loadProfile = async () => {
      setLoadingProfile(true);
      try {
        const user = await api.getCurrentUser();
        if (user) {
          setProfileName(user.name || '');
          setProfileEmail(user.email || '');
          setProfilePicture(user.picture || '');
          setProfileRole(user.role || 'user');
          if (user.name) setDefaultSenderName(user.name);
          if (user.email) {
            setDefaultSenderEmail(user.email);
            setBillingEmail(user.email);
          }
          setAuthProvider(user.auth_provider || 'email');
          setHasPassword(user.has_password !== false);
        }
      } catch (err: any) {
        console.warn('Could not load user profile', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  // Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Profile name cannot be empty.'
      });
      return;
    }
    setSavingProfile(true);
    try {
      await api.updateProfile(profileName.trim(), profilePicture.trim());
      toast({
        title: 'Profile Updated',
        description: 'Your user profile details have been saved successfully.'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Profile Update Failed',
        description: err.message || 'Could not save profile details.'
      });
    } finally {
      setSavingProfile(false);
    }
  };

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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({
        variant: 'destructive',
        title: 'Password Too Short',
        description: 'New password must be at least 8 characters long.'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords Do Not Match',
        description: 'Please ensure your new password and confirmation match.'
      });
      return;
    }
    setUpdatingPassword(true);
    try {
      await api.changePassword({
        currentPassword: currentPassword || undefined,
        newPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setHasPassword(true);
      setAuthProvider('both');
      toast({
        title: hasPassword ? 'Password Changed Successfully' : 'Password Created Successfully',
        description: hasPassword 
          ? 'Your account password has been updated.' 
          : 'You can now sign in using either Google or your email and password.'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: hasPassword ? 'Password Change Failed' : 'Password Creation Failed',
        description: err.message || 'Could not update password.'
      });
    } finally {
      setUpdatingPassword(false);
    }
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
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 text-xs font-bold whitespace-nowrap transition-all border-b-2 ${
              activeTab === 'profile'
                ? 'border-[#635bff] text-[#635bff]'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Profile &amp; Account
          </button>
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

        {/* TAB 0: PROFILE & ACCOUNT */}
        {activeTab === 'profile' && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4 text-[#635bff]" /> User Profile &amp; Identity
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Update your personal account credentials and display avatar.
                  </p>
                </div>
                <Badge className="bg-[#635bff]/10 text-[#635bff] border-[#635bff]/20 font-mono text-[10px] uppercase font-bold">
                  {profileRole.toUpperCase()}
                </Badge>
              </div>

              {loadingProfile ? (
                <div className="py-8 flex justify-center items-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin text-[#635bff]" /> Loading profile...
                </div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/50">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-[#635bff]/10 border-2 border-[#635bff]/30 flex items-center justify-center text-lg font-bold text-[#635bff] shrink-0">
                      {profilePicture ? (
                        <img src={profilePicture} alt={profileName} className="w-full h-full object-cover" />
                      ) : (
                        (profileName || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="space-y-1 text-center sm:text-left flex-1">
                      <div className="font-bold text-sm text-foreground">
                        {profileName || 'Account User'}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {profileEmail || 'user@peakxender.com'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Full Name / Display Name</label>
                    <Input
                      placeholder="e.g. Alex Miller"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="h-10 text-xs bg-background"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Account Email</label>
                    <Input
                      type="email"
                      value={profileEmail}
                      disabled
                      className="h-10 text-xs bg-muted/40 cursor-not-allowed opacity-80"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Primary sign-in email. Managed via authentication provider.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Avatar / Profile Picture URL</label>
                    <Input
                      placeholder="https://example.com/avatar.jpg"
                      value={profilePicture}
                      onChange={(e) => setProfilePicture(e.target.value)}
                      className="h-10 text-xs bg-background"
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={savingProfile}
                      className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                    >
                      {savingProfile ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      <span>{savingProfile ? 'Saving...' : 'Save Profile Details'}</span>
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

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

            {/* KPI Targets & Deliverability Benchmarks Card */}
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                    <Target className="h-4 w-4 text-[#635bff]" /> KPI Targets &amp; Performance Benchmarks
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Define your organization outreach targets, expected conversion benchmarks, and safety limits.
                  </p>
                </div>
                <Badge className="bg-[#635bff]/10 text-[#635bff] border-[#635bff]/20 font-mono text-[10px] uppercase font-bold">
                  {kpiForm.dailyGoal.toLocaleString()} EMAILS/DAY GOAL
                </Badge>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateKpiTargets(kpiForm);
                  toast({
                    title: '🎯 KPI Targets Saved',
                    description: 'Global outreach benchmarks and safety thresholds have been updated.',
                  });
                }}
                className="space-y-4"
              >
                {/* Daily Target */}
                <div className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-[#635bff]" /> Daily Sending Target (Emails / Day)
                    </label>
                    <span className="text-xs font-mono font-bold text-[#635bff]">
                      {kpiForm.dailyGoal.toLocaleString()} emails
                    </span>
                  </div>
                  <Input
                    type="number"
                    min="1"
                    max="50000"
                    value={kpiForm.dailyGoal || ''}
                    onChange={(e) => setKpiForm(prev => ({ ...prev, dailyGoal: parseInt(e.target.value, 10) || 0 }))}
                    className="h-10 text-xs bg-background font-mono"
                    required
                  />
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    <span className="text-[11px] text-muted-foreground mr-1">Quick Presets:</span>
                    {[100, 250, 500, 1000, 2500].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setKpiForm(prev => ({ ...prev, dailyGoal: val }))}
                        className={`text-[11px] px-2.5 py-0.5 rounded-md font-mono border transition-all ${
                          kpiForm.dailyGoal === val
                            ? 'bg-[#635bff] text-white border-[#635bff]'
                            : 'bg-background hover:bg-muted text-muted-foreground border-border/60'
                        }`}
                      >
                        {val.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversion Benchmarks */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MailOpen className="h-3.5 w-3.5 text-blue-500" /> Target Open %
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="1"
                        max="100"
                        value={kpiForm.targetOpenRate || ''}
                        onChange={(e) => setKpiForm(prev => ({ ...prev, targetOpenRate: parseFloat(e.target.value) || 0 }))}
                        className="h-9 text-xs bg-background font-mono pr-6"
                        required
                      />
                      <span className="absolute right-2 top-2 text-xs text-muted-foreground font-mono">%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Standard: 40–50%</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MousePointerClick className="h-3.5 w-3.5 text-amber-500" /> Target Click %
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="100"
                        value={kpiForm.targetClickRate || ''}
                        onChange={(e) => setKpiForm(prev => ({ ...prev, targetClickRate: parseFloat(e.target.value) || 0 }))}
                        className="h-9 text-xs bg-background font-mono pr-6"
                        required
                      />
                      <span className="absolute right-2 top-2 text-xs text-muted-foreground font-mono">%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Standard: 5–10%</p>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 text-purple-500" /> Target Reply %
                    </label>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="100"
                        value={kpiForm.targetReplyRate || ''}
                        onChange={(e) => setKpiForm(prev => ({ ...prev, targetReplyRate: parseFloat(e.target.value) || 0 }))}
                        className="h-9 text-xs bg-background font-mono pr-6"
                        required
                      />
                      <span className="absolute right-2 top-2 text-xs text-muted-foreground font-mono">%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Standard: 3–8%</p>
                  </div>
                </div>

                {/* Safety Bounce Limit */}
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <ShieldAlert className="h-4 w-4 text-rose-500" /> Max Allowed Bounce Rate (%)
                    </label>
                    <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400">
                      {kpiForm.maxBounceRate}% max limit
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="20"
                      value={kpiForm.maxBounceRate || ''}
                      onChange={(e) => setKpiForm(prev => ({ ...prev, maxBounceRate: parseFloat(e.target.value) || 0 }))}
                      className="h-9 text-xs bg-background font-mono pr-6 border-rose-500/30"
                      required
                    />
                    <span className="absolute right-3 top-2 text-xs text-muted-foreground font-mono">%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    If any active campaign or direct send batch exceeds this bounce rate, delivery alerts are triggered immediately.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      resetKpiTargets();
                      setKpiForm(DEFAULT_KPI_TARGETS);
                      toast({ title: 'Defaults Restored', description: 'Standard benchmark goals applied.' });
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Restore Default Benchmarks
                  </Button>

                  <Button
                    type="submit"
                    className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                  >
                    <Save className="h-4 w-4" /> Save KPI Targets
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
                  {invoices.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground flex flex-col items-center justify-center">
                      <FileText className="h-8 w-8 text-muted-foreground/40 mb-2" />
                      <p className="text-xs font-semibold text-foreground">No invoices yet</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Billing receipts and payment history will appear here.</p>
                    </div>
                  ) : (
                    invoices.map((inv) => (
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
                    ))
                  )}
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
                <Lock className="h-4 w-4 text-[#635bff]" />
                {hasPassword ? 'Change Password' : 'Add Password to Account'}
              </h3>

              {/* Google-only users without a password: show direct password creator + email reset option */}
              {(authProvider === 'google' && !hasPassword) ? (
                <div className="space-y-5">
                  <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-4 flex items-start gap-3">
                    <Key className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-foreground">Add Password to your Google Account</p>
                      <p className="text-xs text-muted-foreground">
                        Your account was registered via Google Sign-In (<strong className="text-foreground font-mono">{profileEmail}</strong>).
                        Set a password below to enable direct email &amp; password sign-in alongside Google.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">Create Password</label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="At least 8 characters"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="h-10 text-xs bg-background pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showNewPassword ? "Hide password" : "Show password"}
                          >
                            {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">Confirm Password</label>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Repeat password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-10 text-xs bg-background pr-9"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                          >
                            {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Button
                        type="submit"
                        disabled={updatingPassword}
                        className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                      >
                        {updatingPassword ? (
                          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {updatingPassword ? 'Setting Password...' : 'Save & Enable Password'}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          if (!profileEmail) return;
                          setRequestingReset(true);
                          try {
                            await api.forgotPassword(profileEmail);
                            setResetRequested(true);
                            toast({
                              title: 'Reset Link Sent',
                              description: `We sent a setup link to ${profileEmail}.`
                            });
                          } catch (err: any) {
                            toast({
                              variant: 'destructive',
                              title: 'Request Failed',
                              description: err.message || 'Could not send reset email.'
                            });
                          } finally {
                            setRequestingReset(false);
                          }
                        }}
                        disabled={requestingReset}
                        className="h-9 px-4 text-xs font-semibold gap-1.5 border-border/60 text-muted-foreground hover:text-foreground"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {requestingReset ? 'Sending...' : 'Or Send Email Reset Link'}
                      </Button>
                    </div>
                  </form>

                  {resetRequested && (
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex items-center gap-2.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Password setup email sent to <strong className="text-foreground font-mono">{profileEmail}</strong>.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Normal password change form for users who already have a password */
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  {hasPassword && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Current Password</label>
                      <div className="relative">
                        <Input
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="h-10 text-xs bg-background pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                        >
                          {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {!hasPassword && (
                    <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-3.5 flex items-start gap-2.5">
                      <Key className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-muted-foreground">
                        Your account was created via Google Sign-In. Set a password below to also enable email/password login.
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">{hasPassword ? 'New Password' : 'Create Password'}</label>
                      <div className="relative">
                        <Input
                          type={showNewPassword ? "text" : "password"}
                          placeholder="At least 8 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="h-10 text-xs bg-background pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showNewPassword ? "Hide password" : "Show password"}
                        >
                          {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-foreground">Confirm {hasPassword ? 'New ' : ''}Password</label>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Repeat new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="h-10 text-xs bg-background pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={updatingPassword}
                    className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                  >
                    {updatingPassword ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {updatingPassword ? 'Updating Password...' : (hasPassword ? 'Update Password' : 'Set Password')}
                  </Button>
                </form>
              )}
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
