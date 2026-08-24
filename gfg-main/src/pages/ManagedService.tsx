import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Briefcase, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Send,
  Headphones
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ManagedService() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    monthlyVolume: '5,000–25,000 emails/mo',
    notes: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast({
      title: 'Inquiry Received',
      description: 'Our Managed Outreach team will contact you within 24 hours.',
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans selection:bg-[#635bff]/20 relative overflow-hidden">
      <SEO
        title="Done-For-You Managed Cold Outreach Service — Peak Xender"
        description="Let our expert deliverability team handle domain setup, DNS configuration, lead scraping, AI copywriting, and campaign management."
        canonicalUrl="https://send.peakconix.site/managed-service"
      />

      {/* Background glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#635bff]/12 rounded-full blur-[160px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-card/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center group">
            <Logo size="md" subtitle="Outreach Console" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Link to="/" className="hover:text-foreground hover:text-[#635bff] transition-colors">Home</Link>
            <Link to="/features" className="hover:text-foreground hover:text-[#635bff] transition-colors">Features</Link>
            <Link to="/pricing" className="hover:text-foreground hover:text-[#635bff] transition-colors">Pricing</Link>
            <Link to="/managed-service" className="text-[#635bff] font-bold">Managed Service</Link>
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
            <Briefcase className="w-3.5 h-3.5 mr-1.5 inline" /> Done-For-You Outreach Fleet
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight mb-6">
            We Build, Warm Up, and Run <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#635bff] via-indigo-500 to-emerald-400">
              Your Entire Outreach Engine
            </span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Don't have time to buy secondary domains, configure SPF/DKIM/DMARC records, scrape prospect lists, and write spintax copies? Our managed team handles everything from infrastructure to qualified leads.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {[
            {
              icon: ShieldCheck,
              title: 'Infrastructure & DNS Fleet',
              desc: 'We procure secondary domains, set up isolated Google Workspace / SMTP inboxes, and configure custom SPF, DKIM, DMARC, and MX records for 100% inbox placement.'
            },
            {
              icon: Sparkles,
              title: 'Targeting & AI Copywriting',
              desc: 'We curate high-intent B2B prospect lists, enrich verified business emails, and write bespoke multi-step spintax sequences tuned to your exact value proposition.'
            },
            {
              icon: Headphones,
              title: 'Lead Handoff & Booking',
              desc: 'Our sentiment AI filters out out-of-office responses and bounces, instantly routing hot and interested replies directly to your sales reps or booking calendar.'
            }
          ].map((card, idx) => {
            const Icon = card.icon;
            return (
              <div key={idx} className="rounded-2xl border border-border/80 bg-card p-8 flex flex-col justify-between shadow-sm hover:border-[#635bff]/50 transition-colors">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#635bff]/10 text-[#635bff] flex items-center justify-center mb-6">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{card.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Inquiry Form & Consultation */}
        <div className="rounded-3xl border border-border/80 bg-card p-8 sm:p-12 max-w-3xl mx-auto shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Request a Managed Outreach Consultation</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Tell us about your target market and target lead volume. We'll map out a custom deliverability plan.
            </p>
          </div>

          {submitted ? (
            <div className="p-8 text-center space-y-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">Consultation Request Received!</h3>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                Thank you! Our senior deliverability strategist will review your requirements and reach out via email with an outreach blueprint.
              </p>
              <Button onClick={() => setSubmitted(false)} variant="outline" size="sm" className="mt-4">
                Submit Another Inquiry
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Your Name</label>
                  <input
                    required
                    type="text"
                    placeholder="Jane Doe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#635bff]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Work Email</label>
                  <input
                    required
                    type="email"
                    placeholder="jane@company.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#635bff]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Company Website</label>
                  <input
                    required
                    type="text"
                    placeholder="company.com"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#635bff]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Target Monthly Volume</label>
                  <select
                    value={formData.monthlyVolume}
                    onChange={(e) => setFormData({ ...formData, monthlyVolume: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#635bff]"
                  >
                    <option>5,000–15,000 emails/mo</option>
                    <option>15,000–50,000 emails/mo</option>
                    <option>50,000–150,000 emails/mo</option>
                    <option>150,000+ emails/mo (Enterprise Fleet)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Campaign Goals & Target Audience</label>
                <textarea
                  rows={3}
                  placeholder="e.g., We are selling B2B SaaS to Shopify Plus store owners and need 30 qualified demos/month."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#635bff]"
                />
              </div>

              <Button
                type="submit"
                className="w-full py-5 rounded-xl font-bold bg-[#635bff] hover:bg-[#534be5] text-white shadow-md transition-transform active:scale-[0.98]"
              >
                Request Custom Outreach Strategy <ArrowRight className="w-4 h-4 ml-2 inline" />
              </Button>
            </form>
          )}
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
