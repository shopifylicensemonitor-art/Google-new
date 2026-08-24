import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Check, 
  Sparkles, 
  ArrowRight, 
  Calculator
} from 'lucide-react';

interface Tier {
  name: string;
  id: string;
  priceMonthly: number;
  priceAnnual: number;
  description: string;
  features: string[];
  highlight?: boolean;
  ctaText: string;
}

const TIERS: Tier[] = [
  {
    name: 'Open Source / Self-Hosted',
    id: 'oss',
    priceMonthly: 0,
    priceAnnual: 0,
    description: 'Complete freedom. Run on your own server or desktop with zero account limits.',
    features: [
      'Unlimited Sender Accounts (OAuth + SMTP)',
      'Multi-Step Drip Sequences',
      'Spintax Engine & Merge Tags',
      'Live DNS Health Diagnostics (SPF/DKIM/DMARC)',
      'Enterprise Anti-Bot Scanner Filtering',
      'Dual Storage (SQLite & Supabase Postgres)',
      'Community Support & Documentation',
    ],
    ctaText: 'Deploy Self-Hosted',
  },
  {
    name: 'Pro Cloud Fleet',
    id: 'pro',
    priceMonthly: 29,
    priceAnnual: 19,
    description: 'Turnkey cloud delivery with multi-model AI copywriting & automated webhook dispatching.',
    highlight: true,
    features: [
      'Everything in Open Source',
      'Unlimited Sender Inboxes (No Per-Seat Fee)',
      'Multi-Model AI Copywriter (5 Providers)',
      'AI Sentiment Classification (Hot Leads Tagging)',
      'Real-Time Webhook Dispatching (CRM / Slack)',
      'Priority Delivery Queue & Auto-Throttling',
      'Automatic Reply Auto-Stop Protection',
      'Global Command Palette (Ctrl+K)',
    ],
    ctaText: 'Start 14-Day Free Trial',
  },
  {
    name: 'Enterprise Fleet',
    id: 'enterprise',
    priceMonthly: 79,
    priceAnnual: 59,
    description: 'Dedicated infrastructure, custom webhook pipes, and high-volume multi-tenancy.',
    features: [
      'Everything in Pro Cloud',
      'Custom Dedicated SOCKS5/HTTP Proxies',
      'Dedicated IP Warmup & Reputation Pool',
      'Multi-Tenant Tenant Isolation (Row-Level Security)',
      'Custom LLM Fine-Tuning & Knowledge Base',
      '99.99% SLA & Dedicated Slack Engineer',
      'Done-For-You Domain & DNS Configuration',
    ],
    ctaText: 'Contact Enterprise',
  },
];

const COMPARISON_ROWS = [
  { feature: 'Price Model', peak: 'Flat Unlimited Accounts', outreachBin: '$19.97–$39.99 PER INBOX', instantly: '$97+/mo (Tiered)' },
  { feature: 'Sender Inboxes Allowed', peak: 'Unlimited', outreachBin: '1 per Stack', instantly: 'Tiered' },
  { feature: 'Google OAuth 2.0 & SMTP', peak: 'Yes', outreachBin: 'Yes', instantly: 'Yes' },
  { feature: 'Multi-Model AI Copywriting', peak: '5 Providers (DeepSeek, Claude, GPT, Gemini)', outreachBin: 'No', instantly: 'Add-on' },
  { feature: 'DNS Health Check (SPF/DKIM/DMARC)', peak: 'Yes (Live Resolver)', outreachBin: 'Basic', instantly: 'Basic' },
  { feature: 'Enterprise Anti-Bot Click Filter', peak: 'Yes (Proofpoint, Barracuda filter)', outreachBin: 'No', instantly: 'Partial' },
  { feature: 'AI Sentiment Lead Classification', peak: 'Yes (Hot Lead Auto-Tag)', outreachBin: 'No', instantly: 'No' },
  { feature: 'Real-Time Hot Lead Webhooks', peak: 'Yes (Slack/CRM Instant Dispatch)', outreachBin: 'Zapier Only', instantly: 'Webhook' },
  { feature: 'Self-Hosting / Data Ownership', peak: 'Yes (Full Code & DB)', outreachBin: 'No (Closed SaaS)', instantly: 'No (Closed SaaS)' },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [inboxCount, setInboxCount] = useState<number>(10);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Calculate competitor cost vs Peak Xender
  const competitorMonthlyPerInbox = 29.99; // OutreachBin average stack
  const competitorTotal = inboxCount * competitorMonthlyPerInbox;
  const peakTotal = billingCycle === 'annual' ? 19 : 29;
  const monthlySavings = Math.max(0, competitorTotal - peakTotal);
  const annualSavings = monthlySavings * 12;

  const faqs = [
    {
      q: 'Why does Peak Xender not charge per email account?',
      a: 'Traditional cold outreach platforms charge $20 to $40 per inbox because they profit from deliverability scaling. Peak Xender uses modern round-robin architecture connecting to your Google OAuth or custom SMTP credentials directly, eliminating arbitrary per-seat markups.'
    },
    {
      q: 'How does Peak Xender protect sender reputation without a warm-up fee?',
      a: 'Peak Xender features live SPF/DKIM/DMARC DNS Health Diagnostics, humanized batch delays, zero-width space anti-fingerprinting, and automated sentiment-based unsubscribe handling.'
    },
    {
      q: 'Can I self-host Peak Xender on my own server?',
      a: 'Yes! The Open Source edition is 100% self-hostable with dual-engine storage (SQLite for local zero-setup deployment and PostgreSQL/Supabase for cloud scalability).'
    },
    {
      q: 'How does the AI Copywriter work?',
      a: 'Peak Xender connects to multi-provider AI backends (DeepSeek, Claude 3.5, GPT-4o, and Google Gemini). You can generate customized spintax sequences, tailored icebreakers, and custom follow-up campaigns in seconds.'
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#635bff]/20 relative overflow-hidden">
      <SEO
        title="Pricing & Plan Comparison — Peak Xender"
        description="Transparent pricing with zero per-inbox fees. Compare Peak Xender against OutreachBin and Instantly to see how much you save on cold email outreach."
        canonicalUrl="https://send.peakconix.site/pricing"
      />

      {/* Ambient background glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#635bff]/12 rounded-full blur-[160px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <Logo size="md" subtitle="Outreach Console" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-foreground hover:text-[#635bff] transition-colors">Home</Link>
            <Link to="/#features" className="hover:text-foreground hover:text-[#635bff] transition-colors">Features</Link>
            <Link to="/pricing" className="text-[#635bff] font-bold">Pricing</Link>
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

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Badge variant="outline" className="mb-4 bg-[#635bff]/10 text-[#635bff] border-[#635bff]/30 px-3 py-1 font-semibold">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 inline" /> Transparent Economics
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6">
            One Flat Price. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#635bff] via-indigo-500 to-emerald-400">
              Zero Per-Inbox Markups.
            </span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Other platforms charge $20 to $40 for every single email account. Peak Xender empowers you to rotate unlimited sending accounts with zero penalty.
          </p>

          {/* Billing Switch */}
          <div className="mt-8 inline-flex items-center bg-card border border-border p-1 rounded-xl shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-5 py-2 text-xs font-semibold rounded-lg transition-all ${
                billingCycle === 'monthly' ? 'bg-[#635bff] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                billingCycle === 'annual' ? 'bg-[#635bff] text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual Billing <span className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">Save 35%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {TIERS.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl p-8 flex flex-col justify-between border transition-all duration-300 ${
                tier.highlight 
                  ? 'bg-card border-[#635bff] shadow-xl shadow-[#635bff]/10 ring-2 ring-[#635bff]/50 scale-[1.02]' 
                  : 'bg-card/60 border-border/80 hover:border-border'
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#635bff] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                <p className="text-xs text-muted-foreground mb-6 min-h-[32px]">{tier.description}</p>
                
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl sm:text-5xl font-black">
                    ${billingCycle === 'annual' ? tier.priceAnnual : tier.priceMonthly}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">/ month</span>
                </div>

                <div className="h-px bg-border/60 mb-6" />

                <ul className="space-y-3 mb-8">
                  {tier.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90">
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                onClick={() => navigate('/login')}
                className={`w-full py-5 rounded-xl font-bold text-sm shadow-md transition-transform active:scale-[0.98] ${
                  tier.highlight
                    ? 'bg-[#635bff] hover:bg-[#534be5] text-white'
                    : 'bg-secondary hover:bg-secondary/80 text-foreground border border-border/60'
                }`}
              >
                {tier.ctaText} <ArrowRight className="w-4 h-4 ml-1.5 inline" />
              </Button>
            </div>
          ))}
        </div>

        {/* Interactive Savings Calculator */}
        <div className="rounded-3xl bg-gradient-to-br from-card to-card/40 border border-border/80 p-8 sm:p-12 mb-24 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <Calculator className="w-3.5 h-3.5 mr-1.5 inline" /> ROI Comparison Calculator
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                How much are you losing to per-inbox fees?
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Platforms like OutreachBin charge ~$30/month for each email account you warm up and rotate. Slide the bar to see your immediate cost reduction with Peak Xender.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span>Number of Sending Inboxes:</span>
                  <span className="text-lg font-bold text-[#635bff]">{inboxCount} accounts</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={inboxCount}
                  onChange={(e) => setInboxCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-[#635bff]"
                />
                <div className="flex justify-between text-[11px] text-muted-foreground">
                  <span>1 Inbox (Solo)</span>
                  <span>25 Inboxes (Agency)</span>
                  <span>50 Inboxes (Enterprise)</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-card/90 rounded-2xl border border-border p-6 flex flex-col justify-center space-y-4 shadow-inner">
              <div className="flex justify-between items-center text-xs border-b border-border/60 pb-3">
                <span className="text-muted-foreground">OutreachBin / Per-Stack Platforms:</span>
                <span className="font-bold text-red-500">${competitorTotal.toFixed(2)}/mo</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-border/60 pb-3">
                <span className="text-muted-foreground">Peak Xender (Flat Fleet):</span>
                <span className="font-bold text-emerald-500">${peakTotal.toFixed(2)}/mo</span>
              </div>
              <div className="pt-2">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Your Monthly Savings</p>
                <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">
                  ${monthlySavings.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">/ mo</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  That's <strong className="text-foreground">${annualSavings.toFixed(2)}</strong> saved every single year.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full Head-to-Head Comparison Matrix */}
        <div className="mb-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold tracking-tight mb-3">Feature-by-Feature Competitor Matrix</h2>
            <p className="text-sm text-muted-foreground">
              See why high-volume email operators are migrating from per-account vendors to Peak Xender.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border/80 bg-card shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 border-b border-border font-semibold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-4 sm:p-5">Capability / Feature</th>
                  <th className="p-4 sm:p-5 text-[#635bff] font-bold">Peak Xender</th>
                  <th className="p-4 sm:p-5">OutreachBin</th>
                  <th className="p-4 sm:p-5">Instantly</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 font-medium">
                {COMPARISON_ROWS.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 sm:p-5 font-semibold text-foreground">{row.feature}</td>
                    <td className="p-4 sm:p-5 text-[#635bff] font-bold">{row.peak}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{row.outreachBin}</td>
                    <td className="p-4 sm:p-5 text-muted-foreground">{row.instantly}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto mb-20">
          <div className="text-center mb-10">
            <Badge variant="outline" className="mb-2">Questions & Answers</Badge>
            <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
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
        </div>

        {/* Final CTA */}
        <div className="rounded-3xl bg-gradient-to-r from-[#635bff] to-indigo-600 p-8 sm:p-14 text-white text-center shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
              Ready to scale cold outreach without paying per inbox?
            </h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Join growth teams and outreach specialists who rely on Peak Xender for high deliverability, AI copy generation, and infinite sender rotation.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-2">
              <Button
                onClick={() => navigate('/login')}
                size="lg"
                className="bg-white text-[#635bff] hover:bg-white/90 font-bold px-8 py-6 rounded-xl shadow-lg"
              >
                Launch Outreach Console <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-card/60 py-8 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} Peakconix. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
            <Link to="/contact" className="hover:text-foreground">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
