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
  ChevronDown, Zap, BarChart3, Users
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

const cardHoverVariants = {
  hover: {
    y: -6,
    scale: 1.015,
    transition: { duration: 0.25, ease: "easeOut" }
  }
};

export default function Landing() {
  const navigate = useNavigate();
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<DemoLead>(DEMO_LEADS[0]);
  const [sentLeads, setSentLeads] = useState<Record<string, boolean>>({});
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#635bff]/20 relative overflow-hidden">
      <SEO
        title="Peak Xender - Automated Email Outreach & Campaign Management Platform"
        description="Peak Xender is an automated email outreach platform. Connect your Gmail account via Google OAuth to personalize, schedule, and send targeted email campaigns."
        keywords={['Peak Xender', 'cold outreach', 'Gmail OAuth email sender', 'email outreach platform', 'multi-smtp warm-up']}
        canonicalUrl="https://send.peakconix.site/"
        schema={[
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            'name': 'Peak Xender',
            'url': 'https://send.peakconix.site/',
            'description': 'Automated email outreach and campaign management platform.'
          },
          {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            'name': 'Peak Xender',
            'applicationCategory': 'BusinessApplication',
            'operatingSystem': 'Web, Android, Desktop',
            'offers': {
              '@type': 'Offer',
              'price': '0.00',
              'priceCurrency': 'USD'
            }
          },
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            'name': 'Peak Xender',
            'url': 'https://send.peakconix.site/',
            'logo': 'https://send.peakconix.site/logo-dark.jpg'
          }
        ]}
      />

      {/* Dynamic Animated Floating Ambient Glow Orbs */}
      <motion.div 
        animate={{
          x: [0, 40, -20, 0],
          y: [0, -30, 20, 0],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[-10%] left-[-10%] w-[550px] h-[550px] bg-[#635bff]/15 rounded-full blur-[140px] pointer-events-none" 
      />
      <motion.div 
        animate={{
          x: [0, -50, 30, 0],
          y: [0, 40, -30, 0],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute top-[35%] right-[-10%] w-[650px] h-[650px] bg-emerald-500/10 rounded-full blur-[160px] pointer-events-none" 
      />
      <motion.div 
        animate={{
          x: [0, 30, -30, 0],
          y: [0, -40, 20, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-[#635bff]/10 rounded-full blur-[130px] pointer-events-none" 
      />

      {/* Header / Navbar with Glassmorphism */}
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
            <a href="#about" className="hover:text-foreground hover:text-[#635bff] transition-colors">About</a>
            <a href="#features" className="hover:text-foreground hover:text-[#635bff] transition-colors">Features</a>
            <a href="#demo" className="hover:text-foreground hover:text-[#635bff] transition-colors">Interactive Demo</a>
            <a href="#security" className="hover:text-foreground hover:text-[#635bff] transition-colors">Security</a>
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
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#635bff]" />
              <span>Peak Xender — Next-Gen Email Outreach Platform</span>
            </div>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="font-heading text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.12]"
          >
            Automated Email Outreach.<br />
            <span className="bg-gradient-to-r from-[#635bff] via-[#857dff] to-emerald-500 bg-clip-text text-transparent">
              Connect Gmail &amp; Scale Delivery.
            </span>
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed"
          >
            Peak Xender is an automated email outreach and campaign management platform. Connect your Gmail account securely via Google OAuth to personalize templates, manage contact lists, and schedule automated outreach campaigns.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3 pt-3">
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                size="lg"
                onClick={handleLaunchConsole}
                className="h-11 rounded-xl px-7 bg-[#635bff] hover:bg-[#493ee5] text-white font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-xs"
              >
                Access Dashboard
                <ArrowRight className="h-4 w-4" />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <a href="#demo">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-11 rounded-xl px-6 border-border/70 bg-card text-foreground hover:bg-muted/50 transition-all text-xs font-bold"
                >
                  Try Interactive Demo
                </Button>
              </a>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview / Animated Card Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 40, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="pt-8 sm:pt-14 max-w-5xl mx-auto"
        >
          <div className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl p-2.5 sm:p-3.5 shadow-2xl relative group">
            <div className="rounded-2xl overflow-hidden bg-background/90 border border-border/60 p-4 sm:p-7 text-left space-y-6">
              {/* Mock App Window Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80 transition-transform group-hover:scale-110" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80 transition-transform group-hover:scale-110" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80 transition-transform group-hover:scale-110" />
                  <span className="text-[11px] font-mono text-muted-foreground ml-2">console.peakxender.app</span>
                </div>
                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 text-[10px] font-mono flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Engine Active
                </Badge>
              </div>

              {/* Simulated Stats Row with Staggered Motion */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                {[
                  { label: 'Outbox Sends', val: '4,821', trend: '+14% vs avg', icon: Send, color: 'text-[#635bff] bg-[#635bff]/10' },
                  { label: 'Spam Bypass Rate', val: '99.4%', trend: 'Optimal health', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-500/10' },
                  { label: 'Active Senders', val: '12 SMTPs', trend: 'Rotations secure', icon: Cpu, color: 'text-indigo-600 bg-indigo-500/10' },
                  { label: 'Bounces Prevented', val: '143', trend: 'Auto-retries active', icon: RefreshCw, color: 'text-rose-500 bg-rose-500/10' },
                ].map((item, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ y: -3, scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className="bg-card/70 border border-border/60 rounded-xl p-3.5 space-y-1 shadow-xs"
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{item.label}</span>
                      <div className={`p-1.5 rounded-lg ${item.color}`}>
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-heading text-lg font-bold text-foreground">{item.val}</h4>
                      <p className="text-[10px] text-muted-foreground font-semibold">{item.trend}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Chart Mockup with Animated Bars */}
              <div className="bg-card/70 border border-border/60 rounded-xl p-4 space-y-2 shadow-xs">
                <div className="flex justify-between items-center">
                  <h5 className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Delivery Timeline (Rotated Batches)</h5>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="h-28 flex items-end gap-2 pt-4">
                  {[35, 60, 45, 90, 75, 120, 110, 80, 130, 95, 140, 160].map((h, i) => (
                    <div key={i} className="flex-1 bg-muted/30 rounded-t-sm overflow-hidden h-full flex flex-col justify-end">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${(h / 180) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.4 + i * 0.04, ease: "easeOut" }}
                        className="w-full bg-gradient-to-t from-[#635bff] to-[#8c85ff] rounded-t-sm" 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* What is Peak Xender — App Purpose Section */}
      <section id="about" className="py-16 sm:py-24 bg-muted/20 border-y border-border/60 relative">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10"
        >
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-[#635bff] font-bold">About This Application</h2>
            <h3 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">What is Peak Xender?</h3>
          </div>

          <div className="bg-card border border-border/60 rounded-3xl p-6 sm:p-9 space-y-5 text-xs sm:text-sm text-muted-foreground leading-relaxed shadow-sm">
            <p>
              <strong className="text-foreground">Peak Xender</strong> is an automated email outreach and campaign management platform designed for businesses and professionals who need to send personalized, high-volume email campaigns efficiently.
            </p>
            <p>The application enables users to:</p>
            <ul className="list-disc list-inside space-y-2 pl-2 text-muted-foreground">
              <li>
                <strong className="text-foreground">Connect Gmail accounts via Google OAuth 2.0</strong> — Users securely authorize Peak Xender to send emails on their behalf through Google's standard OAuth consent flow. Peak Xender uses the Gmail API (<code className="text-[#635bff] bg-[#635bff]/10 px-1.5 py-0.5 rounded font-mono text-xs">gmail.send</code> scope) to dispatch outreach emails from the user's own Gmail mailbox.
              </li>
              <li>
                <strong className="text-foreground">Import and manage contact lists</strong> — Upload CSV files containing recipient information. The built-in parser auto-detects column headers and maps merge-tag variables (e.g., name, company, niche).
              </li>
              <li>
                <strong className="text-foreground">Personalize email templates</strong> — Create reusable templates with dynamic placeholder variables that are replaced per-recipient at send time, ensuring each email is uniquely personalized.
              </li>
              <li>
                <strong className="text-foreground">Schedule and automate campaign delivery</strong> — Configure send schedules with time-zone-aware dispatch windows, batch sizes, and inter-email delays to maintain healthy mailbox reputation.
              </li>
              <li>
                <strong className="text-foreground">Rotate across multiple sender accounts</strong> — Distribute outreach volume across several connected Gmail or SMTP accounts to preserve deliverability and avoid per-account sending limits.
              </li>
              <li>
                <strong className="text-foreground">Track campaign performance</strong> — Monitor open rates, click-through rates, bounces, and delivery status in real time from the analytics dashboard.
              </li>
            </ul>

            <div className="border-t border-border/60 pt-5 space-y-3">
              <h4 className="font-heading text-foreground font-bold text-base">How Peak Xender Uses Google Account Data</h4>
              <p className="text-muted-foreground">
                When you connect your Google account, Peak Xender requests limited access to send emails on your behalf via the Gmail API. Specifically:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pl-2 text-muted-foreground text-xs sm:text-sm">
                <li>Peak Xender <strong className="text-foreground">only</strong> uses the <code className="text-[#635bff] bg-[#635bff]/10 px-1.5 py-0.5 rounded font-mono text-xs">gmail.send</code> permission to send outreach emails that you have explicitly configured and scheduled.</li>
                <li>The <code className="text-[#635bff] bg-[#635bff]/10 px-1.5 py-0.5 rounded font-mono text-xs">gmail.send</code> scope is required because Peak Xender is an outreach campaign platform that lets a user dispatch messages from their own Gmail mailbox after they choose to send a campaign from the app.</li>
                <li>Peak Xender does <strong className="text-foreground">not</strong> read, modify, or delete any existing emails in your inbox or sent folder.</li>
                <li>Peak Xender does <strong className="text-foreground">not</strong> access your Google Contacts, Calendar, Drive, or any other Google service.</li>
                <li>OAuth tokens are stored securely and are used solely for authenticated email dispatch. You can revoke access at any time from your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-[#635bff] hover:underline font-bold">Google Account Permissions</a> page.</li>
              </ul>
            </div>

            <div className="border-t border-border/60 pt-4">
              <p className="text-xs text-muted-foreground">
                For full details on data handling, please review our{' '}
                <Link to="/privacy" className="text-[#635bff] font-bold hover:underline">Privacy Policy</Link>{' '}
                and{' '}
                <Link to="/terms" className="text-[#635bff] font-bold hover:underline">Terms of Service</Link>.
              </p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Bento Grid Showcase */}
      <section id="features" className="py-20 sm:py-28 bg-background relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center space-y-2"
          >
            <h2 className="text-xs uppercase tracking-widest text-[#635bff] font-bold">Engineered for Volume</h2>
            <h3 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">Advanced Anti-Spam Tooling</h3>
            <p className="text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm">
              Standard email senders trigger fingerprint limits. Peak Xender reorganizes code structure locally to bypass automatic filtering.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Deliverability Shield */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 }}
              whileHover="hover"
              variants={cardHoverVariants}
              className="bg-card border border-border/60 rounded-3xl p-7 space-y-4 hover:border-[#635bff]/50 transition-colors shadow-xs group"
            >
              <div className="p-3 w-12 h-12 rounded-2xl bg-[#635bff]/10 text-[#635bff] flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-heading text-base font-bold text-foreground">DNS &amp; Deliverability Shield</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Real-time SPF, DKIM, DMARC, and MX record diagnostics. Score domain health before launching to keep every cold email landing directly in primary inboxes.
                </p>
              </div>
            </motion.div>

            {/* Bento Card 2: Hot Lead Webhooks */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.12 }}
              whileHover="hover"
              variants={cardHoverVariants}
              className="bg-card border border-border/60 rounded-3xl p-7 space-y-4 hover:border-emerald-500/50 transition-colors shadow-xs group"
            >
              <div className="p-3 w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-heading text-base font-bold text-foreground">Hot Lead Webhook Alerts</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  AI classifies inbound prospect sentiment instantly. Receive high-priority in-app alerts and forward hot leads directly to Slack or your CRM the moment they reply.
                </p>
              </div>
            </motion.div>

            {/* Bento Card 3: Global Command Palette */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.19 }}
              whileHover="hover"
              variants={cardHoverVariants}
              className="bg-card border border-border/60 rounded-3xl p-7 space-y-4 hover:border-indigo-500/50 transition-colors shadow-xs group"
            >
              <div className="p-3 w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Cpu className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-heading text-base font-bold text-foreground">Command Palette (Ctrl+K)</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Keyboard-first spotlight navigation. Search campaigns, prospect dossiers, inboxes, templates, and audit logs with instant keyboard shortcuts.
                </p>
              </div>
            </motion.div>

            {/* Bento Card 4: Rotated Senders */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25 }}
              whileHover="hover"
              variants={cardHoverVariants}
              className="bg-card border border-border/60 rounded-3xl p-7 space-y-4 hover:border-rose-500/50 transition-colors shadow-xs group md:col-span-2"
            >
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="p-3 w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-heading text-base font-bold text-foreground">Multi-Sender Mailbox Pool Rotator</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Pool unlimited Google OAuth and custom SMTP mailboxes. Peak Xender automatically load-balances outbound volume, enforces provider daily limits, and filters automated security crawler clicks.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Bento Card 5: Headerless CSV Import Engine */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.32 }}
              whileHover="hover"
              variants={cardHoverVariants}
              className="bg-card border border-border/60 rounded-3xl p-7 space-y-4 hover:border-[#635bff]/50 transition-colors shadow-xs group"
            >
              <div className="p-3 w-12 h-12 rounded-2xl bg-[#635bff]/10 text-[#635bff] flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-heading text-base font-bold text-foreground">Headerless CSV Parser</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Imports prospect lead lists of any layout. Auto-detects column headers, checks first-row values for emails, and maps variables with zero data loss.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Editor Demo Section */}
      <section id="demo" className="py-20 sm:py-28 bg-muted/20 border-y border-border/60 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2"
        >
          <h2 className="text-xs uppercase tracking-widest text-emerald-600 font-bold">Interactive Sandbox</h2>
          <h3 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">Live Variable Replacer</h3>
          <p className="text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm">
            Select a demo lead below to see placeholders replaced instantly. Generate simulated drafts locally.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel: editor fields (Span 5) */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-5 space-y-4"
          >
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">1. Select Demo Lead:</label>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_LEADS.map(lead => (
                  <motion.button
                    key={lead.email}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedLead(lead)}
                    className={`p-3 rounded-2xl border text-left text-xs transition-all cursor-pointer relative ${
                      selectedLead.email === lead.email
                        ? 'border-[#635bff] bg-[#635bff]/10 text-foreground font-bold shadow-sm'
                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <p className="font-bold">{lead.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{lead.store}</p>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="demo-subject" className="text-xs font-bold text-foreground">2. Subject Line Template:</label>
              <input
                id="demo-subject"
                type="text"
                value={demoSubject}
                onChange={e => setDemoSubject(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl h-10 px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff] font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="demo-body" className="text-xs font-bold text-foreground">3. Body Template:</label>
              <textarea
                id="demo-body"
                value={demoBody}
                onChange={e => setDemoBody(e.target.value)}
                className="w-full bg-background border border-border/60 rounded-xl p-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff] font-mono h-32 resize-none"
              />
            </div>
          </motion.div>

          {/* Right panel: Live compilation & simulated action (Span 7) */}
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 bg-card border border-border/60 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Live Personalization Output</span>
                <span className="text-[10px] font-mono font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Variables compiled
                </span>
              </div>

              <div className="space-y-2.5 bg-muted/30 p-4 sm:p-5 rounded-2xl border border-border/60 font-mono text-xs">
                <p className="text-muted-foreground"><strong className="text-foreground">To:</strong> {selectedLead.email}</p>
                <p className="text-muted-foreground"><strong className="text-foreground">Subject:</strong> {getDemoPreview(demoSubject, selectedLead)}</p>
                <div className="h-px bg-border/60 my-2" />
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{getDemoPreview(demoBody, selectedLead)}</p>
              </div>
            </div>

            <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[11px] text-muted-foreground font-mono">
                Placeholders: <code className="text-[#635bff] font-bold">{`{name}`}</code>, <code className="text-[#635bff] font-bold">{`{store}`}</code>, <code className="text-[#635bff] font-bold">{`{niche}`}</code>
              </div>
              
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  disabled={!!sentLeads[selectedLead.email]}
                  onClick={() => simulateSend(selectedLead.email)}
                  className={`w-full sm:w-auto h-9.5 text-xs font-bold px-5 rounded-xl flex items-center justify-center gap-1.5 ${
                    sentLeads[selectedLead.email]
                      ? 'bg-muted text-muted-foreground border-none'
                      : 'bg-[#635bff] text-white hover:bg-[#493ee5]'
                  }`}
                >
                  {sentLeads[selectedLead.email] ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Mail Sent (Simulated)
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      Dispatch Simulated Link
                    </>
                  )}
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Security Gating Details */}
      <section id="security" className="py-20 bg-background border-t border-border/60 relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto px-4 text-center space-y-6"
        >
          <div className="h-16 w-16 bg-[#635bff]/10 border border-[#635bff]/30 text-[#635bff] rounded-3xl flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">Secure Access Architecture</h3>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            Peak Xender runs as an encrypted environment. All administrative endpoints, sending lists, connected accounts, and background schedules are fully secured with cryptographic JWT authentication and AES-256-GCM storage.
          </p>
          <div className="pt-2">
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} className="inline-block">
              <Button
                onClick={handleLaunchConsole}
                className="h-11 px-7 font-bold text-xs bg-[#635bff] hover:bg-[#493ee5] text-white rounded-xl shadow-md"
              >
                Sign In to Access Dashboard
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* FAQ Section with Animated Accordion */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-2"
        >
          <HelpCircle className="h-7 w-7 text-[#635bff] mx-auto" />
          <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">Frequently Asked Questions</h3>
        </motion.div>

        <div className="space-y-3.5">
          {[
            {
              q: 'Why run email outreach client-side?',
              a: 'Running outreach client-side allows you to personalize and build outreach sequences with zero overhead. There are no expensive monthly database fees or external cloud storages holding your contact lists. You bypass standard API limits by generating customized sequences directly inside your browser window.'
            },
            {
              q: 'How does the SMTP/OAuth Rotation work?',
              a: 'You can hook up multiple SMTP configurations or connect securely using Google OAuth callback routes. Once linked, the Peak Xender automation scheduler rotates through your verified email accounts to send emails, ensuring no single mailbox is flagged for bulk outreach.'
            },
            {
              q: 'What is the purpose of the Security PIN?',
              a: 'The local Security PIN acts as an access token to gate admin functions. This prevents unauthorized users from opening your outbox console, modifying connected SMTP keys, or accessing active campaigns.'
            },
            {
              q: 'Is there any limit to the CSV parsing size?',
              a: 'None! Since the CSV parsing algorithm executes in a Web Worker, it can handle cold lists of 5,000+ leads without freezing the main browser thread. It automatically standardizes headers and removes malformed rows.'
            }
          ].map((faq, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-xs"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-muted/20 transition-colors"
              >
                <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-2">
                  <span className="text-[#635bff] font-mono font-extrabold">Q.</span> {faq.q}
                </h4>
                <motion.div
                  animate={{ rotate: openFaq === i ? 180 : 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                </motion.div>
              </button>

              <AnimatePresence>
                {openFaq === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-border/40 font-sans">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-card py-12 text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <Logo size="sm" subtitle="Automated Outreach" />
            </div>

            {/* Links */}
            <nav className="flex flex-wrap items-center justify-center gap-5 text-xs font-bold">
              <Link to="/privacy" className="text-foreground hover:text-[#635bff] transition-colors underline underline-offset-2">Privacy Policy</Link>
              <Link to="/terms" className="text-foreground hover:text-[#635bff] transition-colors underline underline-offset-2">Terms of Service</Link>
              <Link to="/contact" className="hover:text-foreground transition-colors">Contact / Support</Link>
              <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
              <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
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
