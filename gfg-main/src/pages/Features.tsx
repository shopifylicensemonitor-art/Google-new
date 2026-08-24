import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Flame, 
  Mail, 
  BarChart3, 
  GitMerge, 
  ShieldCheck, 
  Cpu, 
  Zap, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  Server,
  Filter,
  Webhook
} from 'lucide-react';

const FEATURE_TABS = [
  {
    id: 'warmup',
    name: 'Inbox Warm-Up & Deliverability',
    icon: Flame,
    badge: 'Deliverability Engine',
    title: 'Never Land in the Spam Folder Again',
    description: 'Keep your sending reputation immaculate. Live SPF/DKIM/DMARC health checks, gradual sending curves, and intelligent peer warmup simulation protect your domain.',
    highlights: [
      'Automatic SPF, DKIM, DMARC & MX live resolver scoring (0-100 score)',
      'Humanized throttle algorithms with randomized dispatch intervals',
      'Zero-width whitespace anti-fingerprint insertion',
      'Auto-suppression on unsubscribe & negative sentiment signals',
    ],
    stats: [
      { value: '94/100', label: 'Average Sender Health' },
      { value: '0.1%', label: 'Spam Placement Rate' },
      { value: '< 30s', label: 'Live DNS Diagnostic' },
    ]
  },
  {
    id: 'campaigns',
    name: 'Cold Email Campaigns',
    icon: Mail,
    badge: 'Hyper-Personalization',
    title: 'Scale 1,500+ Tailored Emails in 60 Seconds',
    description: 'Send hyper-personalized outbound messages with dynamic custom fields, recursive spintax permutations, and multi-model AI copywriting.',
    highlights: [
      'Spintax engine: {Hi|Hello|Hey} with nested variant permutations',
      'Dynamic merge variables: {name}, {store}, {niche}, {custom_field}',
      'AI Copywriter powered by DeepSeek, GPT-4o, Claude 3.5, and Gemini',
      'Headerless CSV importer with 40+ auto-mapped column headers',
    ],
    stats: [
      { value: '1,500+', label: 'Emails in 60 Seconds' },
      { value: '71%', label: 'Average Open Rate' },
      { value: '5 Providers', label: 'Integrated AI Models' },
    ]
  },
  {
    id: 'sequences',
    name: 'Multi-Step Sequences',
    icon: GitMerge,
    badge: 'Smart Automation',
    title: 'Automated Follow-ups that Stop on Reply',
    description: 'Create multi-touch drip sequences with time-based delay triggers. If a prospect replies or books a call, Peak Xender automatically halts subsequent follow-ups.',
    highlights: [
      'Configurable multi-step drip stages with custom delay intervals (days/hours)',
      'Automated reply detection auto-marks recipient as replied and stops sequences',
      'Individual step customization with subject and HTML/plain body overrides',
      'Timezone-aware scheduling with strict working-hours enforcement',
    ],
    stats: [
      { value: '3-5x', label: 'Reply Rate Increase' },
      { value: '100%', label: 'Reply Auto-Stop Precision' },
      { value: '0', label: 'Awkward Over-sends' },
    ]
  },
  {
    id: 'analytics',
    name: 'Analytics & Sentiment AI',
    icon: BarChart3,
    badge: 'Intelligence & Inbox',
    title: 'Track Opens, Filter Bots & Classify Hot Leads',
    description: 'Stop guessing what worked. Get real-time open and click telemetry with built-in enterprise bot scanner filtering and AI sentiment classification.',
    highlights: [
      'Enterprise bot filter discards false clicks from Proofpoint, Barracuda & SafeLinks',
      'AI sentiment inbox tags: Hot Lead, Interested, Question, Unsubscribe',
      'Instant real-time webhook dispatching to Slack and CRM webhooks',
      'One-click CSV log export with full event audit trails',
    ],
    stats: [
      { value: '99.4%', label: 'Bot-Filtered Accuracy' },
      { value: '< 2s', label: 'Hot Lead Webhook Alert' },
      { value: '100%', label: 'Audit Trail Coverage' },
    ]
  }
];

export default function Features() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(FEATURE_TABS[0].id);

  const current = FEATURE_TABS.find(t => t.id === activeTab) || FEATURE_TABS[0];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#635bff]/20 relative overflow-hidden">
      <SEO
        title="Features — Peak Xender Cold Email & Deliverability Platform"
        description="Explore Peak Xender's suite of deliverability tools, cold email campaign builder, multi-step sequence automation, and AI sentiment classification."
        canonicalUrl="https://send.peakconix.site/features"
      />

      {/* Glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#635bff]/12 rounded-full blur-[160px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <Logo size="md" subtitle="Outreach Console" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-foreground hover:text-[#635bff] transition-colors">Home</Link>
            <Link to="/features" className="text-[#635bff] font-bold">Features</Link>
            <Link to="/pricing" className="hover:text-foreground hover:text-[#635bff] transition-colors">Pricing</Link>
            <Link to="/managed-service" className="hover:text-foreground hover:text-[#635bff] transition-colors">Managed Service</Link>
            <Link to="/blog" className="hover:text-foreground hover:text-[#635bff] transition-colors">Blog</Link>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              size="sm"
              onClick={() => navigate('/login')}
              className="bg-[#635bff] hover:bg-[#534be5] text-white text-xs font-bold rounded-lg px-4 shadow-sm"
            >
              Launch Console
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 bg-[#635bff]/10 text-[#635bff] border-[#635bff]/30 px-3 py-1 font-semibold">
            <Zap className="w-3.5 h-3.5 mr-1.5 inline" /> Complete Feature Suite
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6">
            Every Tool You Need to <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#635bff] via-indigo-500 to-emerald-400">
              Land in the Inbox &amp; Convert
            </span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            From multi-sender rotation and live DNS diagnostics to multi-model AI copywriting and enterprise bot filtering, Peak Xender has you covered.
          </p>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {FEATURE_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-[#635bff] text-white shadow-lg shadow-[#635bff]/25 scale-[1.02]'
                    : 'bg-card border border-border/80 text-muted-foreground hover:text-foreground hover:bg-muted/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </div>

        {/* Active Feature Showcase */}
        <div className="rounded-3xl border border-border/80 bg-card p-8 sm:p-12 mb-24 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <Badge variant="outline" className="bg-[#635bff]/10 text-[#635bff] border-[#635bff]/30">
                {current.badge}
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {current.title}
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                {current.description}
              </p>

              <div className="space-y-3 pt-2">
                {current.highlights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-[#635bff] hover:bg-[#534be5] text-white font-bold px-6 py-5 rounded-xl shadow-md"
                >
                  Try {current.name} Free <ArrowRight className="w-4 h-4 ml-2 inline" />
                </Button>
              </div>
            </div>

            {/* Feature Stat Cards */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {current.stats.map((st, idx) => (
                <div key={idx} className="rounded-2xl border border-border/80 bg-muted/20 p-6 text-center flex flex-col justify-center">
                  <div className="text-3xl font-black text-[#635bff] mb-1">{st.value}</div>
                  <div className="text-xs text-muted-foreground font-medium">{st.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Provider Integration Grid */}
        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Works with Any Sending Infrastructure</h2>
            <p className="text-sm text-muted-foreground">
              Connect via one-click Google OAuth 2.0 or integrate custom enterprise SMTP relays.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { name: 'Gmail / Google Workspace', type: 'OAuth 2.0 Direct', icon: 'Google' },
              { name: 'Microsoft Outlook / 365', type: 'SMTP & IMAP', icon: 'Outlook' },
              { name: 'Amazon SES', type: 'High Volume SMTP', icon: 'AWS' },
              { name: 'SendGrid', type: 'API & SMTP Relay', icon: 'SendGrid' },
              { name: 'Mailgun', type: 'Transactional SMTP', icon: 'Mailgun' },
              { name: 'Zoho Mail', type: 'Custom Domain SMTP', icon: 'Zoho' },
              { name: 'iCloud Mail', type: 'App-Specific Password', icon: 'Apple' },
              { name: 'Custom Private SMTP', type: 'Self-Hosted Senders', icon: 'Server' },
            ].map((p, idx) => (
              <div key={idx} className="rounded-xl border border-border/80 bg-card p-5 text-center flex flex-col items-center justify-center space-y-1.5 hover:border-[#635bff]/60 transition-colors">
                <Server className="w-6 h-6 text-[#635bff] mb-1" />
                <div className="font-bold text-xs">{p.name}</div>
                <div className="text-[10px] text-muted-foreground">{p.type}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-[#635bff] to-indigo-600 p-8 sm:p-14 text-white text-center shadow-xl">
          <h2 className="text-3xl font-black mb-4">Start Sending with Peak Xender Today</h2>
          <p className="text-white/80 text-sm max-w-xl mx-auto mb-8">
            Experience unlimited sender accounts, AI copy generation, and real-time DNS deliverability checks.
          </p>
          <Button
            onClick={() => navigate('/login')}
            size="lg"
            className="bg-white text-[#635bff] hover:bg-white/90 font-bold px-8 py-6 rounded-xl shadow-lg"
          >
            Launch Outreach Console <ArrowRight className="w-4 h-4 ml-2 inline" />
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/60 py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Peakconix. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/contact" className="hover:text-foreground">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
