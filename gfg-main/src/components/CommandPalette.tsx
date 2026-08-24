import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  Send,
  Users,
  Inbox,
  Mail,
  FileText,
  Terminal,
  Sparkles,
  Settings,
  Plus,
  RotateCw,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

interface CommandItem {
  id: string;
  category: 'Navigation' | 'Quick Actions';
  title: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  const commands: CommandItem[] = [
    // Navigation
    {
      id: 'nav-dashboard',
      category: 'Navigation',
      title: 'Dashboard Overview',
      description: 'View real-time outreach metrics & charts',
      icon: LayoutDashboard,
      action: () => handleNavigate('/dashboard'),
      keywords: 'home stats analytics graphs',
    },
    {
      id: 'nav-campaigns',
      category: 'Navigation',
      title: 'Outreach Campaigns',
      description: 'Manage drip sequences & batch sends',
      icon: Send,
      action: () => handleNavigate('/campaigns'),
      keywords: 'sequences emails blast steps',
    },
    {
      id: 'nav-contacts',
      category: 'Navigation',
      title: 'Prospect Contacts & Leads',
      description: 'Manage CSV contact lists & lead dossiers',
      icon: Users,
      action: () => handleNavigate('/contacts'),
      keywords: 'leads prospects csv lists',
    },
    {
      id: 'nav-inbox',
      category: 'Navigation',
      title: 'Two-Way Inbox & Replies',
      description: 'Read sentiment-tagged prospect responses',
      icon: Inbox,
      action: () => handleNavigate('/inbox'),
      keywords: 'replies conversations leads unread hot',
    },
    {
      id: 'nav-accounts',
      category: 'Navigation',
      title: 'Sender Accounts (Pool)',
      description: 'Connect Google OAuth & custom SMTP senders',
      icon: Mail,
      action: () => handleNavigate('/accounts'),
      keywords: 'mailboxes smtp oauth rotating senders',
    },
    {
      id: 'nav-templates',
      category: 'Navigation',
      title: 'Email Templates',
      description: 'Craft converting cold email templates',
      icon: FileText,
      action: () => handleNavigate('/templates'),
      keywords: 'templates html draft copy',
    },
    {
      id: 'nav-logs',
      category: 'Navigation',
      title: 'Audit & Dispatch Logs',
      description: 'Inspect live email delivery transaction receipts',
      icon: Terminal,
      action: () => handleNavigate('/logs'),
      keywords: 'errors audit transactions csv',
    },
    {
      id: 'nav-ai',
      category: 'Navigation',
      title: 'AI Generator & Knowledge Rules',
      description: 'Configure OpenRouter/Gemini & brand tone',
      icon: Sparkles,
      action: () => handleNavigate('/ai-settings'),
      keywords: 'openai gemini deepseek copy rules',
    },
    {
      id: 'nav-settings',
      category: 'Navigation',
      title: 'System & Tracking Settings',
      description: 'Adjust cooldowns, batch size & suppression',
      icon: Settings,
      action: () => handleNavigate('/settings'),
      keywords: 'config suppression dnc delay batch',
    },
    // Quick Actions
    {
      id: 'act-new-campaign',
      category: 'Quick Actions',
      title: 'Create New Campaign Wizard',
      description: 'Launch a targeted multi-step sequence',
      icon: Plus,
      action: () => handleNavigate('/campaigns?new=true'),
      keywords: 'create add new blast launch',
    },
    {
      id: 'act-import-csv',
      category: 'Quick Actions',
      title: 'Import CSV Prospect Leads',
      description: 'Upload and parse prospect contact files',
      icon: Zap,
      action: () => handleNavigate('/contacts?import=true'),
      keywords: 'upload csv contacts import excel',
    },
    {
      id: 'act-sync-inbox',
      category: 'Quick Actions',
      title: 'Sync Mailbox Inboxes',
      description: 'Fetch new prospect replies across all senders',
      icon: RotateCw,
      action: () => handleNavigate('/inbox?sync=true'),
      keywords: 'sync refresh fetch replies check',
    },
    {
      id: 'act-dns-check',
      category: 'Quick Actions',
      title: 'Sender DNS Health Check',
      description: 'Validate SPF, DKIM, DMARC on mailboxes',
      icon: ShieldCheck,
      action: () => handleNavigate('/accounts?check_dns=true'),
      keywords: 'dns spf dkim dmarc mx deliverability',
    },
  ];

  // Filter commands by query
  const filteredCommands = commands.filter((cmd) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().trim();
    return (
      cmd.title.toLowerCase().includes(q) ||
      (cmd.description && cmd.description.toLowerCase().includes(q)) ||
      (cmd.keywords && cmd.keywords.toLowerCase().includes(q)) ||
      cmd.category.toLowerCase().includes(q)
    );
  });

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle arrow key navigation in command list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-start justify-center pt-20 sm:pt-28 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 text-card-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Bar Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/60 bg-muted/20">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command, page name, or search..."
            className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground bg-muted border border-border rounded">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border/20">
          {filteredCommands.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No matching commands or pages found for "{query}".
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = cmd.icon;
                return (
                  <div
                    key={cmd.id}
                    onClick={() => cmd.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate">{cmd.title}</span>
                        {cmd.description && (
                          <span className="text-[11px] text-muted-foreground truncate">{cmd.description}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-muted-foreground">
                      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60 hidden sm:inline">
                        {cmd.category}
                      </span>
                      <ArrowRight className={`h-3.5 w-3.5 transition-transform ${isSelected ? 'translate-x-0.5 text-primary' : 'opacity-40'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-t border-border/40 text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-semibold">↑</kbd>{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-semibold">↓</kbd> to navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-semibold">↵</kbd> to select
            </span>
          </div>
          <span>Peak Xender Quick Action</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
