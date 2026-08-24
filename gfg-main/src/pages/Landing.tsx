import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/Logo';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import PinModal from '@/components/PinModal';
import { 
  Send, Sparkles, ShieldCheck, FileSpreadsheet, Lock, 
  RefreshCw, Layers, CheckCircle2, ArrowRight, HelpCircle, Key, Cpu,
  ChevronDown, Zap, BarChart3, Users, Flame, GitMerge, Mail, Check,
  Server, ExternalLink, Calculator
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DemoLead {
  email: string;
  name: string;
  store: string;
  niche: string;
}

const DEMO_LEADS: DemoLead[] = [
  { email: 'alex@hostinger.com', name: 'Alex', store: 'hostinger.com', niche: 'Web Hosting' },
  { email: 'julia@nike.com', name: 'Julia', store: 'nike.com', niche: 'Athletic Wear' },
  { email: 'marcus@notion.so', name: 'Marcus', store: 'notion.so', niche: 'Productivity SaaS' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1]
    }
  }
};

export default function Landing() {
  const navigate = useNavigate();
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<DemoLead>(DEMO_LEADS[0]);
  const [sentLeads, setSentLeads] = useState<Record<string, boolean>>({});
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [activePlatformTab, setActivePlatformTab] = useState<'warmup' | 'campaigns' | 'sequences' | 'analytics'>('warmup');
  
  // Interactive variables demo state
  const [demoSubject, setDemoSubject] = useState('Quick question for {name} ({store})');
  const [demoBody, setDemoBody] = useState('Hey {name},\n\nWe love what you guys are building in the {niche} vertical. Are you currently accepting guest pitches?');

  const handleLaunchConsole = () => {
    navigate('/login');
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    toast({
      title: 'Authentication Granted',
      description: 'Access authorized. Opening sending console...',
    });
    navigate('/dashboard');
  };

  // Replace placeholders helper for demo
  const getDemoPreview = (text: string, lead: DemoLead) => {
    return text
      .replace(/{name}/g, lead.name)
      .replace(/{store}/g, lead.store)
      .replace(/{niche}/g, lead.niche);
  };

  const simulateSend = (email: string) => {
    setSentLeads(prev => ({ ...prev, [email]: true }));
    toast({
      title: 'Outbound Mail Dispatched',
      description: `Simulated mail preview generated for ${email}`,
    });
  };

  const providers = [
    { name: 'Gmail', icon: 'G', color: 'from-red-500/20 to-red-600/10 text-red-500' },
    { name: 'Google Workspace', icon: 'GW', color: 'from-blue-500/20 to-green-500/10 text-blue-400' },
    { name: 'Outlook 365', icon: 'O', color: 'from-blue-600/20 to-blue-700/10 text-blue-500' },
    { name: 'iCloud', icon: 'iC', color: 'from-gray-400/20 to-gray-500/10 text-gray-300' },
    { name: 'Amazon SES', icon: 'SES', color: 'from-orange-500/20 to-orange-600/10 text-orange-400' },
    { name: 'SendGrid', icon: 'SG', color: 'from-blue-500/20 to-indigo-600/10 text-indigo-400' },
    { name: 'Mailgun', icon: 'MG', color: 'from-red-600/20 to-orange-500/10 text-orange-500' },
    { name: 'Zoho Mail', icon: 'Z', color: 'from-yellow-500/20 to-red-500/10 text-yellow-500' },
  ];

  const faqs = [
    {
      q: 'How does Peak Xender prevent cold emails from landing in spam?',
      a: 'Peak Xender combines a live DNS Resolver (SPF, DKIM, DMARC, MX checks), zero-width whitespace anti-fingerprint insertion, humanized batch delay throttles, and automatic unsubscribe suppression.'
    },
    {
      q: 'Why does Peak Xender have zero per-inbox fees unlike other platforms?',
      a: 'Legacy tools charge $20 to $40 per email account to inflate their MRR. Peak Xender is architected around decentralized OAuth 2.0 and custom SMTP relays, giving you the freedom to rotate unlimited inboxes at zero marginal cost.'
    },
    {
      q: 'How does the multi-step sequence auto-stop work?',
      a: 'When an incoming email arrives, our intelligent inbox engine classifies the sentiment. If the lead replies or expresses interest, Peak Xender automatically cancels all subsequent scheduled follow-up steps for that contact.'
    },
    {
      q: 'Can I import messy CSV files without standard headers?',
      a: 'Yes! Peak Xender includes an intelligent Headerless CSV parser that scans the first data rows, auto-detects email formats, and matches 40+ header variations automatically.'
    },
    {
      q: 'Is my data private and secure?',
      a: '100%. OAuth credentials and SMTP secrets are encrypted using AES-256-GCM. All database records are strictly partitioned by tenant user_id, ensuring zero cross-tenant data leakage.'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#635bff]/20 relative overflow-hidden">
      <SEO
        title="Peak Xender - Next-Gen Cold Email & Deliverability Platform"
        description="Scale cold email outreach with zero per-inbox markups. Connect unlimited Gmail & SMTP inboxes, run multi-step sequences, live DNS health checks, and AI copywriter."
        keywords={['Peak Xender', 'cold outreach', 'Gmail OAuth email sender', 'email outreach platform', 'email deliverability', 'multi-smtp rotation']}
        canonicalUrl="https://send.peakconix.site/"
      />

      {/* Dynamic Animated Ambient Glow Orbs */}
      <motion.div 
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] bg-[#635bff]/15 rounded-full blur-[140px] pointer-events-none" 
      />
      <motion.div 
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -30, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-[35%] right-[-10%] w-[650px] h-[650px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" 
      />

      {/* Header / Navbar */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-md"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <Logo size="md" subtitle="Outreach Console" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Link to="/features" className="hover:text-foreground hover:text-[#635bff] transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-foreground hover:text-[#635bff] transition-colors">Pricing</Link>
            <Link to="/managed-service" className="hover:text-foreground hover:text-[#635bff] transition-colors">Managed Service</Link>
            <a href="#demo" className="hover:text-foreground hover:text-[#635bff] transition-colors">Live Demo</a>
            <a href="#faq" className="hover:text-foreground hover:text-[#635bff] transition-colors">FAQ</a>
            <Link to="/blog" className="hover:text-foreground hover:text-[#635bff] transition-colors">Blog</Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Button
                onClick={handleLaunchConsole}
                className="h-9 gap-1.5 rounded-lg bg-[#635bff] text-white font-bold px-4 shadow-md hover:bg-[#493ee5] transition-colors text-xs"
              >
                <Key className="h-3.5 w-3.5" />
                Launch Console
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <main id="main-content" className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={itemVariants} className="inline-flex">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#635bff]/30 bg-[#635bff]/10 text-[#635bff] text-xs font-bold shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#635bff] animate-pulse" />
              <span>Trusted by 1,000+ Growth Teams Worldwide</span>
            </div>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.12]"
          >
            Increase Your Opens, Clicks &amp; Conversions <br />
            <span className="bg-gradient-to-r from-[#635bff] via-indigo-500 to-emerald-400 bg-clip-text text-transparent">
              With Cold Email &amp; AI Deliverability
            </span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          >
            Peak Xender combines hyper-personalized cold email sequences with live DNS health diagnostics, anti-bot click filtering, and unlimited sender rotation — so your outreach lands in the primary inbox, every single time.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3 pt-3">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                onClick={handleLaunchConsole}
                className="h-12 px-7 rounded-xl bg-[#635bff] text-white font-bold shadow-lg shadow-[#635bff]/25 hover:bg-[#493ee5] transition-all gap-2 text-sm"
              >
                Start Free Outreach <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/pricing')}
                className="h-12 px-6 rounded-xl border-border bg-card/60 backdrop-blur-sm text-foreground hover:bg-muted/50 font-bold gap-2 text-sm"
              >
                <Calculator className="h-4 w-4 text-[#635bff]" /> View Unlimited Pricing
              </Button>
            </motion.div>
          </motion.div>

          <motion.p variants={itemVariants} className="text-xs text-muted-foreground">
            Zero credit card required · Setup in under 2 minutes · Unlimited sending accounts
          </motion.p>

          {/* Interactive Live Dashboard Mockup with Floating Alerts */}
          <motion.div 
            variants={itemVariants}
            className="relative w-full max-w-5xl mx-auto mt-8 rounded-2xl border border-border/80 bg-card/90 shadow-2xl shadow-black/40 overflow-hidden text-left"
          >
            {/* Window header */}
            <div className="bg-muted/40 border-b border-border px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
                <span className="text-[11px] text-muted-foreground font-mono ml-2">app.peakconix.site/dashboard</span>
              </div>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Live Console Active
              </Badge>
            </div>

            {/* Dashboard body */}
            <div className="p-6 space-y-6">
              {/* KPI stat row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Emails Sent</p>
                  <p className="text-2xl font-black text-[#635bff]">24,891</p>
                  <p className="text-[11px] text-emerald-500 font-semibold mt-1">↑ +18% this week</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Open Rate</p>
                  <p className="text-2xl font-black text-emerald-500">71.4%</p>
                  <p className="text-[11px] text-emerald-500 font-semibold mt-1">↑ +12% this week</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Reply Rate</p>
                  <p className="text-2xl font-black text-indigo-400">23.7%</p>
                  <p className="text-[11px] text-emerald-500 font-semibold mt-1">↑ +8% this week</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Hot Leads Identified</p>
                  <p className="text-2xl font-black text-amber-500">142</p>
                  <p className="text-[11px] text-emerald-500 font-semibold mt-1">↑ +31% this week</p>
                </div>
              </div>

              {/* Reputation & DNS Health Card */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">DNS Shield &amp; Reputation Active</div>
                    <div className="text-xs text-muted-foreground">SPF, DKIM, DMARC Verified · Multi-Sender Round Robin</div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <div className="text-xl font-black text-emerald-500">94 / 100</div>
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">Reputation Score</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Live Delivery Toast Mockups */}
            <div className="absolute -left-3 top-1/2 hidden lg:flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-2xl">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-sm">
                ✓
              </div>
              <div>
                <p className="text-xs font-bold">Email Delivered</p>
                <p className="text-[10px] text-muted-foreground">Primary Inbox · 2s ago</p>
              </div>
            </div>

            <div className="absolute -right-3 bottom-12 hidden lg:flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 shadow-2xl">
              <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-[#635bff] flex items-center justify-center font-bold text-sm">
                🔥
              </div>
              <div>
                <p className="text-xs font-bold">Hot Lead Webhook</p>
                <p className="text-[10px] text-muted-foreground">Dispatched to Slack · 14s ago</p>
              </div>
            </div>
          </motion.div>

          {/* Metric counter strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8">
            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 text-center">
              <p className="text-3xl font-black text-foreground mb-1">71%</p>
              <p className="text-xs text-muted-foreground">Average Open Rate</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 text-center">
              <p className="text-3xl font-black text-foreground mb-1">1,500+</p>
              <p className="text-xs text-muted-foreground">Emails in 60 Seconds</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 text-center">
              <p className="text-3xl font-black text-[#635bff] mb-1">Unlimited</p>
              <p className="text-xs text-muted-foreground">Sender Inboxes Allowed</p>
            </div>
            <div className="rounded-2xl border border-border/80 bg-card/60 p-5 text-center">
              <p className="text-3xl font-black text-emerald-500 mb-1">94 / 100</p>
              <p className="text-xs text-muted-foreground">Average Health Score</p>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Provider Integration Marquee */}
      <section className="py-14 border-y border-border/60 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-6">
            Works seamlessly with every major email provider &amp; SMTP relay
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {providers.map((p, idx) => (
              <div 
                key={idx}
                className="rounded-xl border border-border/80 bg-card p-3 flex flex-col items-center justify-center gap-1.5 shadow-xs hover:border-[#635bff]/60 transition-colors"
              >
                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${p.color} flex items-center justify-center font-bold text-xs`}>
                  {p.icon}
                </div>
                <span className="text-[11px] font-semibold text-muted-foreground truncate">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Platform Showcase */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-3 text-[#635bff] bg-[#635bff]/10 border-[#635bff]/30">The Platform</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            See Peak Xender in Action
          </h2>
          <p className="text-sm text-muted-foreground">
            Switch between modules to see how Peak Xender powers every stage of your outreach pipeline.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
            { id: 'warmup', label: 'Deliverability & DNS Shield', icon: ShieldCheck },
            { id: 'campaigns', label: 'Campaigns & Spintax', icon: Mail },
            { id: 'sequences', label: 'Sequences & Auto-Stop', icon: GitMerge },
            { id: 'analytics', label: 'AI Sentiment & Webhooks', icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activePlatformTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePlatformTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#635bff] text-white shadow-md shadow-[#635bff]/20 scale-[1.02]'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Platform Tab Content Card */}
        <div className="rounded-3xl border border-border/80 bg-card p-8 sm:p-12 shadow-xl">
          {activePlatformTab === 'warmup' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Deliverability Engine
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-bold">Never Land in Spam Again</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Peak Xender queries SPF, DKIM, and DMARC TXT records directly from DNS servers in real time. It calculates an authoritative deliverability score (0-100) and warns you before a single email is dispatched.
                </p>
                <ul className="space-y-2 text-xs text-foreground/90 pt-2">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Real-time SPF / DKIM / DMARC verification</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Randomized humanized delay algorithms</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Automatic unsubscribe suppression</li>
                </ul>
              </div>
              <div className="lg:col-span-6 rounded-2xl border border-border bg-muted/20 p-6 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-border/60">
                  <span className="text-muted-foreground font-sans font-semibold">DNS Diagnostic</span>
                  <span className="text-emerald-500 font-bold">100% Passed</span>
                </div>
                <div className="flex justify-between text-[11px]"><span>SPF Record:</span><span className="text-emerald-400">v=spf1 include:_spf.google.com ~all</span></div>
                <div className="flex justify-between text-[11px]"><span>DMARC Record:</span><span className="text-emerald-400">v=DMARC1; p=reject; rua=mailto:...</span></div>
                <div className="flex justify-between text-[11px]"><span>DKIM Signature:</span><span className="text-emerald-400">google._domainkey (2048-bit)</span></div>
                <div className="flex justify-between text-[11px]"><span>MX Mail Routing:</span><span className="text-emerald-400">aspmx.l.google.com (Priority 1)</span></div>
              </div>
            </div>
          )}

          {activePlatformTab === 'campaigns' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <Badge variant="outline" className="bg-[#635bff]/10 text-[#635bff] border-[#635bff]/30">
                  Campaign Engine
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-bold">Hyper-Personalization at Scale</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Use recursive spintax permutations and arbitrary merge variables to make every single outbound message sound bespoke.
                </p>
                <ul className="space-y-2 text-xs text-foreground/90 pt-2">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Spintax: {'{Hi|Hello|Hey}'} with unlimited variations</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Dynamic CSV merge: {'{name}'}, {'{store}'}, {'{niche}'}</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Multi-Model AI copywriter (5 providers)</li>
                </ul>
              </div>
              <div className="lg:col-span-6 rounded-2xl border border-border bg-muted/20 p-6 space-y-3 font-mono text-xs">
                <div className="text-muted-foreground font-sans font-semibold mb-1">Spintax Preview:</div>
                <div className="p-3 rounded-lg bg-card border border-border text-[11px] leading-relaxed">
                  {'{Hey|Hi} {name}, noticed {store} has been growing rapidly in the {niche} space. Are you accepting vendor demos this quarter?'}
                </div>
                <div className="text-emerald-500 font-sans text-[11px] font-semibold">
                  ✓ Generates 24 unique outbound permutations
                </div>
              </div>
            </div>
          )}

          {activePlatformTab === 'sequences' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                  Sequence Automation
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-bold">Smart Follow-ups that Stop on Reply</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Build multi-touch drip sequences with time-based delay triggers. If a prospect replies or books a call, Peak Xender automatically halts subsequent follow-ups.
                </p>
                <ul className="space-y-2 text-xs text-foreground/90 pt-2">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Multi-step drip stages with customizable delay days</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 100% reply auto-stop precision</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Timezone-aware working hour restrictions</li>
                </ul>
              </div>
              <div className="lg:col-span-6 rounded-2xl border border-border bg-muted/20 p-6 space-y-2.5 text-xs">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className="w-6 h-6 rounded-full bg-[#635bff] text-white flex items-center justify-center font-bold text-[10px]">1</div>
                  <div className="flex-1">
                    <div className="font-bold">Step 1: Initial Pitch</div>
                    <div className="text-[10px] text-muted-foreground">Sent immediately upon launch</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                  <div className="w-6 h-6 rounded-full bg-[#635bff] text-white flex items-center justify-center font-bold text-[10px]">2</div>
                  <div className="flex-1">
                    <div className="font-bold">Step 2: Case Study &amp; Value Prop</div>
                    <div className="text-[10px] text-muted-foreground">3 days later (if no reply)</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px]">✓</div>
                  <div className="flex-1">
                    <div className="font-bold text-emerald-600 dark:text-emerald-400">Prospect Replied — Sequence Auto-Halted</div>
                    <div className="text-[10px] text-muted-foreground">Step 3 cancelled automatically</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePlatformTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-6 space-y-4">
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                  AI Intelligence &amp; Alerts
                </Badge>
                <h3 className="text-2xl sm:text-3xl font-bold">Bot Filtering &amp; Hot Lead Webhooks</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enterprise email scanners (Barracuda, Proofpoint, SafeLinks) trigger fake clicks. Peak Xender automatically filters them out and uses LLMs to classify real prospect replies.
                </p>
                <ul className="space-y-2 text-xs text-foreground/90 pt-2">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Discards false bot scanner clicks</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> AI tags: Hot Lead, Interested, Question, Unsubscribe</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Instant webhook notifications to Slack &amp; CRM</li>
                </ul>
              </div>
              <div className="lg:col-span-6 rounded-2xl border border-border bg-muted/20 p-6 space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg bg-card border border-border">
                  <div className="text-emerald-500 font-sans font-bold text-[11px] mb-1">🔥 Hot Lead Identified:</div>
                  <p className="text-[11px] text-muted-foreground font-sans">"Yes, we'd love to see a demo! Can you send a calendar link for Tuesday afternoon?"</p>
                  <div className="mt-2 text-[10px] text-[#635bff] font-sans font-semibold">→ Webhook Dispatched to #sales-alerts (200 OK)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Step-by-Step "How It Works" Section */}
      <section className="py-20 bg-muted/20 border-y border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3">Workflow</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              From Setup to Pipeline in Minutes
            </h2>
            <p className="text-sm text-muted-foreground">
              No complex setup or technical friction. Just connect, configure, and scale.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Connect Inboxes', desc: 'Add unlimited Gmail accounts via OAuth 2.0 or configure custom SMTP relays.' },
              { step: '02', title: 'Import & Clean Leads', desc: 'Upload any CSV. Our headerless parser auto-maps fields and verifies emails.' },
              { step: '03', title: 'AI Write & Launch', desc: 'Generate high-converting spintax copy with 5 integrated AI models.' },
              { step: '04', title: 'Convert Hot Leads', desc: 'Receive real-time hot lead alerts in Slack and close booked meetings.' },
            ].map((st, idx) => (
              <div key={idx} className="rounded-2xl border border-border/80 bg-card p-6 flex flex-col justify-between shadow-xs">
                <div>
                  <div className="text-3xl font-black text-[#635bff]/40 mb-4">{st.step}</div>
                  <h3 className="text-lg font-bold mb-2">{st.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{st.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Live Lead Sandbox */}
      <section id="demo" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <Badge variant="outline" className="mb-3 text-emerald-600 bg-emerald-500/10 border-emerald-500/30">
            Interactive Sandbox
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Test Merge Variables in Real Time
          </h2>
          <p className="text-sm text-muted-foreground">
            Type custom merge tags and select sample leads to see how Peak Xender personalizes every email.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Template Input */}
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
            <div>
              <label className="text-xs font-semibold block mb-1.5">Subject Line Template</label>
              <input
                type="text"
                value={demoSubject}
                onChange={(e) => setDemoSubject(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#635bff]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1.5">Email Body Template</label>
              <textarea
                rows={5}
                value={demoBody}
                onChange={(e) => setDemoBody(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#635bff]"
              />
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
              <span>Available Tags:</span>
              <span className="px-2 py-0.5 rounded bg-muted font-mono">{'{name}'}</span>
              <span className="px-2 py-0.5 rounded bg-muted font-mono">{'{store}'}</span>
              <span className="px-2 py-0.5 rounded bg-muted font-mono">{'{niche}'}</span>
            </div>
          </div>

          {/* Right: Live Lead Preview */}
          <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold">Select Sample Prospect:</span>
              <div className="flex gap-1.5">
                {DEMO_LEADS.map((ld) => (
                  <button
                    key={ld.email}
                    onClick={() => setSelectedLead(ld)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      selectedLead.email === ld.email
                        ? 'bg-[#635bff] text-white'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {ld.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="text-[11px] text-muted-foreground">
                <strong>To:</strong> {selectedLead.name} &lt;{selectedLead.email}&gt;
              </div>
              <div className="text-xs font-bold text-foreground">
                {getDemoPreview(demoSubject, selectedLead)}
              </div>
              <div className="h-px bg-border/60 my-2" />
              <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {getDemoPreview(demoBody, selectedLead)}
              </div>
            </div>

            <Button
              onClick={() => simulateSend(selectedLead.email)}
              className="w-full bg-[#635bff] hover:bg-[#534be5] text-white font-bold py-4 rounded-xl text-xs gap-2"
            >
              <Send className="w-3.5 h-3.5" /> Simulate Instant Dispatch
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section id="features" className="py-20 bg-muted/20 border-y border-border/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Badge variant="outline" className="mb-3">Engine Highlights</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
              Built for High-Volume Deliverability
            </h2>
            <p className="text-sm text-muted-foreground">
              Everything required to scale outbound pipeline without hitting spam traps or bot scanner false alarms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">DNS Shield (Live Diagnostics)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Queries SPF, DKIM, and DMARC TXT records directly from DNS servers in real time, calculating a live deliverability score.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#635bff]/10 text-[#635bff] flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Multi-Model AI Copywriter</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate high-converting spintax campaigns with your choice of DeepSeek, Claude 3.5, GPT-4o, and Gemini models.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Anti-Bot Scanner Filtering</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Filters out automated enterprise scanner clicks (Barracuda, Proofpoint, SafeLinks) to guarantee clean analytics.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Hot Lead Webhook Alerts</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI sentiment analysis instantly classifies positive replies and dispatches hot leads to your CRM or Slack channels in seconds.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Spintax Permutation Engine</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Built-in spintax resolver with zero-width whitespace randomization ensures ESPs never see identical message hashes.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold">Global Command Palette (Ctrl+K)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Navigate campaigns, trigger AI generators, export CSV audit logs, and search accounts with high-speed keyboard shortcuts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-3">FAQ</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Frequently Asked Questions
          </h2>
          <p className="text-sm text-muted-foreground">
            Everything you need to know about Peak Xender's outreach infrastructure.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx}
              className="rounded-xl border border-border/80 bg-card overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left font-semibold text-sm flex justify-between items-center gap-4 hover:text-[#635bff] transition-colors"
              >
                <span>{faq.q}</span>
                <span className="text-muted-foreground text-lg">{openFaq === idx ? '−' : '+'}</span>
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final High-Converting CTA */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-[#635bff] to-indigo-600 p-8 sm:p-14 text-white text-center shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Ready to Land in Every Inbox?
            </h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Start scaling cold outreach without paying per inbox. Connect unlimited senders, write AI spintax campaigns, and protect your domain reputation.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
              <Button
                onClick={handleLaunchConsole}
                size="lg"
                className="bg-white text-[#635bff] hover:bg-white/90 font-bold px-8 py-6 rounded-xl shadow-lg"
              >
                Launch Outreach Console <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Button>
            </div>
            <p className="text-xs text-white/60">No credit card required · Setup in 2 minutes · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-card py-12 text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo size="sm" subtitle="Automated Outreach" />
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-5 text-xs font-bold">
              <Link to="/features" className="hover:text-foreground hover:text-[#635bff] transition-colors">Features</Link>
              <Link to="/pricing" className="hover:text-foreground hover:text-[#635bff] transition-colors">Pricing</Link>
              <Link to="/managed-service" className="hover:text-foreground hover:text-[#635bff] transition-colors">Managed Service</Link>
              <Link to="/privacy" className="text-foreground hover:text-[#635bff] transition-colors underline underline-offset-2">Privacy Policy</Link>
              <Link to="/terms" className="text-foreground hover:text-[#635bff] transition-colors underline underline-offset-2">Terms of Service</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact / Support</Link>
              <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            </nav>
          </div>

          <div className="mt-6 pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>© {new Date().getFullYear()} Peak Xender. All rights reserved.</span>
            <span className="font-mono">send.peakconix.site</span>
          </div>
        </div>
      </footer>

      {/* PIN Gate Dialog */}
      {showPinModal && (
        <PinModal
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPinModal(false)}
          actionLabel="login to Peak Xender outreach console"
        />
      )}
    </div>
  );
}
