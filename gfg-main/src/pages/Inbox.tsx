import React, { useState, useEffect } from 'react';
import { api, type InboxMessage } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { PullToRefresh } from '@/components/PullToRefresh';
import { SwipeableListItem } from '@/components/SwipeableListItem';
import { InboxSkeleton } from '@/components/InboxSkeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Inbox as InboxIcon, RefreshCw, Mail, Flame, CheckCircle2, 
  ExternalLink, Sparkles, Send, User, Building2, Tag, Search, Filter,
  Phone, MapPin, Link as LinkIcon, ArrowLeft, MoreVertical, ThumbsUp,
  HelpCircle, Info, Trash2, Paperclip, Image as ImageIcon, Bold,
  Italic, Rocket, Check, UserCheck, ShieldCheck
} from 'lucide-react';

export default function Inbox() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [selectedMsg, setSelectedMsg] = useState<InboxMessage | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [draftingAI, setDraftingAI] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [readFilter, setReadFilter] = useState<string>('all');
  const [showMobileDetail, setShowMobileDetail] = useState<boolean>(false);

  const loadInbox = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getInboxMessages(100);
      setMessages(data);
      if (data.length > 0 && !selectedMsg) {
        setSelectedMsg(data[0]);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to load inbox', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedMsg]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.syncInbox();
      toast({ title: 'Inbox Synced', description: res.message });
      loadInbox();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Sync Failed', description: err.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectMsg = (msg: InboxMessage) => {
    setSelectedMsg(msg);
    setReplyText('');
    setShowMobileDetail(true);
    if (!msg.is_read) {
      api.markInboxRead(msg.id).catch(() => {});
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: 1 } : m));
    }
  };

  const handleAIReplyDraft = async () => {
    if (!selectedMsg) return;
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
        toast({ title: 'AI Reply Drafted', description: 'Generated response using your configured AI rules.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'AI Draft Failed', description: err.message });
    } finally {
      setDraftingAI(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedMsg || !replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await api.replyToInboxMessage(selectedMsg.id, replyText);
      toast({ title: 'Reply Queued', description: res.message });
      setReplyText('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Reply Failed', description: err.message });
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteMsg = (id: number) => {
    setMessages(prev => prev.filter(m => m.id !== id));
    if (selectedMsg?.id === id) {
      setSelectedMsg(null);
      setShowMobileDetail(false);
    }
    toast({
      title: 'Conversation Deleted',
      description: 'Message removed from your inbox view.',
    });
  };

  const handleArchiveMsg = (id: number) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, is_read: 1 } : m));
    toast({
      title: 'Conversation Archived',
      description: 'Marked as read and archived.',
    });
  };

  const filteredMessages = messages.filter(m => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matches = (
        m.sender_email.toLowerCase().includes(q) ||
        (m.subject && m.subject.toLowerCase().includes(q)) ||
        (m.store_name && m.store_name.toLowerCase().includes(q))
      );
      if (!matches) return false;
    }

    if (sentimentFilter !== 'all' && m.sentiment !== sentimentFilter) {
      return false;
    }

    if (readFilter === 'unread' && m.is_read) return false;
    if (readFilter === 'read' && !m.is_read) return false;

    return true;
  });

  const getSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'hot_lead':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase tracking-wider border border-emerald-500/20">
            <Flame className="h-3 w-3 fill-emerald-500" /> Positive
          </span>
        );
      case 'question':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider border border-blue-500/20">
            <HelpCircle className="h-3 w-3" /> Info Request
          </span>
        );
      case 'unsubscribe':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold text-[10px] uppercase tracking-wider border border-destructive/20">
            Unsubscribe
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold text-[10px] uppercase tracking-wider border border-border/50">
            General
          </span>
        );
    }
  };

  const getInitials = (email: string) => {
    const namePart = email.split('@')[0];
    const parts = namePart.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return namePart.substring(0, 2).toUpperCase();
  };

  return (
    <AppShell>
      <SEO title="Inbox & Responses | Outreach SaaS" description="Unified prospect receiving, lead dossiers, and AI reply drafting." />

      <div className="h-[calc(100vh-100px)] flex flex-col bg-background rounded-xl border border-border/60 overflow-hidden shadow-sm">
        {/* Header Toolbar */}
        <div className="h-14 px-4 bg-card border-b border-border/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <InboxIcon className="h-5 w-5 text-primary" />
            <h1 className="font-heading text-lg font-bold text-foreground">Inbox</h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
              {messages.filter(m => !m.is_read).length} unread
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64 hidden sm:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search inbox..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
            </div>

            <Button
              onClick={handleSync}
              disabled={syncing}
              variant="outline"
              size="sm"
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Syncing...' : 'Sync Inbox'}</span>
            </Button>
          </div>
        </div>

        {/* 3-Pane Systematic Layout */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Pane 1: Conversation List */}
          <div className={`w-full md:w-[320px] lg:w-[340px] shrink-0 border-r border-border/60 bg-card flex flex-col h-full z-10 ${showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
            {/* Quick Filter Chips */}
            <div className="p-3 border-b border-border/40 space-y-2 bg-muted/10">
              <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                <button
                  onClick={() => { setReadFilter('all'); setSentimentFilter('all'); }}
                  className={`px-2.5 py-1 rounded-full font-medium text-[11px] whitespace-nowrap transition-colors ${
                    readFilter === 'all' && sentimentFilter === 'all'
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setReadFilter('unread')}
                  className={`px-2.5 py-1 rounded-full font-medium text-[11px] whitespace-nowrap transition-colors ${
                    readFilter === 'unread'
                      ? 'bg-primary text-primary-foreground font-bold'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  Unread
                </button>
                <button
                  onClick={() => setSentimentFilter('hot_lead')}
                  className={`px-2.5 py-1 rounded-full font-medium text-[11px] whitespace-nowrap transition-colors ${
                    sentimentFilter === 'hot_lead'
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  🔥 Positive
                </button>
                <button
                  onClick={() => setSentimentFilter('question')}
                  className={`px-2.5 py-1 rounded-full font-medium text-[11px] whitespace-nowrap transition-colors ${
                    sentimentFilter === 'question'
                      ? 'bg-blue-500 text-white font-bold'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
                >
                  Questions
                </button>
              </div>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-border/30">
              <PullToRefresh onRefresh={async () => { await handleSync(); loadInbox(); }}>
                {loading ? (
                  <div className="p-3 space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="p-3 space-y-2 rounded-lg border border-border/40 bg-card">
                        <div className="flex items-center justify-between">
                          <Skeleton className="h-4 w-32 rounded" />
                          <Skeleton className="h-3 w-12 rounded" />
                        </div>
                        <Skeleton className="h-3.5 w-44 rounded" />
                        <Skeleton className="h-3 w-full rounded" />
                        <div className="flex items-center justify-between pt-1">
                          <Skeleton className="h-4 w-16 rounded-full" />
                          <Skeleton className="h-3.5 w-20 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredMessages.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No replies found.
                  </div>
                ) : (
                  filteredMessages.map((msg) => {
                    const isSelected = selectedMsg?.id === msg.id;
                    return (
                      <SwipeableListItem
                        key={msg.id}
                        onSwipeLeft={() => handleDeleteMsg(msg.id)}
                        onSwipeRight={() => handleArchiveMsg(msg.id)}
                        leftLabel="Archive"
                        rightLabel="Delete"
                      >
                        <div
                          onClick={() => handleSelectMsg(msg)}
                          className={`p-3 cursor-pointer transition-colors relative ${
                            isSelected
                              ? 'bg-primary/10 border-l-4 border-l-primary'
                              : !msg.is_read
                              ? 'bg-primary/5 hover:bg-primary/10'
                              : 'hover:bg-muted/40'
                          }`}
                        >
                          {!msg.is_read && (
                            <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
                          )}

                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs truncate pr-2 ${!msg.is_read ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}>
                              {msg.sender_email}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className={`text-xs truncate mb-1 ${!msg.is_read ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                            {msg.subject || 'No Subject'}
                          </p>

                          <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">
                            {msg.body_text || msg.body_html || 'Empty body text'}
                          </p>

                          <div className="flex items-center justify-between">
                            {getSentimentBadge(msg.sentiment)}
                            {msg.contact_list && (
                              <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
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
          </div>

          {/* Pane 2: Message Thread & Reply Composer */}
          <div className={`flex-1 flex flex-col bg-background h-full overflow-hidden ${!showMobileDetail ? 'hidden md:flex' : 'flex'}`}>
            {selectedMsg ? (
              <>
                {/* Thread Header */}
                <div className="h-14 px-4 bg-card border-b border-border/60 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setShowMobileDetail(false)}
                      className="md:hidden p-1.5 text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0">
                      <h2 className="font-heading text-sm font-bold text-foreground truncate">
                        {selectedMsg.subject || 'Re: Prospect Inquiry'}
                      </h2>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {selectedMsg.sender_email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {getSentimentBadge(selectedMsg.sentiment)}
                  </div>
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Sequence Started Chip */}
                  <div className="flex justify-center">
                    <div className="px-3 py-1 rounded-full bg-muted border border-border/50 text-[11px] text-muted-foreground font-mono flex items-center gap-1.5">
                      <Rocket className="h-3 w-3 text-primary" />
                      Sequence Active: {selectedMsg.contact_list || 'Outbound Campaign'}
                    </div>
                  </div>

                  {/* Outbound Sent Message Bubble (Simulated Previous Step) */}
                  <div className="flex justify-end">
                    <div className="max-w-xl bg-card border border-border/60 p-3.5 rounded-2xl rounded-tr-xs text-xs space-y-1.5 shadow-2xs">
                      <div className="flex justify-between items-center text-[10px] text-muted-foreground pb-1 border-b border-border/30">
                        <span className="font-semibold text-foreground">You</span>
                        <span>{new Date(selectedMsg.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-muted-foreground">
                        Hello, following up regarding our outreach solution for your team. Would love to connect regarding custom integrations.
                      </p>
                    </div>
                  </div>

                  {/* Incoming Prospect Message Bubble */}
                  <div className="flex justify-start">
                    <div className="max-w-xl bg-primary/5 border border-primary/20 p-4 rounded-2xl rounded-tl-xs text-xs space-y-2 shadow-2xs">
                      <div className="flex justify-between items-center pb-1 border-b border-primary/10">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center text-[10px]">
                            {getInitials(selectedMsg.sender_email)}
                          </div>
                          <span className="font-bold text-foreground">{selectedMsg.sender_email}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(selectedMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-foreground whitespace-pre-wrap leading-relaxed">
                        {selectedMsg.body_text || selectedMsg.body_html || 'No body text provided.'}
                      </div>

                      {selectedMsg.store_url && (
                        <div className="pt-2 border-t border-primary/10 flex items-center gap-1.5 text-primary text-[11px]">
                          <Building2 className="h-3.5 w-3.5" />
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
                </div>

                {/* Reply Composer Bar */}
                <div className="p-3 bg-card border-t border-border/60 space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1">
                      <Send className="h-3.5 w-3.5 text-primary" /> Reply to {selectedMsg.sender_email}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAIReplyDraft}
                      disabled={draftingAI}
                      className="h-7 text-[11px] gap-1 text-primary border-primary/30 bg-primary/5 hover:bg-primary/10 font-bold"
                    >
                      <Sparkles className={`h-3 w-3 ${draftingAI ? 'animate-spin' : ''}`} />
                      1-Click AI Reply Draft
                    </Button>
                  </div>

                  <Textarea
                    rows={3}
                    placeholder="Type your response..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="text-xs bg-background resize-none focus:ring-1 focus:ring-primary"
                  />

                  <div className="flex justify-between items-center pt-1">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <button className="p-1 hover:bg-muted rounded text-muted-foreground"><Bold className="h-3.5 w-3.5" /></button>
                      <button className="p-1 hover:bg-muted rounded text-muted-foreground"><Italic className="h-3.5 w-3.5" /></button>
                      <button className="p-1 hover:bg-muted rounded text-muted-foreground"><Paperclip className="h-3.5 w-3.5" /></button>
                    </div>

                    <Button
                      onClick={handleSendReply}
                      disabled={sendingReply || !replyText.trim()}
                      size="sm"
                      className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground"
                    >
                      {sendingReply ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Send Response
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Mail className="h-10 w-10 opacity-30 mb-2" />
                <p className="text-sm font-bold text-foreground">Select a Conversation</p>
                <p className="text-xs mt-1 max-w-xs">Choose a prospect reply from the left panel to read and respond.</p>
              </div>
            )}
          </div>

          {/* Pane 3: Prospect Dossier Panel */}
          {selectedMsg && (
            <div className="w-[280px] shrink-0 border-l border-border/60 bg-card p-4 flex-col h-full overflow-y-auto hidden lg:flex space-y-4">
              {/* Profile Card */}
              <div className="flex flex-col items-center text-center pb-4 border-b border-border/40 space-y-2">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center border border-primary/20">
                  {getInitials(selectedMsg.sender_email)}
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-foreground truncate max-w-[220px]">
                    {selectedMsg.sender_email.split('@')[0]}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">Prospect Lead</p>
                </div>

                <div className="flex gap-2 w-full pt-2">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px] font-semibold">
                    <User className="h-3 w-3 mr-1" /> Profile
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-[11px] font-semibold">
                    <Tag className="h-3 w-3 mr-1" /> Tag
                  </Button>
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Prospect Badges</span>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">Decision Maker</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">Enterprise Target</span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Contact Information</span>
                <div className="space-y-1.5 text-[11px] text-muted-foreground">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">{selectedMsg.sender_email}</span>
                  </div>
                  {selectedMsg.store_url && (
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      <a href={selectedMsg.store_url.startsWith('http') ? selectedMsg.store_url : `https://${selectedMsg.store_url}`} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                        {selectedMsg.store_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Extracted Fields */}
              {selectedMsg.contact_fields && Object.keys(selectedMsg.contact_fields).length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/40 text-xs">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Extracted Fields</span>
                  <div className="space-y-1">
                    {Object.entries(selectedMsg.contact_fields).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground capitalize">{k}:</span>
                        <span className="font-semibold text-foreground">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Campaign Context */}
              <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block">Campaign Context</span>
                <div className="p-2.5 rounded-lg bg-muted/30 border border-border/40 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-bold text-foreground">{selectedMsg.contact_list || 'Outbound Sequence'}</span>
                    <span className="text-emerald-600 font-bold text-[10px]">Active</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Step 2 / 5 (Replied)</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

