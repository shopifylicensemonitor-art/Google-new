import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap, Upload, Search, HelpCircle, CheckCircle2,
  Clock, Download, BarChart3, Keyboard, Shield, BookOpen,
  Mail, Settings, ChevronRight, MessageSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';

const FAQS = [
  {
    question: "How does OutreachFlow rotate sending mailboxes?",
    answer: "OutreachFlow intelligently cycles through active connected sending accounts (Gmail / SMTP) in your Deliverability & Warmup pool. It balances daily send volume, enforces cooldown gaps, and pauses sending if bounce rates exceed safety thresholds."
  },
  {
    question: "Are email templates and custom variables sanitized?",
    answer: "Yes. All dynamic variables like {{first_name}}, {{company_name}}, and {{custom_field_1}} are parsed server-side and automatically checked against spam filter trigger patterns before dispatch."
  },
  {
    question: "Can I configure my own custom AI models for reply handling?",
    answer: "Absolutely. Navigate to the AI & SOP Rules settings page to connect any OpenAI-compatible API endpoint (Nvidia NIM, OpenRouter, OpenAI, Gemini, Groq, DeepSeek) or your local Ollama setup."
  },
  {
    question: "How is mailbox warm-up tracked?",
    answer: "Connected accounts go through automated peer-to-peer warmup loops. OutreachFlow gradually escalates daily send limits from 5 emails/day up to your target quota while monitoring inbox placement and SPF/DKIM health."
  },
  {
    question: "Where are my billing invoices and receipts located?",
    answer: "All monthly subscription invoices and receipt PDFs can be downloaded directly from the Settings & Billing tab in your workspace top header."
  }
];

export default function Help() {
  return (
    <AppShell>
      <SEO
        title="Knowledge Base & FAQ | OutreachFlow"
        description="Learn how to configure cold email outreach campaigns, mailbox warmup loops, custom variable templates, and AI reply assistants."
      />

      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <header className="pb-4 border-b border-border/60">
          <Badge className="bg-[#635bff]/10 text-[#635bff] border-[#635bff]/20 font-bold mb-2">
            Documentation &amp; Support
          </Badge>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Knowledge Base &amp; Setup Guide
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Master multi-account cold email outreach, deliverability safety, and automated reply handling.
          </p>
        </header>

        {/* Quick Start Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-card rounded-xl border border-border/60 p-5 shadow-2xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-[#635bff]/10 text-[#635bff] flex items-center justify-center font-bold">
              <Mail className="h-5 w-5" />
            </div>
            <h3 className="font-heading text-sm font-bold text-foreground">1. Connect Mailboxes</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Add Google Workspace or custom SMTP accounts in Deliverability &amp; Warmup to enable rotation.
            </p>
            <Link to="/accounts" className="text-xs font-bold text-[#635bff] hover:underline flex items-center gap-1">
              Manage Mailboxes <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-card rounded-xl border border-border/60 p-5 shadow-2xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-[#635bff]/10 text-[#635bff] flex items-center justify-center font-bold">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="font-heading text-sm font-bold text-foreground">2. Import Leads</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Upload CSV prospect files with custom attributes into your Prospects database.
            </p>
            <Link to="/contacts" className="text-xs font-bold text-[#635bff] hover:underline flex items-center gap-1">
              View Prospects <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="bg-card rounded-xl border border-border/60 p-5 shadow-2xs space-y-3">
            <div className="w-9 h-9 rounded-lg bg-[#635bff]/10 text-[#635bff] flex items-center justify-center font-bold">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-heading text-sm font-bold text-foreground">3. Launch Campaign</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Design multi-step email sequences with smart variable merge fields and AI copy rules.
            </p>
            <Link to="/campaigns" className="text-xs font-bold text-[#635bff] hover:underline flex items-center gap-1">
              Campaigns Hub <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[#635bff]" />
            <h2 className="font-heading text-lg font-bold text-foreground">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="bg-card rounded-xl border border-border/60 p-5 shadow-2xs space-y-2">
                <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] text-[#635bff] font-bold">
                    Q
                  </span>
                  {faq.question}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Need Help Banner */}
        <div className="bg-gradient-to-r from-[#635bff]/10 via-purple-500/5 to-transparent border border-[#635bff]/20 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-heading text-base font-bold text-foreground">Need dedicated setup assistance?</h3>
            <p className="text-xs text-muted-foreground">
              Our deliverability team can help audit your DNS records (SPF, DKIM, DMARC) and campaign setup.
            </p>
          </div>
          <Link to="/settings">
            <Button className="h-9 px-4 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white">
              Contact Workspace Support
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
