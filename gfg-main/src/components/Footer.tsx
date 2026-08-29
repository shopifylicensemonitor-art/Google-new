import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { 
  Mail, MessageCircle, HelpCircle, Shield, FileText, 
  Info, Home, Instagram, Facebook, BarChart3, BookOpen,
  CheckCircle2, Lock, Zap, Server, Send
} from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full py-14 mt-20 border-t border-border/60 bg-card/40 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Column 1: Brand, Mission & System Status */}
          <div className="lg:col-span-2 space-y-4">
            <Logo size="sm" subtitle="Accelerated Outreach & Deliverability" />
            <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
              Enterprise-grade cold email outreach infrastructure. Multi-sender rotation, automated deliverability protection, and real-time inbox synchronization.
            </p>

            {/* Live Operational Status Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>All Systems Operational</span>
              <span className="text-[10px] text-muted-foreground font-mono">99.9% Uptime</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-primary" /> AES-256 Encrypted</span>
              <span>•</span>
              <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-emerald-500" /> CAN-SPAM Compliant</span>
            </div>
          </div>

          {/* Column 2: Product & Features */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Product</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/features" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Core Features
                </Link>
              </li>
              <li>
                <Link to="/templates" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Message Templates
                </Link>
              </li>
              <li>
                <Link to="/accounts" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <Server className="h-3 w-3" /> Sender Mailboxes
                </Link>
              </li>
              <li>
                <Link to="/campaigns" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <Send className="h-3 w-3" /> Sequence Engine
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3" /> Pricing & Plans
                </Link>
              </li>
              <li>
                <Link to="/managed-service" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-amber-500" /> Managed Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources & Guides */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Resources</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/blog/mastering-cold-email-deliverability" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <BookOpen className="h-3 w-3" /> Deliverability Guide
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Outreach Insights
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <HelpCircle className="h-3 w-3" /> Help Center
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <Info className="h-3 w-3" /> About Peak Xender
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <Shield className="h-3 w-3" /> Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                  <FileText className="h-3 w-3" /> Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Direct Support & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Get In Touch</h4>
            <div className="space-y-2">
              <a 
                href="mailto:peakxender@gmail.com" 
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-card/60 hover:bg-primary/5 hover:border-primary/40 transition-all text-xs text-muted-foreground hover:text-foreground group"
              >
                <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="font-mono truncate">peakxender@gmail.com</span>
              </a>

              <a 
                href="https://wa.me/2347058176122" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-card/60 hover:bg-emerald-500/5 hover:border-emerald-500/40 transition-all text-xs text-muted-foreground hover:text-foreground group"
              >
                <MessageCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span className="font-mono truncate">+234 705 817 6122</span>
              </a>

              <div className="flex items-center gap-2 pt-1">
                <a 
                  href="https://www.instagram.com/peakconix" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-lg border border-border/60 bg-card/60 hover:bg-pink-500/10 hover:border-pink-500/40 text-muted-foreground hover:text-pink-500 transition-colors"
                  title="Instagram"
                >
                  <Instagram className="h-4 w-4" />
                </a>
                <a 
                  href="https://www.facebook.com/share/18ci8zQYkf/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2 rounded-lg border border-border/60 bg-card/60 hover:bg-blue-600/10 hover:border-blue-600/40 text-muted-foreground hover:text-blue-500 transition-colors"
                  title="Facebook"
                >
                  <Facebook className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Peak Xender. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/help" className="hover:text-primary transition-colors">Security & Trust</Link>
            <span>v3.4.0</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
