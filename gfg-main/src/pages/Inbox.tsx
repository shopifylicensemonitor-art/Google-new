import React, { useState, useEffect, useMemo, useRef } from 'react';
import { api, type InboxMessage, type InboxCounts, type Account } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { PullToRefresh } from '@/components/PullToRefresh';
import { SwipeableListItem } from '@/components/SwipeableListItem';
import { RecentSearchInput } from '@/components/RecentSearchInput';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Inbox as InboxIcon, RefreshCw, Mail, Flame, CheckCircle2, 
  Sparkles, Send, User, Building2, Tag, Search, Filter,
  ArrowLeft, Trash2, Paperclip, Bold, Italic, Rocket, Check,
  Star, ChevronDown, CheckSquare, Square, MoreHorizontal,
  Folder, ShieldAlert, Clock, MessageSquare, AlertCircle,
  HelpCircle, Eye, EyeOff, X, Copy, ExternalLink, Globe,
  CornerDownRight, Zap, ListFilter
} from 'lucide-react';

export default function Inbox() {
  // Main Data States
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [counts, setCounts] = useState<InboxCounts | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Selected State
  const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeSegment, setActiveSegment] = useState<string>('primary'); // 'primary', 'hot_lead', 'question', 'starred', 'unsubscribe', 'all', 'campaign:...'
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Thread Data State
  const [threadLoading, setThreadLoading] = useState<boolean>(false);
  const [threadMessages, setThreadMessages] = useState<InboxMessage[]>([]);
  const [outboundHistory, setOutboundHistory] = useState<any[]>([]);

  // Reply Composer State
  const [isComposerOpen, setIsComposerOpen] = useState<boolean>(false);
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [draftingAI, setDraftingAI] = useState<boolean>(false);

  // Layout & UI
  const [showMobileDetail, setShowMobileDetail] = useState<boolean>(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState<boolean>(false);
  const [showDossier, setShowDossier] = useState<boolean>(false);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState<boolean>(false);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Load Accounts & Counts
  const loadInitialData = async () => {
    try {
      const [accs, cnts] = await Promise.all([
        api.getAccounts().catch(() => []),
        api.getInboxCounts().catch(() => null)
      ]);
      setAccounts(accs);
      if (cnts) setCounts(cnts);
    } catch (_) {}
  };

  // Load Messages based on filters
  const loadMessages = React.useCallback(async (keepSelected = true) => {
    setLoading(true);
    try {
      const params: any = { limit: 150 };
      if (selectedAccountId !== 'all') {
        params.account_id = selectedAccountId;
      }
      if (activeSegment === 'starred') {
        params.starred = true;
      } else if (activeSegment === 'hot_lead' || activeSegment === 'question' || activeSegment === 'unsubscribe') {
        params.sentiment = activeSegment;
      } else if (activeSegment === 'primary') {
        // Primary shows unread or recent
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }

      const data = await api.getInboxMessages(params);
      setMessages(data);

      // Refresh Counts in background
      api.getInboxCounts().then(c => setCounts(c)).catch(() => {});

      if (data.length > 0) {
        if (!keepSelected || !selectedMsg || !data.some(m => m.id === selectedMsg.id)) {
          setSelectedMsg(data[0]);
        }
      } else {
        setSelectedMsg(null);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load inbox', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId, activeSegment, searchQuery, selectedMsg]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadMessages(false);
  }, [selectedAccountId, activeSegment, searchQuery]);

  // Load Thread details whenever selectedMsg changes
  useEffect(() => {
    if (!selectedMsg) {
      setThreadMessages([]);
      setOutboundHistory([]);
      return;
    }

    let isCurrent = true;
    setThreadLoading(true);
    api.getInboxThread(selectedMsg.id)
      .then(res => {
        if (!isCurrent) return;
        setThreadMessages(res.thread && res.thread.length > 0 ? res.thread : [selectedMsg]);
        setOutboundHistory(res.outbound_history || []);
      })
      .catch(() => {
        if (!isCurrent) return;
        setThreadMessages([selectedMsg]);
        setOutboundHistory([]);
      })
      .finally(() => {
        if (isCurrent) setThreadLoading(false);
      });

    // Auto mark as read
    if (!selectedMsg.is_read) {
      api.markInboxRead(selectedMsg.id).catch(() => {});
      setMessages(prev => prev.map(m => m.id === selectedMsg.id ? { ...m, is_read: 1 } : m));
      setCounts(prev => prev ? { ...prev, unread: Math.max(0, prev.unread - 1), primary: Math.max(0, prev.primary - 1) } : null);
    }

    return () => { isCurrent = false; };
  }, [selectedMsg?.id]);

  // Handle Sync
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.syncInbox();
      toast({
        title: 'Inbox Synchronized',
        description: res.message || 'Checked all connected mailboxes for new prospect messages.'
      });
      await loadInitialData();
      await loadMessages(true);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  // Star Toggle
  const handleToggleStar = async (msg: InboxMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStarred = msg.is_starred ? 0 : 1;
    // Optimistic UI update
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_starred: newStarred } : m));
    if (selectedMsg?.id === msg.id) {
      setSelectedMsg(prev => prev ? { ...prev, is_starred: newStarred } : null);
    }
    try {
      await api.starInboxMessage(msg.id);
      setCounts(prev => prev ? {
        ...prev,
        starred: newStarred ? prev.starred + 1 : Math.max(0, prev.starred - 1)
      } : null);
    } catch (err: any) {
      // Revert on error
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_starred: msg.is_starred } : m));
      toast({ variant: 'destructive', title: 'Action failed', description: err.message });
    }
  };

  // Delete message
  const handleDeleteMsg = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selectedMsg?.id === id) {
      setSelectedMsg(null);
      setShowMobileDetail(false);
    }
    toast({ title: 'Message Deleted', description: 'Removed from inbox view.' });
    try {
      await api.deleteInboxMessage(id);
      api.getInboxCounts().then(c => setCounts(c)).catch(() => {});
    } catch (_) {}
  };

  // Multi-select actions
  const handleSelectAll = () => {
    if (selectedIds.size === filteredMessages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMessages.map(m => m.id)));
    }
  };

  const handleToggleSelectId = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAction = async (action: 'mark_read' | 'mark_unread' | 'star' | 'unstar' | 'delete') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    if (action === 'delete') {
      setMessages(prev => prev.filter(m => !selectedIds.has(m.id)));
      if (selectedMsg && selectedIds.has(selectedMsg.id)) {
        setSelectedMsg(null);
      }
    } else if (action === 'mark_read') {
      setMessages(prev => prev.map(m => selectedIds.has(m.id) ? { ...m, is_read: 1 } : m));
    } else if (action === 'mark_unread') {
      setMessages(prev => prev.map(m => selectedIds.has(m.id) ? { ...m, is_read: 0 } : m));
    } else if (action === 'star') {
      setMessages(prev => prev.map(m => selectedIds.has(m.id) ? { ...m, is_starred: 1 } : m));
    }

    setSelectedIds(new Set());
    toast({ title: 'Action Applied', description: `Updated ${ids.length} conversations.` });

    try {
      await api.bulkInboxAction(ids, action);
      api.getInboxCounts().then(c => setCounts(c)).catch(() => {});
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Bulk action error', description: err.message });
      loadMessages(true);
    }
  };

  // AI Reply Draft
  const handleAIReplyDraft = async () => {
    if (!selectedMsg) return;
    setIsComposerOpen(true);
    setDraftingAI(true);
    try {
      const res = await api.aiReplyDraft({
        incomingSubject: selectedMsg.subject || '',
        incomingBody: selectedMsg.body_text || selectedMsg.body_html || '',
        senderEmail: selectedMsg.sender_email,
        contactFields: selectedMsg.contact_fields || {}
      });
      if (res.success && res.replyDraft) {
        setReplyText(res.replyDraft);
        toast({ title: 'AI Reply Drafted', description: 'Generated intelligent prospect reply based on outreach context.' });
        setTimeout(() => replyTextareaRef.current?.focus(), 50);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'AI Draft Failed', description: err.message });
    } finally {
      setDraftingAI(false);
    }
  };

  // Send Reply
  const handleSendReply = async () => {
    if (!selectedMsg || !replyText.trim()) return;
    setSendingReply(true);
    const tempReply = replyText;
    try {
      const res = await api.replyToInboxMessage(selectedMsg.id, tempReply);
      toast({ title: 'Reply Dispatched', description: res.message || 'Response queued and sent successfully.' });
      setReplyText('');
      setIsComposerOpen(false);
      
      // Optimistically append sent reply to the thread stream
      const optimisticMsg: InboxMessage = {
        id: Date.now(),
        account_id: selectedMsg.account_id,
        account_email: selectedMsg.recipient_email || 'Me',
        sender_email: selectedMsg.recipient_email || 'me@domain.com',
        recipient_email: selectedMsg.sender_email,
        subject: `Re: ${selectedMsg.subject || 'Outreach'}`,
        body_text: tempReply,
        body_html: `<p>${tempReply.replace(/\n/g, '<br/>')}</p>`,
        sentiment: 'sent',
        is_read: 1,
        created_at: new Date().toISOString(),
      };
      setThreadMessages(prev => [...prev, optimisticMsg]);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Send Failed', description: err.message });
    } finally {
      setSendingReply(false);
    }
  };

  // Keyboard Shortcuts (j/k to navigate, s to star, e to delete, r to reply, esc to close composer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isComposerOpen) {
        setIsComposerOpen(false);
        return;
      }

      // Don't trigger other navigation shortcuts when typing in input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!selectedMsg || filteredMessages.length === 0) return;
        const idx = filteredMessages.findIndex(m => m.id === selectedMsg.id);
        if (idx < filteredMessages.length - 1) {
          setSelectedMsg(filteredMessages[idx + 1]);
        }
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!selectedMsg || filteredMessages.length === 0) return;
        const idx = filteredMessages.findIndex(m => m.id === selectedMsg.id);
        if (idx > 0) {
          setSelectedMsg(filteredMessages[idx - 1]);
        }
      } else if (e.key === 's' && selectedMsg) {
        e.preventDefault();
        handleToggleStar(selectedMsg);
      } else if (e.key === 'e' && selectedMsg) {
        e.preventDefault();
        handleDeleteMsg(selectedMsg.id);
      } else if (e.key === 'r') {
        e.preventDefault();
        setIsComposerOpen(true);
        setTimeout(() => replyTextareaRef.current?.focus(), 50);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMsg, messages, isComposerOpen]);

  // Client-side filtering
  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      if (activeSegment === 'hot_lead' && m.sentiment !== 'hot_lead') return false;
      if (activeSegment === 'question' && m.sentiment !== 'question') return false;
      if (activeSegment === 'unsubscribe' && m.sentiment !== 'unsubscribe') return false;
      if (activeSegment === 'starred' && !m.is_starred) return false;
      if (activeSegment.startsWith('campaign:')) {
        const campaignName = activeSegment.replace('campaign:', '');
        if (m.contact_list !== campaignName) return false;
      }
      return true;
    });
  }, [messages, activeSegment]);

  // Helpers
  const getInitials = (email: string) => {
    const namePart = email.split('@')[0];
    const parts = namePart.split(/[._-]/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return namePart.substring(0, 2).toUpperCase();
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getSentimentBadge = (sentiment?: string) => {
    switch (sentiment) {
      case 'hot_lead':
        return (
          <span 
            role="status"
            aria-label="Interested Lead"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] uppercase tracking-wider border border-emerald-500/30 shadow-xs"
          >
            <Flame className="h-3 w-3 fill-emerald-500 text-emerald-500" aria-hidden="true" /> Interested
          </span>
        );
      case 'question':
        return (
          <span 
            role="status"
            aria-label="Information Request"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold text-[10px] uppercase tracking-wider border border-blue-500/30 shadow-xs"
          >
            <HelpCircle className="h-3 w-3 text-blue-500" aria-hidden="true" /> Question
          </span>
        );
      case 'unsubscribe':
        return (
          <span 
            role="status"
            aria-label="Opt-out Request"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold text-[10px] uppercase tracking-wider border border-rose-500/30"
          >
            <ShieldAlert className="h-3 w-3 text-rose-500" aria-hidden="true" /> Opt-out
          </span>
        );
      case 'sent':
        return (
          <span 
            role="status"
            aria-label="Replied Message"
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/15 text-primary dark:text-primary-foreground font-bold text-[10px] uppercase tracking-wider border border-primary/30"
          >
            <Send className="h-3 w-3" aria-hidden="true" /> Replied
          </span>
        );
      default:
        return (
          <span 
            role="status"
            aria-label="Neutral Message"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground/80 font-medium text-[10px] tracking-wider border border-border/70"
          >
            Neutral
          </span>
        );
    }
  };

  // Distinct Campaign names from messages for campaign folder sidebar
  const campaignFolders = useMemo(() => {
    const countsMap: Record<string, number> = {};
    messages.forEach(m => {
      const list = m.contact_list || 'Direct Outreach';
      countsMap[list] = (countsMap[list] || 0) + 1;
    });
    return Object.entries(countsMap).map(([name, count]) => ({ name, count }));
  }, [messages]);

  const selectedAccountObj = accounts.find(a => String(a.id) === selectedAccountId);

  return (
    <AppShell>
      <SEO title="Unified Inbox & Two-Way Mail | Outreach SaaS" description="Gmail-inspired prospect receiving, lead intelligence, and instant AI replies." />

      {/* Main Container */}
      <div className="h-[calc(100vh-100px)] flex flex-col bg-background rounded-xl border border-border/70 overflow-hidden shadow-sm">
        
        {/* Top App Header / Global Toolbar */}
        <header className="h-14 px-4 bg-card border-b border-border/70 flex items-center justify-between shrink-0 gap-3">
          
          {/* Left: Mobile Toggle & Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
              className="md:hidden min-h-[36px] min-w-[36px] flex items-center justify-center text-foreground hover:bg-muted rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Toggle folder categories navigation"
              aria-expanded={showMobileSidebar}
            >
              <ListFilter className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold" aria-hidden="true">
                <InboxIcon className="h-4 w-4" />
              </div>
              <div>
                <h1 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                  Unified Inbox
                  {counts && counts.unread > 0 && (
                    <span 
                      role="status"
                      aria-label={`${counts.unread} unread messages`}
                      className="text-[10px] bg-primary text-primary-foreground font-extrabold px-2 py-0.5 rounded-full"
                    >
                      {counts.unread} new
                    </span>
                  )}
                </h1>
              </div>
            </div>
          </div>

          {/* Center: Search Box */}
          <div className="flex-1 max-w-md hidden sm:block">
            <RecentSearchInput
              storageKey="inbox_search_history"
              placeholder="Search by sender, email body, subject or domain..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="pl-8 h-8 text-xs bg-background flex w-full rounded-md border border-input px-3 py-1 shadow-2xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              containerClassName="relative w-full"
              iconClassName="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            />
          </div>

          {/* Right: Sync Button & Status */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="outline"
              size="sm"
              aria-label="Synchronize all connected mailboxes"
              className="h-8 text-xs font-semibold gap-1.5 border-border/80 hover:bg-muted/80 shadow-2xs focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
              <span className="hidden md:inline">{syncing ? 'Syncing Mail...' : 'Sync Mailboxes'}</span>
            </Button>
          </div>
        </header>

        {/* 4-Column Systematic Layout */}
        <div className="flex-1 flex overflow-hidden relative" role="main">
          
          {/* ========================================================================= */}
          {/* COLUMN 1: Gmail-Style Sidebar / Smart Folders & Account Switcher (230px) */}
          {/* ========================================================================= */}
          <nav 
            aria-label="Mailbox folders and categories"
            className={`w-[230px] shrink-0 border-r border-border/70 bg-card/95 backdrop-blur-md flex flex-col h-full z-20 ${showMobileSidebar ? 'absolute inset-y-0 left-0 bg-card shadow-2xl flex' : 'hidden md:flex'}`}
          >
            
            {/* Account Switcher Dropdown */}
            <div className="p-3 border-b border-border/50">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountDropdownOpen(!accountDropdownOpen)}
                  aria-haspopup="listbox"
                  aria-expanded={accountDropdownOpen}
                  aria-label="Switch active sender mailbox"
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-background border border-border/80 hover:border-primary text-left transition-all shadow-2xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${
                      selectedAccountId === 'all' ? 'bg-primary' : 'bg-emerald-600'
                    }`} aria-hidden="true">
                      {selectedAccountId === 'all' ? 'ALL' : getInitials(selectedAccountObj?.email || 'M')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-foreground truncate">
                        {selectedAccountId === 'all' ? 'All Connected Accounts' : selectedAccountObj?.email}
                      </p>
                      <p className="text-[10px] text-foreground/70 truncate font-medium">
                        {selectedAccountId === 'all' ? `${accounts.length} mailboxes active` : (selectedAccountObj?.type === 'smtp' ? 'Custom SMTP' : 'Gmail OAuth')}
                      </p>
                    </div>
                  </div>
                  <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform shrink-0 ${accountDropdownOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {/* Dropdown Menu */}
                {accountDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setAccountDropdownOpen(false)} aria-hidden="true" />
                    <div role="listbox" aria-label="Mailbox accounts" className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/80 rounded-lg shadow-lg z-40 p-1 space-y-0.5 max-h-56 overflow-y-auto">
                      <button
                        role="option"
                        aria-selected={selectedAccountId === 'all'}
                        onClick={() => { setSelectedAccountId('all'); setAccountDropdownOpen(false); }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                          selectedAccountId === 'all' ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                          <span>All Mailboxes</span>
                        </div>
                        {counts && counts.unread > 0 && (
                          <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 rounded-full">{counts.unread}</span>
                        )}
                      </button>

                      <div className="h-px bg-border/50 my-1" role="separator" />

                      {accounts.map(acc => {
                        const accStats = counts?.by_account?.find(a => a.account_id === acc.id);
                        return (
                          <button
                            key={acc.id}
                            role="option"
                            aria-selected={selectedAccountId === String(acc.id)}
                            onClick={() => { setSelectedAccountId(String(acc.id)); setAccountDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                              selectedAccountId === String(acc.id) ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate pr-1">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${acc.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} aria-hidden="true" />
                              <span className="truncate text-[11px] font-medium">{acc.email}</span>
                            </div>
                            {accStats && accStats.unread_count > 0 && (
                              <span className="text-[10px] bg-primary/20 text-primary font-bold px-1.5 rounded-full shrink-0">
                                {accStats.unread_count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Smart Folder Navigation */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs" role="tablist" aria-label="Smart categories">
              <div className="px-2 py-1 text-[10px] font-bold text-foreground/75 uppercase tracking-wider">
                Smart Categories
              </div>

              {/* Primary / Unread */}
              <button
                type="button"
                role="tab"
                aria-selected={activeSegment === 'primary'}
                onClick={() => { setActiveSegment('primary'); setShowMobileSidebar(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  activeSegment === 'primary' 
                    ? 'bg-primary text-primary-foreground font-bold shadow-xs' 
                    : 'text-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <InboxIcon className="h-4 w-4" aria-hidden="true" />
                  <span>Primary</span>
                </div>
                {counts && counts.unread > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSegment === 'primary' ? 'bg-primary-foreground text-primary' : 'bg-primary/20 text-primary dark:text-primary-foreground'
                  }`}>
                    {counts.unread}
                  </span>
                )}
              </button>

              {/* Hot Leads / Interested */}
              <button
                type="button"
                role="tab"
                aria-selected={activeSegment === 'hot_lead'}
                onClick={() => { setActiveSegment('hot_lead'); setShowMobileSidebar(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  activeSegment === 'hot_lead' 
                    ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                    : 'text-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Flame className={`h-4 w-4 ${activeSegment === 'hot_lead' ? 'text-white' : 'text-emerald-500 fill-emerald-500/20'}`} aria-hidden="true" />
                  <span>Interested</span>
                </div>
                {counts && counts.interested > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSegment === 'hot_lead' ? 'bg-white text-emerald-800' : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  }`}>
                    {counts.interested}
                  </span>
                )}
              </button>

              {/* Questions */}
              <button
                type="button"
                role="tab"
                aria-selected={activeSegment === 'question'}
                onClick={() => { setActiveSegment('question'); setShowMobileSidebar(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  activeSegment === 'question' 
                    ? 'bg-blue-600 text-white font-bold shadow-xs' 
                    : 'text-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className={`h-4 w-4 ${activeSegment === 'question' ? 'text-white' : 'text-blue-500'}`} aria-hidden="true" />
                  <span>Questions</span>
                </div>
                {counts && counts.questions > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSegment === 'question' ? 'bg-white text-blue-800' : 'bg-blue-500/20 text-blue-800 dark:text-blue-300'
                  }`}>
                    {counts.questions}
                  </span>
                )}
              </button>

              {/* Starred */}
              <button
                type="button"
                role="tab"
                aria-selected={activeSegment === 'starred'}
                onClick={() => { setActiveSegment('starred'); setShowMobileSidebar(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                  activeSegment === 'starred' 
                    ? 'bg-amber-600 text-white font-bold shadow-xs' 
                    : 'text-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Star className={`h-4 w-4 ${activeSegment === 'starred' ? 'fill-white text-white' : 'text-amber-500 fill-amber-500/20'}`} aria-hidden="true" />
                  <span>Starred</span>
                </div>
                {counts && counts.starred > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSegment === 'starred' ? 'bg-white text-amber-900' : 'bg-amber-500/20 text-amber-900 dark:text-amber-300'
                  }`}>
                    {counts.starred}
                  </span>
                )}
              </button>

              {/* Opt-outs / Unsubscribed */}
              <button
                type="button"
                role="tab"
                aria-selected={activeSegment === 'unsubscribe'}
                onClick={() => { setActiveSegment('unsubscribe'); setShowMobileSidebar(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                  activeSegment === 'unsubscribe' 
                    ? 'bg-rose-600 text-white font-bold shadow-xs' 
                    : 'text-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className={`h-4 w-4 ${activeSegment === 'unsubscribe' ? 'text-white' : 'text-rose-500'}`} aria-hidden="true" />
                  <span>Opted Out</span>
                </div>
                {counts && counts.opted_out > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeSegment === 'unsubscribe' ? 'bg-white text-rose-900' : 'bg-rose-500/20 text-rose-900 dark:text-rose-300'
                  }`}>
                    {counts.opted_out}
                  </span>
                )}
              </button>

              {/* All Mail */}
              <button
                type="button"
                role="tab"
                aria-selected={activeSegment === 'all'}
                onClick={() => { setActiveSegment('all'); setShowMobileSidebar(false); }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  activeSegment === 'all' 
                    ? 'bg-muted text-foreground font-bold shadow-xs' 
                    : 'text-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 text-foreground/70" aria-hidden="true" />
                  <span>All Received</span>
                </div>
                {counts && (
                  <span className="text-[11px] font-mono font-semibold text-foreground/80">
                    {counts.all}
                  </span>
                )}
              </button>

              {/* Campaign Folders Section */}
              {campaignFolders.length > 0 && (
                <div className="pt-4 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-foreground/75 uppercase tracking-wider">
                    Campaigns
                  </div>
                  {campaignFolders.map(({ name, count }) => {
                    const isCampActive = activeSegment === `campaign:${name}`;
                    return (
                      <button
                        type="button"
                        key={name}
                        onClick={() => { setActiveSegment(`campaign:${name}`); setShowMobileSidebar(false); }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                          isCampActive ? 'bg-primary/10 text-primary font-bold' : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate pr-1">
                          <Folder className="h-3.5 w-3.5 shrink-0 text-foreground/60" aria-hidden="true" />
                          <span className="truncate text-[11px] font-medium">{name}</span>
                        </div>
                        <span className="text-[10px] text-foreground/70 font-mono font-semibold shrink-0">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom Keyboard shortcut hint */}
            <div className="p-3 border-t border-border/50 text-[11px] text-foreground/80 hidden lg:block bg-muted/40">
              <p className="font-bold text-foreground mb-1 text-[10px] uppercase tracking-wider">Shortcuts</p>
              <div className="flex justify-between text-[10px] py-0.5"><span>Next / Prev:</span><kbd className="font-mono font-bold bg-background px-1 border border-border/60 rounded">J / K</kbd></div>
              <div className="flex justify-between text-[10px] py-0.5"><span>Star toggle:</span><kbd className="font-mono font-bold bg-background px-1 border border-border/60 rounded">S</kbd></div>
              <div className="flex justify-between text-[10px] py-0.5"><span>Focus reply:</span><kbd className="font-mono font-bold bg-background px-1 border border-border/60 rounded">R</kbd></div>
            </div>
          </nav>

          {/* ========================================================================= */}
          {/* COLUMN 2: Conversation Stream / Dense Message List (320px - 340px) */}
          {/* ========================================================================= */}
          <section 
            aria-label="Conversation list"
            className={`w-full md:w-[320px] lg:w-[340px] shrink-0 border-r border-border/70 bg-card flex flex-col h-full z-10 ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}
          >
            
            {/* List Top Toolbar: Select All & Bulk Actions */}
            <div className="h-10 px-3 bg-muted/40 border-b border-border/50 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  aria-label={selectedIds.size > 0 && selectedIds.size === filteredMessages.length ? "Deselect all conversations" : "Select all conversations"}
                  className="min-h-[28px] min-w-[28px] flex items-center justify-center hover:bg-muted rounded text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {selectedIds.size > 0 && selectedIds.size === filteredMessages.length ? (
                    <CheckSquare className="h-4 w-4 text-primary" aria-hidden="true" />
                  ) : (
                    <Square className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                {selectedIds.size > 0 ? (
                  <div className="flex items-center gap-1.5" role="toolbar" aria-label="Bulk actions">
                    <span className="font-bold text-foreground text-[11px] mr-1">
                      {selectedIds.size} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('mark_read')}
                      aria-label="Mark selected as read"
                      className="min-h-[28px] min-w-[28px] flex items-center justify-center hover:bg-muted rounded text-foreground/80 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('star')}
                      aria-label="Star selected conversations"
                      className="min-h-[28px] min-w-[28px] flex items-center justify-center hover:bg-muted rounded text-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <Star className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkAction('delete')}
                      aria-label="Delete selected conversations"
                      className="min-h-[28px] min-w-[28px] flex items-center justify-center hover:bg-rose-500/10 rounded text-rose-600 dark:text-rose-400 focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[11px] text-foreground/75 font-semibold">
                    {filteredMessages.length} conversations
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 text-[10px] text-foreground/70 font-mono font-bold">
                {activeSegment.toUpperCase()}
              </div>
            </div>

            {/* Message Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/40" role="feed" aria-label="Prospect message feed">
              <PullToRefresh onRefresh={async () => { await handleSync(); loadMessages(true); }}>
                {loading ? (
                  <div className="p-3 space-y-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="p-3 space-y-2 rounded-lg border border-border/40 bg-card">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-3.5 w-32 rounded" />
                          <Skeleton className="h-3 w-10 rounded" />
                        </div>
                        <Skeleton className="h-3 w-48 rounded" />
                        <Skeleton className="h-2.5 w-full rounded" />
                      </div>
                    ))}
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-foreground/70 flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted/70 flex items-center justify-center text-foreground/50">
                      <Mail className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground text-sm">No conversations found</p>
                      <p className="text-xs text-foreground/70 mt-0.5 max-w-[200px]">
                        Sync mailboxes or choose another folder/account filter.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSync}
                      disabled={syncing}
                      className="gap-2 mt-1 text-xs shadow-2xs font-semibold"
                    >
                      <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                      Sync Mailboxes
                    </Button>
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isSelected = selectedMsg?.id === msg.id;
                    const isChecked = selectedIds.has(msg.id);
                    return (
                      <SwipeableListItem
                        key={msg.id}
                        onSwipeLeft={() => handleDeleteMsg(msg.id)}
                        onSwipeRight={() => handleToggleStar(msg)}
                        leftLabel="Delete"
                        rightLabel="Star"
                      >
                        <div
                          role="article"
                          tabIndex={0}
                          aria-selected={isSelected}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setSelectedMsg(msg); setShowMobileDetail(true); } }}
                          onClick={() => { setSelectedMsg(msg); setShowMobileDetail(true); }}
                          className={`p-3 cursor-pointer transition-all relative select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            isSelected
                              ? 'bg-primary/10 border-l-4 border-l-primary'
                              : !msg.is_read
                              ? 'bg-primary/5 hover:bg-primary/10'
                              : 'hover:bg-muted/50'
                          }`}
                        >
                          {/* Unread Accent Dot */}
                          {!msg.is_read && (
                            <div className="absolute top-3.5 right-3 w-2 h-2 rounded-full bg-primary" aria-label="Unread message" />
                          )}

                          {/* Row Top: Selection + Star + Sender + Time */}
                          <div className="flex items-center justify-between mb-1 gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <button
                                type="button"
                                onClick={(e) => handleToggleSelectId(msg.id, e)}
                                aria-label={isChecked ? `Deselect ${msg.sender_email}` : `Select ${msg.sender_email}`}
                                className="text-foreground/70 hover:text-foreground shrink-0 min-h-[24px] min-w-[24px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary rounded"
                              >
                                {isChecked ? <CheckSquare className="h-3.5 w-3.5 text-primary" aria-hidden="true" /> : <Square className="h-3.5 w-3.5" aria-hidden="true" />}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => handleToggleStar(msg, e)}
                                aria-label={msg.is_starred ? `Unstar message from ${msg.sender_email}` : `Star message from ${msg.sender_email}`}
                                className="text-foreground/60 hover:text-amber-500 shrink-0 min-h-[24px] min-w-[24px] flex items-center justify-center focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
                              >
                                <Star className={`h-3.5 w-3.5 ${msg.is_starred ? 'fill-amber-500 text-amber-500' : ''}`} aria-hidden="true" />
                              </button>

                              <span className={`text-xs truncate ${!msg.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}>
                                {msg.sender_email}
                              </span>
                            </div>

                            <span className="text-[10px] text-foreground/70 shrink-0 font-mono font-medium">
                              {formatRelativeTime(msg.created_at)}
                            </span>
                          </div>

                          {/* Subject */}
                          <p className={`text-xs truncate mb-1 pr-4 ${!msg.is_read ? 'font-semibold text-foreground' : 'text-foreground/80'}`}>
                            {msg.subject || '(No subject)'}
                          </p>

                          {/* Snippet */}
                          <p className="text-[11px] text-foreground/70 line-clamp-1 mb-2 leading-normal">
                            {msg.body_text || msg.body_html?.replace(/<[^>]*>?/gm, '') || 'No preview text'}
                          </p>

                          {/* Row Bottom: Sentiment Badge + Campaign Tag */}
                          <div className="flex items-center justify-between pt-0.5">
                            {getSentimentBadge(msg.sentiment)}
                            {msg.contact_list && (
                              <span className="text-[10px] text-foreground/70 font-mono font-medium bg-muted px-1.5 py-0.5 rounded truncate max-w-[130px] border border-border/50">
                                {msg.contact_list}
                              </span>
                            )}
                          </div>
                        </div>
                      </SwipeableListItem>
                    );
                  })
                )}
              </PullToRefresh>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* COLUMN 3: Thread & Received Conversation View + Composer (flex-1) */}
          {/* ========================================================================= */}
          <section 
            aria-label="Conversation message thread"
            className={`flex-1 flex flex-col bg-background h-full overflow-hidden ${!showMobileDetail ? 'hidden md:flex' : 'flex'}`}
          >
            {selectedMsg ? (
              <>
                {/* Thread Header Bar */}
                <div className="h-14 px-4 bg-card border-b border-border/70 flex items-center justify-between shrink-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => setShowMobileDetail(false)}
                      aria-label="Back to conversation list"
                      className="md:hidden min-h-[32px] min-w-[32px] flex items-center justify-center text-foreground hover:bg-muted rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <div className="min-w-0">
                      <h2 className="font-heading text-sm font-bold text-foreground truncate flex items-center gap-2">
                        {selectedMsg.subject || 'Re: Outreach Prospect Inquiry'}
                        {getSentimentBadge(selectedMsg.sentiment)}
                      </h2>
                      <p className="text-[11px] text-foreground/70 truncate">
                        Prospect: <span className="font-semibold text-foreground">{selectedMsg.sender_email}</span>
                        {selectedMsg.account_email && (
                          <span> · Via <span className="font-mono text-primary font-semibold">{selectedMsg.account_email}</span></span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowDossier(!showDossier)}
                      aria-label="Toggle prospect lead profile"
                      className={`min-h-[32px] px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        showDossier
                          ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                          : 'bg-background hover:bg-muted text-foreground/80 border-border/70'
                      }`}
                      title="View Prospect Intelligence & Contact Details"
                    >
                      <User className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">Lead Info</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStar(selectedMsg)}
                      aria-label={selectedMsg.is_starred ? "Unstar active conversation" : "Star active conversation"}
                      className="min-h-[32px] min-w-[32px] flex items-center justify-center text-foreground/70 hover:text-amber-500 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    >
                      <Star className={`h-4 w-4 ${selectedMsg.is_starred ? 'fill-amber-500 text-amber-500' : ''}`} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMsg(selectedMsg.id)}
                      aria-label="Delete active conversation"
                      className="min-h-[32px] min-w-[32px] flex items-center justify-center text-foreground/70 hover:text-rose-600 rounded-lg hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Conversation Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-label="Message history">
                  {threadLoading ? (
                    <div className="p-4 space-y-4">
                      <Skeleton className="h-20 w-3/4 ml-auto rounded-2xl" />
                      <Skeleton className="h-28 w-3/4 mr-auto rounded-2xl" />
                    </div>
                  ) : (
                    <>
                      {/* Outreach Sequence Banner */}
                      <div className="flex justify-center">
                        <div className="px-3 py-1 rounded-full bg-muted border border-border/70 text-[10px] text-foreground/80 font-mono font-medium flex items-center gap-1.5 shadow-2xs">
                          <Rocket className="h-3 w-3 text-primary" aria-hidden="true" />
                          Outbound Sequence: {selectedMsg.contact_list || 'Direct Campaign'}
                        </div>
                      </div>

                      {/* 1. Outbound Sent Campaign History (Real sent email from queue) */}
                      {outboundHistory.map((outbound, idx) => (
                        <div key={`outbound-${outbound.id || idx}`} className="flex justify-end">
                          <div className="max-w-2xl bg-card border border-border/80 p-4 rounded-2xl rounded-tr-xs text-xs space-y-2 shadow-2xs">
                            <div className="flex justify-between items-center text-[10px] text-foreground/75 pb-1.5 border-b border-border/50">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-foreground">You (Outreach Step {outbound.step_number || 1})</span>
                                <span className="font-mono text-[9px] bg-muted px-1 py-0.5 rounded font-semibold text-foreground/80">{outbound.sender_account_email || selectedMsg.recipient_email}</span>
                              </div>
                              <span className="font-mono font-medium">{new Date(outbound.sent_at || outbound.scheduled_at || Date.now()).toLocaleDateString()}</span>
                            </div>
                            <p className="font-semibold text-foreground text-xs">{outbound.final_subject || selectedMsg.subject}</p>
                            <div 
                              className="text-foreground/90 text-xs leading-relaxed max-h-48 overflow-y-auto"
                              dangerouslySetInnerHTML={{ __html: outbound.final_body || '<p>Outreach message sent to prospect.</p>' }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Fallback if no outbound history found in queue */}
                      {outboundHistory.length === 0 && (
                        <div className="flex justify-end">
                          <div className="max-w-xl bg-card border border-border/70 p-3.5 rounded-2xl rounded-tr-xs text-xs space-y-1.5 shadow-2xs">
                            <div className="flex justify-between items-center text-[10px] text-foreground/75 pb-1 border-b border-border/40">
                              <span className="font-bold text-foreground">Initial Outreach Email</span>
                              <span className="font-mono">{new Date(selectedMsg.created_at).toLocaleDateString()}</span>
                            </div>
                            <p className="text-foreground/80">
                              Subject: {selectedMsg.subject}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* 2. Received Prospect & Back-and-Forth Thread Messages */}
                      {threadMessages.map((msg, idx) => {
                        const isFromMe = msg.sentiment === 'sent' || (msg.sender_email && msg.sender_email === selectedMsg.recipient_email);
                        return isFromMe ? (
                          /* My Reply Bubble */
                          <div key={`msg-${msg.id || idx}`} className="flex justify-end">
                            <div className="max-w-2xl bg-primary/10 border border-primary/25 p-4 rounded-2xl rounded-tr-xs text-xs space-y-2 shadow-2xs">
                              <div className="flex justify-between items-center pb-1 border-b border-primary/20 text-[10px]">
                                <span className="font-bold text-primary dark:text-primary-foreground">You (Sent Reply)</span>
                                <span className="font-mono text-foreground/70 font-medium">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="text-foreground whitespace-pre-wrap leading-relaxed text-xs">
                                {msg.body_text || msg.body_html?.replace(/<[^>]*>?/gm, '')}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Prospect Received Reply Bubble */
                          <div key={`msg-${msg.id || idx}`} className="flex justify-start">
                            <div className="max-w-2xl bg-card border border-primary/25 p-4 rounded-2xl rounded-tl-xs text-xs space-y-2.5 shadow-2xs">
                              <div className="flex justify-between items-center pb-1.5 border-b border-border/50">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[10px] shadow-xs" aria-hidden="true">
                                    {getInitials(msg.sender_email)}
                                  </div>
                                  <div>
                                    <span className="font-bold text-foreground text-xs">{msg.sender_email}</span>
                                    <span className="text-[10px] text-foreground/70 font-medium block">Prospect Response</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-foreground/70 font-mono font-medium">
                                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                                </span>
                              </div>

                              <div 
                                className="text-foreground text-xs leading-relaxed whitespace-pre-wrap selection:bg-primary/20"
                                dangerouslySetInnerHTML={{ __html: msg.body_html || msg.body_text || 'Empty body text.' }}
                              />

                              {/* Prospect URL if available */}
                              {selectedMsg.store_url && (
                                <div className="pt-2 border-t border-border/50 flex items-center gap-1.5 text-primary text-[11px]">
                                  <Globe className="h-3.5 w-3.5" aria-hidden="true" />
                                  <a
                                    href={selectedMsg.store_url.startsWith('http') ? selectedMsg.store_url : `https://${selectedMsg.store_url}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="hover:underline font-mono font-bold"
                                  >
                                    {selectedMsg.store_name || selectedMsg.store_url}
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                {/* Reply Composer: Collapsible on Demand */}
                {!isComposerOpen ? (
                  /* Collapsed Minimal Action Trigger Bar */
                  <div className="p-2.5 bg-card/95 border-t border-border/70 flex items-center justify-between gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setIsComposerOpen(true);
                        setTimeout(() => replyTextareaRef.current?.focus(), 50);
                      }}
                      aria-label={`Reply to ${selectedMsg.sender_email}`}
                      className="flex-1 flex items-center justify-between px-3 py-1.5 rounded-lg bg-background border border-border/80 hover:border-primary text-left text-xs text-foreground/75 hover:text-foreground transition-all shadow-2xs group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <CornerDownRight className="h-3.5 w-3.5 text-primary group-hover:translate-x-0.5 transition-transform shrink-0" aria-hidden="true" />
                        <span className="truncate">
                          Reply to <span className="font-semibold text-foreground">{selectedMsg.sender_email}</span>...
                        </span>
                      </div>
                      <kbd className="hidden sm:inline font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border/60 text-foreground/70 shrink-0 ml-2">
                        Press R
                      </kbd>
                    </button>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAIReplyDraft}
                      disabled={draftingAI}
                      aria-label="Generate AI reply draft"
                      className="h-7.5 text-[11px] font-bold gap-1.5 text-primary border-primary/40 bg-primary/5 hover:bg-primary/10 shadow-2xs shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Sparkles className={`h-3 w-3 ${draftingAI ? 'animate-spin' : ''}`} aria-hidden="true" />
                      <span>{draftingAI ? 'Drafting...' : '1-Click AI Draft'}</span>
                    </Button>
                  </div>
                ) : (
                  /* Expanded Rich Editor */
                  <div className="p-3 bg-card border-t border-border/70 space-y-2 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <CornerDownRight className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        Reply to <span className="font-mono text-primary font-semibold">{selectedMsg.sender_email}</span>
                      </span>
                      
                      <div className="flex items-center gap-1.5">
                        {/* 1-Click AI Reply Draft */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAIReplyDraft}
                          disabled={draftingAI}
                          aria-label="Generate AI reply draft"
                          className="h-6.5 text-[10px] gap-1 text-primary border-primary/40 bg-primary/5 hover:bg-primary/10 font-bold shadow-2xs focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Sparkles className={`h-3 w-3 ${draftingAI ? 'animate-spin' : ''}`} aria-hidden="true" />
                          {draftingAI ? 'Generating...' : 'AI Draft'}
                        </Button>

                        {/* Minimize / Collapse */}
                        <button
                          type="button"
                          onClick={() => setIsComposerOpen(false)}
                          aria-label="Collapse reply composer"
                          className="min-h-[26px] min-w-[26px] flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-muted rounded focus-visible:ring-2 focus-visible:ring-primary"
                          title="Collapse (Esc)"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <Textarea
                      ref={replyTextareaRef}
                      rows={3}
                      aria-label="Compose reply message"
                      placeholder="Type your response to this prospect..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="text-xs bg-background resize-none focus-visible:ring-2 focus-visible:ring-primary leading-relaxed border-border/80"
                    />

                    <div className="flex justify-between items-center pt-0.5">
                      <div className="flex items-center gap-1 text-foreground/70" role="toolbar" aria-label="Formatting tools">
                        <button type="button" aria-label="Format bold" className="min-h-[26px] min-w-[26px] flex items-center justify-center hover:bg-muted rounded focus-visible:ring-2 focus-visible:ring-primary"><Bold className="h-3 w-3" aria-hidden="true" /></button>
                        <button type="button" aria-label="Format italic" className="min-h-[26px] min-w-[26px] flex items-center justify-center hover:bg-muted rounded focus-visible:ring-2 focus-visible:ring-primary"><Italic className="h-3 w-3" aria-hidden="true" /></button>
                        <button type="button" aria-label="Attach document or file" className="min-h-[26px] min-w-[26px] flex items-center justify-center hover:bg-muted rounded focus-visible:ring-2 focus-visible:ring-primary"><Paperclip className="h-3 w-3" aria-hidden="true" /></button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setReplyText('');
                            setIsComposerOpen(false);
                          }}
                          className="h-7 text-xs text-foreground/70 hover:text-foreground"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleSendReply}
                          disabled={sendingReply || !replyText.trim()}
                          size="sm"
                          aria-label="Send response to prospect"
                          className="h-7 text-xs font-bold gap-1.5 bg-primary text-primary-foreground shadow-2xs focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {sendingReply ? <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" /> : <Send className="h-3 w-3" aria-hidden="true" />}
                          Send Response
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-foreground/70">
                <div className="w-14 h-14 rounded-2xl bg-muted/70 flex items-center justify-center mb-3">
                  <Mail className="h-7 w-7 opacity-50 text-foreground" aria-hidden="true" />
                </div>
                <p className="text-sm font-bold text-foreground">Select a Prospect Conversation</p>
                <p className="text-xs mt-1 max-w-xs text-foreground/70">
                  Choose a received reply from the list to inspect lead intelligence and respond.
                </p>
              </div>
            )}
          </section>

          {/* ========================================================================= */}
          {/* ON-DEMAND PROSPECT LEAD DOSSIER (Slide-Over Drawer) */}
          {/* ========================================================================= */}
          {selectedMsg && showDossier && (
            <>
              {/* Backdrop on small viewports */}
              <div 
                className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-xs" 
                onClick={() => setShowDossier(false)}
              />

              <aside 
                aria-label="Prospect intelligence dossier"
                className="absolute right-0 top-0 bottom-0 z-40 w-[320px] max-w-[88vw] border-l border-border/80 bg-card p-4 flex flex-col h-full overflow-y-auto shadow-2xl space-y-4 animate-in slide-in-from-right duration-200"
              >
                {/* Header with Close Button */}
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <User className="h-4 w-4 text-primary" aria-hidden="true" />
                    <span>Prospect Intelligence</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDossier(false)}
                    aria-label="Close dossier panel"
                    className="min-h-[28px] min-w-[28px] flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-muted rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                
                {/* Profile Card */}
                <div className="flex flex-col items-center text-center pb-4 border-b border-border/50 space-y-2">
                  <div className="w-14 h-14 rounded-full bg-primary/15 text-primary font-extrabold text-lg flex items-center justify-center border border-primary/30 shadow-xs" aria-hidden="true">
                    {getInitials(selectedMsg.sender_email)}
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-foreground truncate max-w-[230px]">
                      {selectedMsg.sender_email.split('@')[0]}
                    </h3>
                    <p className="text-[11px] text-foreground/70 font-mono font-medium">
                      @{selectedMsg.sender_email.split('@')[1]}
                    </p>
                  </div>

                  <div className="flex gap-2 w-full pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedMsg.sender_email);
                        toast({ title: 'Email Copied', description: selectedMsg.sender_email });
                      }}
                      aria-label={`Copy email ${selectedMsg.sender_email}`}
                      className="flex-1 h-7 text-[11px] font-semibold gap-1 border-border/80 focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Copy className="h-3 w-3" aria-hidden="true" /> Copy Email
                    </Button>
                  </div>
                </div>

                {/* Sentiment Status Card */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-foreground/75 tracking-wider">
                    Lead Classification
                  </span>
                  <div className="p-2.5 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-between">
                    {getSentimentBadge(selectedMsg.sentiment)}
                    <span className="text-[10px] font-mono text-foreground/70 font-semibold">AI Classified</span>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
                  <span className="text-[10px] font-bold uppercase text-foreground/75 tracking-wider block">
                    Prospect Details
                  </span>
                  <div className="space-y-1.5 text-[11px] text-foreground/80">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                      <span className="truncate">{selectedMsg.sender_email}</span>
                    </div>
                    {selectedMsg.store_url && (
                      <div className="flex items-center gap-2 truncate">
                        <Globe className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                        <a 
                          href={selectedMsg.store_url.startsWith('http') ? selectedMsg.store_url : `https://${selectedMsg.store_url}`} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-primary hover:underline truncate font-mono font-semibold"
                        >
                          {selectedMsg.store_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Extracted Fields from Contact List */}
                {selectedMsg.contact_fields && Object.keys(selectedMsg.contact_fields).length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50 text-xs">
                    <span className="text-[10px] font-bold uppercase text-foreground/75 tracking-wider block">
                      Custom Lead Fields
                    </span>
                    <div className="space-y-1 bg-muted/40 p-2.5 rounded-lg border border-border/50">
                      {Object.entries(selectedMsg.contact_fields).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-[11px]">
                          <span className="text-foreground/75 capitalize font-medium">{k}:</span>
                          <span className="font-semibold text-foreground truncate max-w-[130px]">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outreach Campaign Origin */}
                <div className="space-y-2 pt-2 border-t border-border/50 text-xs">
                  <span className="text-[10px] font-bold uppercase text-foreground/75 tracking-wider block">
                    Campaign Context
                  </span>
                  <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-foreground truncate max-w-[160px]">
                        {selectedMsg.contact_list || 'Outbound Sequence'}
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[10px] uppercase">Active</span>
                    </div>
                    <p className="text-[10px] text-foreground/70 font-medium">
                      Sender Account: <span className="font-mono text-foreground font-semibold">{selectedMsg.account_email || 'Assigned Mailbox'}</span>
                    </p>
                  </div>
                </div>

              </aside>
            </>
          )}

        </div>
      </div>
    </AppShell>
  );
}

