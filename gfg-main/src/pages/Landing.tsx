import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import PinModal from '@/components/PinModal';
import { 
  Send, Sparkles, ShieldCheck, FileSpreadsheet, Lock, 
  RefreshCw, Layers, CheckCircle2, ArrowRight, Globe, HelpCircle, Key, Cpu
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

export default function Landing() {
  const navigate = useNavigate();
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<DemoLead>(DEMO_LEADS[0]);
  const [sentLeads, setSentLeads] = useState<Record<string, boolean>>({});
  
  // Interactive variables demo state
  const [demoSubject, setDemoSubject] = useState('Quick question for {name} ({store})');
  const [demoBody, setDemoBody] = useState('Hey {name},\n\nWe love what you guys are building in the {niche} vertical. Are you currently accepting guest pitches?');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-active');
          }
        });
      },
      { threshold: 0.1 }
    );
    const sections = document.querySelectorAll('.reveal-section');
    sections.forEach((section) => observer.observe(section));
    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  const handleLaunchConsole = () => {
    navigate('/send');
  };

  const handlePinSuccess = () => {
    setShowPinModal(false);
    toast({
      title: 'Authentication Granted',
      description: 'Access authorized. Opening sending console...',
    });
    navigate('/send');
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
      description: `Simulated mailto generated for ${email}`,
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

      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#635bff]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-10%] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-[#635bff]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#635bff] text-white shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col -space-y-0.5">
              <span className="font-heading text-base font-bold tracking-tight text-foreground">Peak Xender</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Outreach Console</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <a href="#about" className="hover:text-foreground transition-colors">About</a>
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#demo" className="hover:text-foreground transition-colors">Interactive Demo</a>
            <a href="#security" className="hover:text-foreground transition-colors">Security</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
            <Link to="/blog" className="hover:text-foreground transition-colors">Blog</Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button
              onClick={handleLaunchConsole}
              className="h-9 gap-1.5 rounded-lg bg-[#635bff] text-white font-bold px-4 shadow-2xs hover:bg-[#493ee5] transition-colors text-xs"
            >
              <Key className="h-3.5 w-3.5" />
              Launch Console
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main id="main-content" className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 reveal-section">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#635bff]/20 bg-[#635bff]/10 text-[#635bff] text-xs font-bold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Peak Xender — Email Outreach &amp; Campaign Platform</span>
        </div>

        <h1 className="font-heading text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.15]">
          Automated Email Outreach.<br />
          <span className="text-[#635bff]">
            Connect Gmail via OAuth &amp; Scale Delivery.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          Peak Xender is an automated email outreach and campaign management platform. Connect your Gmail account securely via Google OAuth to personalize templates, manage contact lists, and schedule automated outreach campaigns.
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-3">
          <Button
            size="lg"
            onClick={handleLaunchConsole}
            className="h-11 rounded-lg px-6 bg-[#635bff] hover:bg-[#493ee5] text-white font-bold shadow-2xs transition-all flex items-center gap-2 text-xs"
          >
            Access Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
          <a href="#demo">
            <Button
              size="lg"
              variant="outline"
              className="h-11 rounded-lg px-6 border-border/60 bg-card text-foreground hover:bg-muted/40 transition-all text-xs font-bold"
            >
              Try Interactive Demo
            </Button>
          </a>
        </div>

        {/* Dashboard Preview / Card Mockup */}
        <div className="pt-8 sm:pt-12 max-w-5xl mx-auto">
          <div className="rounded-2xl border border-border/60 bg-card p-2 shadow-2xl relative">
            <div className="rounded-xl overflow-hidden bg-muted/20 border border-border/60 p-4 sm:p-6 text-left space-y-6">
              {/* Mock App Window Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500/80" />
                  <span className="h-3 w-3 rounded-full bg-amber-500/80" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
                  <span className="text-[10px] font-mono text-muted-foreground ml-2">console.peakxender.app</span>
                </div>
                <Badge variant="outline" className="border-border/60 bg-card text-muted-foreground text-[10px] font-mono">
                  Live Analytics Active
                </Badge>
              </div>

              {/* Simulated Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Outbox Sends', val: '4,821', trend: '+14% vs avg', icon: Send, color: 'text-[#635bff] bg-[#635bff]/10' },
                  { label: 'Spam Bypass Rate', val: '99.4%', trend: 'Optimal health', icon: ShieldCheck, color: 'text-emerald-600 bg-emerald-500/10' },
                  { label: 'Active Senders', val: '12 SMTPs', trend: 'Rotations secure', icon: Cpu, color: 'text-indigo-600 bg-indigo-500/10' },
                  { label: 'Bounces Prevented', val: '143', trend: 'Auto-retries active', icon: RefreshCw, color: 'text-rose-500 bg-rose-500/10' },
                ].map((item, idx) => (
                  <div key={idx} className="bg-card border border-border/60 rounded-xl p-3.5 space-y-1 shadow-2xs">
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
                  </div>
                ))}
              </div>

              {/* Chart Mockup */}
              <div className="bg-card border border-border/60 rounded-xl p-4 space-y-2 shadow-2xs">
                <div className="flex justify-between items-center">
                  <h5 className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Delivery Timeline (Rotated Batches)</h5>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="h-24 flex items-end gap-1.5 pt-4">
                  {[35, 60, 45, 90, 75, 120, 110, 80, 130, 95, 140, 160].map((h, i) => (
                    <div key={i} className="flex-1 bg-muted/40 rounded-t overflow-hidden h-full flex flex-col justify-end">
                      <div 
                        className="w-full bg-[#635bff] rounded-t-xs transition-all duration-700" 
                        style={{ height: `${(h / 180) * 100}%` }} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* What is Peak Xender — App Purpose Section */}
      <section id="about" className="py-16 sm:py-20 bg-muted/20 border-y border-border/60 relative reveal-section">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-[#635bff] font-bold">About This Application</h2>
            <h3 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">What is Peak Xender?</h3>
          </div>

          <div className="bg-card border border-border/60 rounded-2xl p-6 sm:p-8 space-y-5 text-xs sm:text-sm text-muted-foreground leading-relaxed shadow-2xs">
            <p>
              <strong className="text-foreground">Peak Xender</strong> is an automated email outreach and campaign management platform designed for businesses and professionals who need to send personalized, high-volume email campaigns efficiently.
            </p>
            <p>
              The application enables users to:
            </p>
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
        </div>
      </section>

      {/* Bento Grid Showcase */}
      <section id="features" className="py-20 bg-background relative reveal-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-xs uppercase tracking-widest text-[#635bff] font-bold">Engineered for Volume</h2>
            <h3 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">Advanced Anti-Spam Tooling</h3>
            <p className="text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm">
              Standard email senders trigger fingerprint limits. Peak Xender reorganizes code structure locally to bypass automatic filtering.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bento Card 1: Anti-Spam */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 hover:border-[#635bff]/40 transition-all shadow-2xs group">
              <div className="p-3 w-12 h-12 rounded-xl bg-[#635bff]/10 text-[#635bff] flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-heading text-base font-bold text-foreground">Smart Anti-Spam Shuffling</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatically randomizes space encodings, reorders URL parameters, and injects zero-width whitespace to destroy email copy similarity hashes.
                </p>
              </div>
            </div>

            {/* Bento Card 2: Headerless CSV Engine */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 hover:border-[#635bff]/40 transition-all shadow-2xs group">
              <div className="p-3 w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-heading text-base font-bold text-foreground">Headerless CSV Import Engine</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Imports lead lists of any layout. Automatically detects if headers are missing, checks first-row values for emails, generates unique keys, and maps variables with zero data loss.
                </p>
              </div>
            </div>

            {/* Bento Card 3: 100% Client-Side */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 hover:border-[#635bff]/40 transition-all shadow-2xs group">
              <div className="p-3 w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Lock className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-heading text-base font-bold text-foreground">100% Private &amp; Local</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nothing is uploaded to an external database. All parser logic, lead mappings, and email dispatch sequences execute entirely inside your own browser window.
                </p>
              </div>
            </div>

            {/* Bento Card 4: Rotated Senders */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 hover:border-[#635bff]/40 transition-all shadow-2xs group md:col-span-2">
              <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                <div className="p-3 w-12 h-12 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <RefreshCw className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-heading text-base font-bold text-foreground">SMTP &amp; OAuth Rotator</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Connect multiple senders securely using standard SMTP or Google OAuth. Peak Xender automatically cycles through your active sender accounts to distribute load and preserve mailbox health scores.
                  </p>
                </div>
              </div>
            </div>

            {/* Bento Card 5: Smart BCC Batches */}
            <div className="bg-card border border-border/60 rounded-2xl p-6 space-y-4 hover:border-[#635bff]/40 transition-all shadow-2xs group">
              <div className="space-y-4">
                <div className="p-3 w-12 h-12 rounded-xl bg-[#635bff]/10 text-[#635bff] flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Layers className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-heading text-base font-bold text-foreground">Smart BCC Batching</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Send to multiple target recipients simultaneously in private BCC queues. Configurable batch sizes and self-rerouting structures automate outbox dispatch loops.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Editor Demo Section */}
      <section id="demo" className="py-20 bg-muted/20 border-y border-border/60 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 reveal-section">
        <div className="text-center space-y-2">
          <h2 className="text-xs uppercase tracking-widest text-emerald-600 font-bold">Interactive Sandbox</h2>
          <h3 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">Live Variable Replacer</h3>
          <p className="text-muted-foreground max-w-xl mx-auto text-xs sm:text-sm">
            Select a demo lead below to see placeholders replaced instantly. Generate simulated drafts locally.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left panel: editor fields (Span 5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">1. Select Demo Lead:</label>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_LEADS.map(lead => (
                  <button
                    key={lead.email}
                    onClick={() => setSelectedLead(lead)}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      selectedLead.email === lead.email
                        ? 'border-[#635bff] bg-[#635bff]/10 text-foreground font-bold shadow-2xs'
                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted/30'
                    }`}
                  >
                    <p className="font-bold">{lead.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{lead.store}</p>
                  </button>
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
          </div>

          {/* Right panel: Live compilation & simulated action (Span 7) */}
          <div className="lg:col-span-7 bg-card border border-border/60 rounded-2xl p-6 flex flex-col justify-between shadow-2xs">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Live Personalization Output</span>
                <span className="text-[10px] font-mono font-bold text-emerald-600">Variables replaced OK</span>
              </div>

              <div className="space-y-2.5 bg-muted/30 p-4 rounded-xl border border-border/60 font-mono text-xs">
                <p className="text-muted-foreground"><strong className="text-foreground">To:</strong> {selectedLead.email}</p>
                <p className="text-muted-foreground"><strong className="text-foreground">Subject:</strong> {getDemoPreview(demoSubject, selectedLead)}</p>
                <div className="h-px bg-border/60 my-2" />
                <p className="text-foreground whitespace-pre-wrap">{getDemoPreview(demoBody, selectedLead)}</p>
              </div>
            </div>

            <div className="pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-[11px] text-muted-foreground font-mono">
                Placeholders used: <code className="text-[#635bff] font-bold">{`{name}`}</code>, <code className="text-[#635bff] font-bold">{`{store}`}</code>, <code className="text-[#635bff] font-bold">{`{niche}`}</code>
              </div>
              
              <Button
                disabled={!!sentLeads[selectedLead.email]}
                onClick={() => simulateSend(selectedLead.email)}
                className={`w-full sm:w-auto h-9.5 text-xs font-bold px-5 rounded-lg flex items-center justify-center gap-1.5 ${
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
            </div>
          </div>
        </div>
      </section>

      {/* Security Gating Details */}
      <section id="security" className="py-20 bg-background border-t border-border/60 relative reveal-section">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="h-14 w-14 bg-[#635bff]/10 border border-[#635bff]/20 text-[#635bff] rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-2xs">
            <Lock className="h-7 w-7" />
          </div>
          <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">Secure Access PIN Gate</h3>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed max-w-xl mx-auto">
            Peak Xender runs as an enclosed environment. All administrative endpoints, sending lists, connected SMTP accounts, and background schedules are fully encrypted behind your local 4-digit PIN.
          </p>
          <div className="pt-2">
            <Button
              onClick={handleLaunchConsole}
              className="h-10 px-6 font-bold text-xs bg-[#635bff] hover:bg-[#493ee5] text-white shadow-2xs"
            >
              Verify PIN to Access App
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 reveal-section">
        <div className="text-center space-y-2">
          <HelpCircle className="h-6 w-6 text-[#635bff] mx-auto" />
          <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground">Frequently Asked Questions</h3>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'Why run email outreach client-side?',
              a: 'Running outreach client-side allows you to personalize and build outreach sequences with zero overhead. There are no expensive monthly database fees or external cloud storages holding your contact lists. You bypass standard API limits by generating customized mailto sequences directly inside your browser window.'
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
            <div key={i} className="bg-card border border-border/60 rounded-xl p-5 space-y-2 shadow-2xs">
              <h4 className="font-bold text-foreground text-xs sm:text-sm flex items-center gap-2">
                <span className="text-[#635bff] font-mono">Q.</span> {faq.q}
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed font-sans">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border/60 bg-card py-10 text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#635bff] text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-foreground font-heading">Peak Xender</span>
                <span className="text-[10px] text-muted-foreground font-mono">Automated Email Outreach Platform</span>
              </div>
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
