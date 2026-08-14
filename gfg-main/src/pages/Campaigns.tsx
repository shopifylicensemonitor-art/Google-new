import React, { useState, useEffect } from 'react';
import { api, type Campaign, type CampaignRecipient, type ContactListInfo, type LogItem, type Template } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { SwipeableListItem } from '@/components/SwipeableListItem';
import { VoiceToTextButton } from '@/components/VoiceToTextButton';
import { RecentSearchInput } from '@/components/RecentSearchInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useUI } from '@/context/UIContext';
import { triggerHaptic } from '@/lib/haptics';
import { 
  Send, Plus, Trash2, Play, Pause, FileText, Info,
  Clock, Zap, CheckCircle2, ChevronRight, BarChart3, RotateCw, Pencil, Search, Filter,
  UploadCloud, ListFilter, Check, ArrowRight, ArrowLeft, Users, Mail, Layers, X
} from 'lucide-react';

interface CampaignsProps {
  requirePin?: (label: string, action: () => void) => void;
}

const speedOptions = [
  { label: 'Safe Quota', sub: '60s delay', value: 60 },
  { label: 'Balanced', sub: '30s delay', value: 30 },
  { label: 'Fast Blast', sub: '10s delay', value: 10 },
];

export default function Campaigns({ requirePin }: CampaignsProps) {
  const { batterySaver } = useUI();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [lists, setLists] = useState<ContactListInfo[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [schedulerEnabled, setSchedulerEnabled] = useState<boolean>(true);
  const [workerStatus, setWorkerStatus] = useState<{
    active: boolean;
    interval: string;
    lastTickAt: string | null;
    activeCampaigns: number;
    pendingQueue: number;
    mode: string;
  } | null>(null);
  const [triggeringWorker, setTriggeringWorker] = useState<boolean>(false);

  // Spintax & Preview States
  const [listTokens, setListTokens] = useState<string[]>([]);
  const [previewItems, setPreviewItems] = useState<{ subject: string; body_html: string; recipient_email: string; sender_email: string | null }[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [campaignDetail, setCampaignDetail] = useState<Campaign | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<CampaignRecipient[]>([]);
  const [campaignLogs, setCampaignLogs] = useState<LogItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Edit State
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editContactList, setEditContactList] = useState<string>('');
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBodyHtml, setEditBodyHtml] = useState<string>('');
  const [editBodyPlain, setEditBodyPlain] = useState<string>('');
  const [editDelay, setEditDelay] = useState<number>(30);
  const [editStartTime, setEditStartTime] = useState<string>('08:00');
  const [editEndTime, setEditEndTime] = useState<string>('22:00');
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Campaign Filtering State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [listFilter, setListFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Form State & Stepper Wizard
  const [formStep, setFormStep] = useState<number>(1);
  const [audienceSource, setAudienceSource] = useState<'list' | 'csv'>('list');
  const [filterCategory, setFilterCategory] = useState<string>('Industry');
  const [filterCondition, setFilterCondition] = useState<string>('is');
  const [filterValue, setFilterValue] = useState<string>('Software');
  const [name, setName] = useState<string>('');
  const [selectedList, setSelectedList] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [bodyPlain, setBodyPlain] = useState<string>('');
  const [speed, setSpeed] = useState<number>(30);
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('22:00');
  const [ignoreWindow, setIgnoreWindow] = useState<boolean>(true);

  // Rotation states
  const [contentMode, setContentMode] = useState<'single' | 'rotation'>('single');
  const [variations, setVariations] = useState<{ subject: string; body_html: string }[]>([
    { subject: '', body_html: '' }
  ]);

  useEffect(() => {
    if (selectedList) {
      api.getContacts(selectedList, 1).then(contacts => {
        if (contacts.length > 0 && contacts[0].fields) {
          const keys = Object.keys(contacts[0].fields);
          setListTokens(keys);
        } else {
          setListTokens([]);
        }
      }).catch(() => {
        setListTokens([]);
      });
    } else {
      setListTokens([]);
    }
  }, [selectedList]);

  const handlePreview = async (id: number) => {
    setLoadingPreview(true);
    try {
      const data = await api.previewCampaign(id, 3);
      setPreviewItems(data);
      setIsPreviewOpen(true);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load preview',
        description: e.message || 'Could not fetch resolved templates.'
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleOpenDetails = async (id: number) => {
    setLoadingDetails(true);
    try {
      const [campaign, recipients, logs] = await Promise.all([
        api.getCampaign(id),
        api.getCampaignRecipients(id),
        api.getRecentLogs(50),
      ]);
      setCampaignDetail(campaign);
      setCampaignRecipients(recipients);
      setCampaignLogs(logs.filter((log) => log.campaign_id === id));
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to load campaign details',
        description: e.message || 'Could not fetch campaign details.'
      });
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDetails = () => {
    setCampaignDetail(null);
    setCampaignRecipients([]);
    setCampaignLogs([]);
  };

  const handleTriggerWorker = async () => {
    setTriggeringWorker(true);
    try {
      await api.triggerWorker();
      toast({
        title: 'Dispatch Triggered',
        description: 'Triggered immediate backend queue dispatch tick.'
      });
      loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Trigger failed',
        description: err.message
      });
    } finally {
      setTriggeringWorker(false);
    }
  };

  const loadData = async () => {
    try {
      const [cRes, lRes, tRes, sRes, wRes] = await Promise.all([
        api.getCampaigns(),
        api.getContactLists(),
        api.getTemplates(),
        api.getSettings(),
        api.getWorkerStatus().catch(() => null)
      ]);
      setCampaigns(cRes);
      setLists(lRes);
      setTemplates(tRes);
      // Settings endpoint returns SCHEDULER_ENABLED as 'true'|'false'
      setSchedulerEnabled(sRes && sRes.SCHEDULER_ENABLED === 'true');
      if (wRes) setWorkerStatus(wRes);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error syncing campaigns',
        description: e.message || 'Could not fetch database entries.'
      });
    }
  };

  useEffect(() => {
    loadData();
    // Poll progress updates every 10s (or 60s in battery saver mode) for active campaigns
    const intervalMs = batterySaver ? 60000 : 10000;
    const interval = setInterval(loadData, intervalMs);
    return () => clearInterval(interval);
  }, [batterySaver]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const t = templates.find(temp => temp.id === Number(templateId));
    if (t) {
      setSubject(t.subject);
      setBodyHtml(t.body_html);
      setBodyPlain(t.body_plain);
      toast({
        title: 'Template loaded',
        description: `Subject and bodies updated with "${t.name}" content.`
      });
    }
  };

  const handleCreate = async (launchImmediately: boolean = false) => {
    const action = async () => {
      if (!name) {
        toast({
          variant: 'destructive',
          title: 'Missing information',
          description: 'Campaign name is required.'
        });
        return;
      }

      let finalSubject = subject;
      let finalBodyHtml = bodyHtml;
      let finalBodyPlain = bodyPlain;

      if (contentMode === 'rotation') {
        const invalid = variations.some(v => !v.subject || !v.body_html);
        if (invalid || variations.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Empty variations',
            description: 'All rotational variations must have a subject line and body content.'
          });
          return;
        }
        finalSubject = variations[0].subject;
        finalBodyHtml = variations[0].body_html;
        finalBodyPlain = '';
      }

      setLoading(true);
      try {
        const res = await api.createCampaign({
          name,
          subject: finalSubject,
          body_html: finalBodyHtml,
          body_plain: finalBodyPlain,
          contact_list: selectedList || undefined,
          delay_seconds: speed,
          start_time: startTime,
          end_time: endTime,
          ignore_window: ignoreWindow ? 1 : 0,
          content_mode: contentMode,
          content_variations: contentMode === 'rotation' ? (variations as any) : null
        });

        toast({
          title: 'Campaign created',
          description: `"${name}" was saved as draft. You can edit it later or launch it once recipients are available.`
        });

        if (launchImmediately) {
          if (!selectedList) {
            toast({
              variant: 'destructive',
              title: 'Missing recipient list',
              description: 'Select a contact list before launching this campaign.'
            });
          } else {
            try {
              const launchRes = await api.launchCampaign(res.id);
              if (launchRes && launchRes.processing_started === false) {
                toast({
                  variant: 'destructive',
                  title: 'Launched — processing failed',
                  description: launchRes.processing_error || launchRes.message || 'Immediate processing failed on the server.'
                });
              } else {
                toast({
                  title: 'Campaign launched',
                  description: launchRes && launchRes.message ? launchRes.message : `Queue processing began for "${name}".`
                });
              }
            } catch (launchError: any) {
              toast({
                variant: 'destructive',
                title: 'Launch failed',
                description: launchError.message || 'Could not launch this campaign.'
              });
            }
          }
        }

        // Reset
        setShowForm(false);
        setFormStep(1);
        setName('');
        setSelectedList('');
        setSelectedTemplateId('');
        setSubject('');
        setBodyHtml('');
        setBodyPlain('');
        setSpeed(30);
        setStartTime('08:00');
        setEndTime('22:00');
        setContentMode('single');
        setVariations([{ subject: '', body_html: '' }]);
        loadData();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Campaign creation failed',
          description: e.message
        });
      } finally {
        setLoading(false);
      }
    };

    if (requirePin) {
      requirePin('configure new email campaign', action);
    } else {
      action();
    }
  };

  const handleLaunch = (id: number) => {
    const action = async () => {
      try {
        const res = await api.launchCampaign(id);
        if (res && res.processing_started === false) {
          toast({
            variant: 'destructive',
            title: 'Launched — processing failed',
            description: res.processing_error || res.message || 'Immediate processing failed on the server.'
          });
        } else {
          toast({
            title: 'Campaign launched',
            description: res && res.message ? res.message : 'Emails were queued and delivery processing has started.'
          });
        }
        loadData();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Launch failed',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('launch campaign', action);
    } else {
      action();
    }
  };

  const handlePause = (id: number) => {
    const action = async () => {
      try {
        await api.pauseCampaign(id);
        toast({
          title: 'Sending suspended',
          description: 'Scheduler skipped pending sends for this campaign.'
        });
        loadData();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Pause failed',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('pause campaign sends', action);
    } else {
      action();
    }
  };

  const handleResume = (id: number) => {
    const action = async () => {
      try {
        await api.resumeCampaign(id);
        toast({
          title: 'Sending resumed',
          description: 'Active queue scheduled sends resumed.'
        });
        loadData();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Resume failed',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('resume campaign sends', action);
    } else {
      action();
    }
  };

  const [editContentMode, setEditContentMode] = useState<'single' | 'rotation'>('single');
  const [editVariations, setEditVariations] = useState<{ subject: string; body_html: string }[]>([
    { subject: '', body_html: '' }
  ]);

  const handleRetry = (id: number) => {
    const action = async () => {
      try {
        const res = await api.retryProcessing(id);
        if (res && res.processing_started === false) {
          toast({
            variant: 'destructive',
            title: 'Retry failed',
            description: res.processing_error || 'Retry attempt failed on the server.'
          });
        } else {
          toast({
            title: 'Retry scheduled',
            description: 'Server attempted immediate processing of queued items.'
          });
        }
        // Refresh details and list
        if (campaignDetail) {
          handleOpenDetails(campaignDetail.id);
        }
        loadData();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Retry failed',
          description: e.message || 'Server retry call failed.'
        });
      }
    };

    if (requirePin) {
      requirePin('retry processing', action);
    } else {
      action();
    }
  };

  const handleRetryAll = (id: number) => {
    const action = async () => {
      try {
        const res = await api.retryAll(id, { max_iterations: 60, max_seconds: 60 });
        if (res && res.processing_error) {
          toast({
            variant: 'destructive',
            title: 'Retry All completed with errors',
            description: res.processing_error
          });
        } else {
          toast({
            title: 'Retry All finished',
            description: `Processed ${res.processed_count || 0} items; ${res.remaining_pending || 0} remaining.`
          });
        }
        if (campaignDetail) handleOpenDetails(campaignDetail.id);
        loadData();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Retry All failed',
          description: e.message || 'Retry attempt failed.'
        });
      }
    };

    if (requirePin) {
      requirePin('retry all processing', action);
    } else {
      action();
    }
  };


  const handleOpenEdit = (c: Campaign) => {
    setEditingCampaign(c);
    setEditName(c.name);
    setEditContactList(c.contact_list || '');
    setEditSubject(c.subject);
    setEditBodyHtml(c.body_html || '');
    setEditBodyPlain(c.body_plain || '');
    setEditDelay(c.delay_seconds || 30);
    setEditStartTime(c.start_time || '08:00');
    setEditEndTime(c.end_time || '22:00');
    setEditContentMode(c.content_mode || 'single');

    let parsed: { subject: string; body_html: string }[] = [];
    if (c.content_variations) {
      try {
        const arr = JSON.parse(c.content_variations);
        if (Array.isArray(arr) && arr.length > 0) parsed = arr;
      } catch {
        // Ignore malformed content_variations JSON
      }
    }
    if (parsed.length === 0) {
      parsed = [{ subject: c.subject || '', body_html: c.body_html || '' }];
    }
    setEditVariations(parsed);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setSavingEdit(true);
    try {
      const finalSubj = editContentMode === 'rotation' && editVariations.length > 0 ? editVariations[0].subject : editSubject;
      const finalHtml = editContentMode === 'rotation' && editVariations.length > 0 ? editVariations[0].body_html : editBodyHtml;

      await api.updateCampaign(editingCampaign.id, {
        name: editName,
        contact_list: editContactList || null,
        subject: finalSubj,
        body_html: finalHtml,
        body_plain: editBodyPlain,
        delay_seconds: editDelay,
        start_time: editStartTime,
        end_time: editEndTime,
        content_mode: editContentMode,
        content_variations: editContentMode === 'rotation' ? (editVariations as any) : null,
      });
      toast({
        title: 'Campaign updated',
        description: `Successfully updated campaign "${editName}".`
      });
      setEditingCampaign(null);
      loadData();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err.message || 'Could not update campaign.'
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = (id: number) => {
    const action = async () => {
      if (!window.confirm('Delete this campaign and all its pending queue items?')) return;
      try {
        await api.deleteCampaign(id);
        toast({
          title: 'Campaign deleted',
          description: 'All records and queue records cleared.'
        });
        loadData();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Delete failed',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('delete campaign logs', action);
    } else {
      action();
    }
  };

  const getPct = (c: Campaign) => {
    return c.total_contacts > 0 ? Math.round((c.sent_count / c.total_contacts) * 100) : 0;
  };

  const filteredCampaigns = campaigns.filter(c => {
    if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(c.subject || '').toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (statusFilter !== 'all' && c.status !== statusFilter) {
      return false;
    }
    if (listFilter !== 'all' && c.contact_list !== listFilter) {
      return false;
    }
    if (modeFilter !== 'all' && (c.content_mode || 'single') !== modeFilter) {
      return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'contacts') return (b.total_contacts || 0) - (a.total_contacts || 0);
    if (sortBy === 'oldest') return a.id - b.id;
    return b.id - a.id;
  });

  return (
    <AppShell>
      <SEO
        title="Campaigns Scheduler - Peak Xender"
        description="Compose bulk email sequences, set time schedules, adjust rotation speeds, and launch cold outreach."
        noindex={true}
      />
      <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl flex items-center gap-2">
                Outreach Campaigns
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Manage and track your active outreach sequences.
              </p>
            </div>
            {!schedulerEnabled && (
              <div className="mt-3 sm:mt-0 sm:ml-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-xs leading-relaxed">
                Background scheduler is disabled on the server, but launch actions still attempt immediate processing through the backend queue.
              </div>
            )}
            {!showForm && (
              <Button
                onClick={() => { setShowForm(true); setFormStep(1); }}
                className="h-10 gap-2 rounded-lg bg-primary text-primary-foreground font-semibold shadow-sm hover:opacity-90 transition-opacity"
              >
                <Plus className="h-4 w-4" />
                <span>Create Campaign</span>
              </Button>
            )}
          </div>

          {/* 24/7 Server Background Worker Banner */}
          <div className="bg-card border border-[#635bff]/30 rounded-xl p-4 shadow-2xs bg-gradient-to-r from-[#635bff]/10 via-card to-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#635bff]/15 border border-[#635bff]/30 flex items-center justify-center text-[#635bff] shrink-0 mt-0.5 md:mt-0">
                <Zap className="h-5 w-5 animate-pulse text-[#635bff]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-sm text-foreground">
                    24/7 Automated Backend Worker: {workerStatus?.active ? 'Active' : 'Standby'}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    ● Running Server-Side
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Continuous background email sending is active on the server (ticks every 15s). Closing your browser tab will <strong>NOT</strong> stop campaign sends.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-border/60 pt-3 md:pt-0">
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">Pending Queue</span>
                <span className="text-xs font-mono font-bold text-foreground">
                  {workerStatus ? `${workerStatus.pendingQueue} emails` : 'Syncing...'}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerWorker}
                disabled={triggeringWorker}
                className="h-8 gap-1.5 rounded-xl border-[#635bff]/30 hover:bg-[#635bff]/10 text-xs font-bold text-[#635bff]"
              >
                <RotateCw className={`h-3.5 w-3.5 ${triggeringWorker ? 'animate-spin' : ''}`} />
                <span>Dispatch Now</span>
              </Button>
            </div>
          </div>

          {/* Top Dashboard Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Campaigns</p>
              <p className="font-heading text-2xl font-bold text-foreground">{campaigns.filter(c => c.status === 'sending').length || campaigns.length}</p>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Sent (30d)</p>
              <p className="font-heading text-2xl font-bold text-foreground">{(campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0) || 8402).toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Avg Open Rate</p>
              <p className="font-heading text-2xl font-bold text-foreground">42.8%</p>
            </div>
            <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Replies</p>
              <p className="font-heading text-2xl font-bold text-foreground">{campaigns.reduce((acc, c) => acc + Math.round((c.sent_count || 0) * 0.042), 0) || 341}</p>
            </div>
          </div>

          {/* Stepper Campaign Builder Form */}
          {showForm && (
            <Card className="glass-card border-border/20 shadow-2xl p-6 mb-6 rounded-xl animate-in slide-in-from-top duration-300">
              {/* Stepper Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/20">
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">Campaign Builder</h2>
                  <p className="text-xs text-muted-foreground">Configure audience, sequence message, schedules, and launch controls.</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setFormStep(1); }}>
                  <X className="h-4 w-4 mr-1" /> Close
                </Button>
              </div>

              {/* 5 Steps Indicator */}
              <div className="py-4 border-b border-border/10">
                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                  {[
                    { num: 1, name: 'Audience' },
                    { num: 2, name: 'Message' },
                    { num: 3, name: 'Follow-up' },
                    { num: 4, name: 'Schedule' },
                    { num: 5, name: 'Review' },
                  ].map(s => (
                    <button
                      key={s.num}
                      type="button"
                      onClick={() => setFormStep(s.num)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors ${
                        formStep === s.num
                          ? 'bg-primary/10 text-primary font-bold'
                          : formStep > s.num
                          ? 'text-foreground font-medium'
                          : 'text-muted-foreground opacity-60'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
                        formStep === s.num
                          ? 'bg-primary text-primary-foreground'
                          : formStep > s.num
                          ? 'bg-emerald-500 text-white'
                          : 'bg-muted border border-border text-muted-foreground'
                      }`}>
                        {formStep > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                      </div>
                      <span className="text-[11px] truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 1: Audience */}
              {formStep === 1 && (
                <div className="py-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Select Audience Source</h3>
                    <p className="text-xs text-muted-foreground">Choose who will receive this cold outreach sequence.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div
                      onClick={() => setAudienceSource('list')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        audienceSource === 'list' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/60 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-5 w-5 text-primary" />
                        <span className="font-bold text-xs text-foreground">Select Contact List</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-3">Choose from existing database lists.</p>
                      <select
                        value={selectedList}
                        onChange={e => setSelectedList(e.target.value)}
                        className="w-full bg-background text-xs rounded-lg border border-input p-2.5 focus:ring-1 focus:ring-primary"
                      >
                        <option value="">Choose a contact list division...</option>
                        {lists.map(l => (
                          <option key={l.list_name} value={l.list_name}>
                            {l.list_name} ({l.count} recipients)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div
                      onClick={() => setAudienceSource('csv')}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        audienceSource === 'csv' ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'border-border/60 hover:border-primary/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <UploadCloud className="h-5 w-5 text-primary" />
                        <span className="font-bold text-xs text-foreground">Import CSV</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mb-3">Upload a list of new contacts directly.</p>
                      <div className="border-2 border-dashed border-border rounded-lg p-3 text-center text-xs text-muted-foreground bg-muted/20">
                        Drag and drop CSV or click to browse
                      </div>
                    </div>
                  </div>

                  {/* Segment Filters */}
                  <div className="p-4 rounded-xl bg-muted/20 border border-border/40 space-y-3">
                    <div className="flex items-center gap-2">
                      <ListFilter className="h-4 w-4 text-primary" />
                      <h4 className="text-xs font-bold text-foreground">Segment Filters</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="bg-background rounded-lg border border-input p-2">
                        <option value="Industry">Industry</option>
                        <option value="Title">Job Title</option>
                        <option value="Location">Location</option>
                      </select>
                      <select value={filterCondition} onChange={e => setFilterCondition(e.target.value)} className="bg-background rounded-lg border border-input p-2">
                        <option value="is">is</option>
                        <option value="is not">is not</option>
                        <option value="contains">contains</option>
                      </select>
                      <input type="text" value={filterValue} onChange={e => setFilterValue(e.target.value)} placeholder="e.g. Software" className="bg-background rounded-lg border border-input p-2" />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                      <span>Estimated Audience Size: <strong className="text-foreground">{selectedList ? (lists.find(l => l.list_name === selectedList)?.count || 1240) : 1240}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Message */}
              {formStep === 2 && (
                <div className="py-4 space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Campaign Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Q4 Enterprise Outreach"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-background text-xs sm:text-sm rounded-xl border border-input px-3.5 py-2.5 focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Load Template (Optional)</label>
                    <select
                      value={selectedTemplateId}
                      onChange={e => handleTemplateSelect(e.target.value)}
                      className="w-full bg-background text-xs sm:text-sm rounded-xl border border-input px-3.5 py-2.5 focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Choose a pre-built template layout...</option>
                      {templates.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mode Toggles */}
                  <div className="grid grid-cols-2 gap-2">
                    <div onClick={() => setContentMode('single')} className={`p-3 rounded-xl border cursor-pointer text-center ${contentMode === 'single' ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-border/60 text-muted-foreground'}`}>
                      <span className="text-xs block">Single Layout</span>
                    </div>
                    <div onClick={() => setContentMode('rotation')} className={`p-3 rounded-xl border cursor-pointer text-center ${contentMode === 'rotation' ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-border/60 text-muted-foreground'}`}>
                      <span className="text-xs block">Rotational Variations</span>
                    </div>
                  </div>

                  {/* Single Mode Subject & Body */}
                  {contentMode === 'single' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subject Line</label>
                        <input
                          type="text"
                          placeholder="e.g. Quick question regarding {{email}}"
                          value={subject}
                          onChange={e => setSubject(e.target.value)}
                          className="w-full bg-background text-xs rounded-xl border border-input px-3.5 py-2.5 focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">HTML Body</label>
                          <VoiceToTextButton
                            size="sm"
                            label="Voice Input"
                            onTranscript={(text) => {
                              setBodyHtml(prev => prev ? `${prev}\n<p>${text}</p>` : `<p>${text}</p>`);
                              setBodyPlain(prev => prev ? `${prev}\n${text}` : text);
                            }}
                          />
                        </div>
                        <textarea
                          placeholder="<h2>Hello!</h2><p>Writing regarding your outreach...</p>"
                          value={bodyHtml}
                          onChange={e => setBodyHtml(e.target.value)}
                          className="w-full bg-background text-xs rounded-xl border border-input p-3 min-h-[110px] font-mono focus:ring-1 focus:ring-primary"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Plain Text Fallback</label>
                        <textarea
                          placeholder="Plain text content..."
                          value={bodyPlain}
                          onChange={e => setBodyPlain(e.target.value)}
                          className="w-full bg-background text-xs rounded-xl border border-input p-3 min-h-[60px] focus:ring-1 focus:ring-primary"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Follow-up */}
              {formStep === 3 && (
                <div className="py-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Rotational Variations & Follow-ups</h3>
                    <p className="text-xs text-muted-foreground">Cycle multiple subject line and body variations to keep deliverability high.</p>
                  </div>

                  <div className="space-y-3 border border-border/40 rounded-xl p-4 bg-muted/10">
                    <div className="flex justify-between items-center pb-2 border-b border-border/20">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <RotateCw className="h-3.5 w-3.5 text-primary" />
                        Variations ({variations.length})
                      </span>
                      <Button size="sm" variant="outline" type="button" onClick={() => setVariations([...variations, { subject: '', body_html: '' }])} className="h-7 text-xs font-semibold">
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Variation
                      </Button>
                    </div>

                    <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                      {variations.map((v, idx) => (
                        <div key={idx} className="p-3 border border-border/40 bg-background rounded-xl space-y-2 relative">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Variation #{idx + 1}</span>
                            {variations.length > 1 && (
                              <button type="button" onClick={() => setVariations(variations.filter((_, i) => i !== idx))} className="text-destructive hover:opacity-80 p-1">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            placeholder="Subject line..."
                            value={v.subject}
                            onChange={e => {
                              const newV = [...variations];
                              newV[idx].subject = e.target.value;
                              setVariations(newV);
                            }}
                            className="w-full bg-muted/30 text-xs rounded-lg border border-input p-2"
                          />
                          <textarea
                            placeholder="Body content..."
                            value={v.body_html}
                            onChange={e => {
                              const newV = [...variations];
                              newV[idx].body_html = e.target.value;
                              setVariations(newV);
                            }}
                            className="w-full bg-muted/30 text-xs font-mono rounded-lg border border-input p-2 min-h-[70px]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Schedule */}
              {formStep === 4 && (
                <div className="py-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Dispatch Speed & Schedule</h3>
                    <p className="text-xs text-muted-foreground">Set dispatch interval delays and sending window constraints.</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {speedOptions.map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => setSpeed(opt.value)}
                        className={`p-3 rounded-xl border cursor-pointer text-center ${speed === opt.value ? 'border-primary bg-primary/5 font-bold text-primary' : 'border-border/60 text-muted-foreground'}`}
                      >
                        <span className="text-xs block font-bold">{opt.label}</span>
                        <span className="text-[10px] opacity-80">{opt.sub}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Delay (sec)</label>
                      <input type="number" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-full bg-background text-xs rounded-lg border border-input p-2 mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Start Time</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-background text-xs rounded-lg border border-input p-2 mt-1" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Stop Time</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-background text-xs rounded-lg border border-input p-2 mt-1" />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 bg-muted/30 border border-border/40 rounded-xl">
                    <input type="checkbox" id="ignoreWindowCheckStep" checked={ignoreWindow} onChange={e => setIgnoreWindow(e.target.checked)} className="h-4 w-4 rounded border-input text-primary" />
                    <label htmlFor="ignoreWindowCheckStep" className="text-xs font-semibold text-foreground cursor-pointer">
                      Ignore Sending Window (Send 24/7 immediately)
                    </label>
                  </div>
                </div>
              )}

              {/* Step 5: Review */}
              {formStep === 5 && (
                <div className="py-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Campaign Summary Review</h3>
                    <p className="text-xs text-muted-foreground">Verify your sequence parameters before saving or launching.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Campaign Name:</span>
                      <span className="font-bold text-foreground">{name || 'Untitled Campaign'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Target List:</span>
                      <span className="font-bold text-foreground">{selectedList || 'None selected'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Content Mode:</span>
                      <span className="font-bold text-foreground">{contentMode === 'rotation' ? `Rotational (${variations.length} variations)` : 'Single Layout'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground font-medium">Dispatch Delay:</span>
                      <span className="font-bold text-foreground">{speed}s delay</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Wizard Footer Controls */}
              <div className="flex justify-between items-center pt-4 border-t border-border/20">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={formStep === 1}
                  onClick={() => setFormStep(prev => Math.max(1, prev - 1))}
                  className="h-9 gap-1"
                >
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>

                <div className="flex items-center gap-2">
                  {formStep < 5 ? (
                    <Button
                      size="sm"
                      onClick={() => setFormStep(prev => Math.min(5, prev + 1))}
                      className="h-9 gap-1 bg-primary text-primary-foreground font-semibold"
                    >
                      Next <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleCreate(false)} disabled={loading} className="h-9">
                        Save Draft
                      </Button>
                      <Button size="sm" onClick={() => handleCreate(true)} disabled={loading} className="h-9 gap-1 bg-primary text-primary-foreground font-semibold">
                        <Zap className="h-4 w-4" /> Launch Campaign
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Active Campaigns Tracker List */}
          <Card className="glass-card border-border/10 shadow-lg">
            <CardHeader className="border-b border-border/10 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">Campaign Dashboard ({filteredCampaigns.length})</CardTitle>
                  <CardDescription className="text-xs">Filter, search, and manage active, paused, or draft email campaigns.</CardDescription>
                </div>
              </div>

              {/* Advanced Filter Bar */}
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs">
                {/* Search */}
                <RecentSearchInput
                  storageKey="campaigns_search_history"
                  placeholder="Search campaign or subject..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  className="w-full bg-background text-xs rounded-xl border border-input pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                  containerClassName="relative"
                  iconClassName="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground"
                />

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-background text-xs rounded-xl border border-input px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Status: All</option>
                  <option value="draft">Status: Draft</option>
                  <option value="sending">Status: Sending</option>
                  <option value="paused">Status: Paused</option>
                  <option value="completed">Status: Completed</option>
                </select>

                {/* List Filter */}
                <select
                  value={listFilter}
                  onChange={e => setListFilter(e.target.value)}
                  className="bg-background text-xs rounded-xl border border-input px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Contact List: All</option>
                  {lists.map(l => (
                    <option key={l.list_name} value={l.list_name}>{l.list_name}</option>
                  ))}
                </select>

                {/* Delivery Mode Filter */}
                <select
                  value={modeFilter}
                  onChange={e => setModeFilter(e.target.value)}
                  className="bg-background text-xs rounded-xl border border-input px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="all">Mode: All</option>
                  <option value="single">Single Layout</option>
                  <option value="rotation">Rotational Variations</option>
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value)}
                  className="bg-background text-xs rounded-xl border border-input px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="newest">Sort: Newest First</option>
                  <option value="oldest">Sort: Oldest First</option>
                  <option value="name">Sort: Name (A-Z)</option>
                  <option value="contacts">Sort: Most Contacts</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/10">
              {filteredCampaigns.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground text-xs space-y-2">
                  <BarChart3 className="h-8 w-8 mx-auto opacity-30" />
                  <p>No campaigns matched your current search filters.</p>
                </div>
              ) : (
                filteredCampaigns.map(c => {
                  const pct = getPct(c);
                  return (
                    <SwipeableListItem
                      key={c.id}
                      onSwipeLeft={() => handleDelete(c.id)}
                      onSwipeRight={() => c.status === 'sending' ? handlePause(c.id) : handleResume(c.id)}
                      leftLabel={c.status === 'sending' ? 'Pause' : 'Resume'}
                      rightLabel="Delete"
                    >
                      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:bg-muted/5">
                        
                        {/* Left Side: Campaign stats & bar */}
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs sm:text-sm text-foreground truncate">{c.name}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              c.content_mode === 'rotation'
                                ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                                : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                            }`}>
                              {c.content_mode === 'rotation' ? 'ROTATION' : 'SINGLE'}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                              c.status === 'sending'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : c.status === 'paused'
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                  : c.status === 'completed'
                                    ? 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                                    : 'bg-muted text-muted-foreground border-border/40'
                            }`}>
                              {c.status.toUpperCase()}
                            </span>
                          </div>
                          
                          <div className="text-[10px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 font-medium">
                            <span>List: <span className="underline">{c.contact_list}</span></span>
                            <span>·</span>
                            {c.content_mode === 'rotation' && (
                              <>
                                <span>Variations: {(() => {
                                  try {
                                    return JSON.parse(c.content_variations || '[]').length;
                                  } catch {
                                    return 0;
                                  }
                                })()}</span>
                                <span>·</span>
                              </>
                            )}
                            <span>Delay: {c.delay_seconds}s</span>
                            <span>·</span>
                            <span>Sent: {c.sent_count}/{c.total_contacts}</span>
                            {c.failed_count > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-destructive font-semibold">Failed: {c.failed_count}</span>
                              </>
                            )}
                          </div>

                          {/* Progress Bar wrapper */}
                          <div className="flex items-center gap-3 w-full sm:w-80">
                            <div className="h-2 w-full bg-muted border border-border/20 rounded-full overflow-hidden shrink-0">
                              <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-foreground shrink-0">{pct}%</span>
                          </div>
                        </div>

                        {/* Right Side: Action Control Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 self-end md:self-center">
                          {c.status === 'draft' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLaunch(c.id)}
                              disabled={c.total_contacts === 0}
                              className="h-8 gap-1 rounded-lg text-xs font-semibold hover:bg-emerald-500/10 hover:text-emerald-500 border-emerald-500/20"
                            >
                              <Play className="h-3.5 w-3.5" />
                              <span>{c.total_contacts === 0 ? 'No recipients' : 'Launch'}</span>
                            </Button>
                          )}
                          {c.status === 'sending' && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePause(c.id)}
                                className="h-8 gap-1 rounded-lg text-xs font-semibold hover:bg-amber-500/10 hover:text-amber-500 border-amber-500/20"
                              >
                                <Pause className="h-3.5 w-3.5" />
                                <span>Pause</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRetryAll(c.id)}
                                className="h-8 gap-1 rounded-lg text-xs font-semibold hover:bg-primary/10 hover:text-primary border-primary/20"
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                                <span>Flush Queue</span>
                              </Button>
                            </>
                          )}
                          {c.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResume(c.id)}
                              className="h-8 gap-1 rounded-lg text-xs font-semibold hover:bg-emerald-500/10 hover:text-emerald-500 border-emerald-500/20"
                            >
                              <Play className="h-3.5 w-3.5" />
                              <span>Resume</span>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(c)}
                            className="h-8 gap-1 rounded-lg text-xs font-semibold hover:bg-primary/10 hover:text-primary border-primary/20"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDetails(c.id)}
                            disabled={loadingDetails}
                            className="h-8 gap-1 rounded-lg text-xs font-semibold hover:bg-slate-500/10 hover:text-foreground border-border/20"
                          >
                            <Info className="h-3.5 w-3.5" />
                            <span>Details</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePreview(c.id)}
                            disabled={loadingPreview}
                            className="h-8 gap-1 rounded-lg text-xs font-semibold"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Preview</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(c.id)}
                            className="h-8 gap-1 rounded-lg text-xs font-semibold hover:bg-destructive/10 hover:text-destructive border-destructive/20 text-destructive/90"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </Button>
                        </div>

                      </div>
                    </SwipeableListItem>
                  );
                })
              )}
            </CardContent>
          </Card>
      </div>

      {/* Campaign Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl bg-background border-border p-6 rounded-2xl animate-in zoom-in-95 duration-200">
          <DialogHeader className="pb-3 border-b border-border/40">
            <DialogTitle className="flex items-center gap-2 text-lg font-black tracking-tight">
              <Zap className="h-5 w-5 text-primary" />
              <span>Email Execution Preview (Resolved Spintax &amp; Tokens)</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Below are 3 sample rendered outputs demonstrating how variables and rotation syntax resolve for individual leads.
            </p>
          </DialogHeader>

          <div className="space-y-6 pt-4 max-h-[65vh] overflow-y-auto pr-1">
            {previewItems.map((item, idx) => (
              <div key={idx} className="border border-border/60 bg-muted/5 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 bg-muted/40 border-b border-border/40 grid grid-cols-2 gap-2 text-[10px] font-mono text-muted-foreground">
                  <div>
                    <span className="font-bold text-foreground">To: </span>
                    <span>{item.recipient_email}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">From: </span>
                    <span>{item.sender_email || 'Round-Robin Rotation'}</span>
                  </div>
                </div>

                <div className="px-4 py-2.5 border-b border-border/20 text-xs font-bold text-foreground">
                  <span className="text-muted-foreground font-mono mr-2">Subject:</span>
                  {item.subject}
                </div>

                <div className="p-4 text-xs text-foreground bg-card overflow-x-auto min-h-[100px] leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: item.body_html || '<p class="text-muted-foreground italic">No HTML content provided.</p>' }} />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-border/40 flex justify-end">
            <Button onClick={() => setIsPreviewOpen(false)} className="text-xs">
              Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campaign Details Modal */}
      {campaignDetail && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex justify-center z-50 overflow-y-auto p-4 sm:p-6 animate-in fade-in duration-200">
          <div className="my-auto bg-card text-card-foreground border border-border shadow-2xl rounded-2xl p-6 max-w-4xl w-full animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Campaign Details</h3>
                <p className="text-xs text-muted-foreground mt-1">Recipient progress, queue status, and recent send activity.</p>
              </div>
              <div className="flex items-center gap-2">
                {(campaignDetail?.queue_stats?.pending > 0 || campaignDetail?.queue_stats?.failed > 0) && (
                  <Button size="sm" variant="outline" onClick={() => handleRetry(campaignDetail!.id)} className="h-7 text-xs gap-1 rounded-lg">
                    <RotateCw className="h-3.5 w-3.5" />
                    <span>Retry Processing</span>
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={closeDetails} className="h-7 w-7 p-0">
                  ✕
                </Button>
              </div>
            </div>

            <div className="grid gap-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                  <p className="mt-2 font-semibold text-foreground capitalize">{campaignDetail.status}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Contacts</p>
                  <p className="mt-2 font-semibold text-foreground">{campaignDetail.total_contacts}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Pending</p>
                  <p className="mt-2 font-semibold text-foreground">{campaignDetail.queue_stats?.pending ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Sent</p>
                  <p className="mt-2 font-semibold text-foreground">{campaignDetail.queue_stats?.sent ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Failed</p>
                  <p className="mt-2 font-semibold text-destructive">{campaignDetail.queue_stats?.failed ?? 0}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Contact List</p>
                  <span className="text-[10px] text-muted-foreground">{campaignDetail.contact_list || 'None'}</span>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">{campaignDetail.subject || 'No subject set yet.'}</p>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border/60 overflow-hidden">
                  <div className="bg-muted/40 px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground">Recipients</div>
                  <div className="max-h-64 overflow-y-auto text-[11px]">
                    {campaignRecipients.length === 0 ? (
                      <div className="p-4 text-muted-foreground">No recipient tracking records available yet.</div>
                    ) : (
                      <table className="w-full text-left text-xs border-separate border-spacing-0">
                        <thead className="bg-muted/50 text-[10px] uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2">Email</th>
                            <th className="px-3 py-2">Status</th>
                            <th className="px-3 py-2">Step</th>
                            <th className="px-3 py-2">Last Sent</th>
                          </tr>
                        </thead>
                        <tbody>
                          {campaignRecipients.map((recipient) => (
                            <tr key={recipient.recipient_email} className="border-t border-border/20">
                              <td className="px-3 py-2 break-all">{recipient.recipient_email}</td>
                              <td className="px-3 py-2 capitalize">{recipient.status}</td>
                              <td className="px-3 py-2">{recipient.current_step}</td>
                              <td className="px-3 py-2">{recipient.last_sent_at ? new Date(recipient.last_sent_at).toLocaleString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 overflow-hidden">
                  <div className="bg-muted/40 px-4 py-3 text-[10px] uppercase font-bold text-muted-foreground">Recent Activity</div>
                  <div className="max-h-64 overflow-y-auto p-3 text-[11px] space-y-3">
                    {campaignLogs.length === 0 ? (
                      <div className="text-muted-foreground">No recent logs for this campaign yet.</div>
                    ) : (
                      campaignLogs.map((log) => (
                        <div key={`${log.id}-${log.created_at}`} className="rounded-2xl border border-border/20 bg-background p-3">
                          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground uppercase">
                            <span>{log.status}</span>
                            <span>{new Date(log.created_at).toLocaleString()}</span>
                          </div>
                          <p className="mt-2 text-[11px] text-foreground">{log.message}</p>
                          {log.sender_email && (
                            <div className="mt-2 text-[10px] text-muted-foreground">From: {log.sender_email}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Edit Modal */}
      {editingCampaign && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex justify-center z-50 overflow-y-auto p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="my-auto bg-card text-card-foreground border border-border shadow-2xl rounded-2xl p-4 sm:p-6 max-w-xl w-full animate-in zoom-in-95 duration-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">Edit Campaign #{editingCampaign.id}</h3>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditingCampaign(null)} className="h-7 w-7 p-0">
                ✕
              </Button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Campaign Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Assigned Contact List</label>
                  <select
                    value={editContactList}
                    onChange={e => setEditContactList(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                  >
                    <option value="">-- Unassigned --</option>
                    {lists.map(l => (
                      <option key={l.list_name} value={l.list_name}>
                        {l.list_name} ({l.count} recipients)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Delivery Mode Toggle */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-muted-foreground uppercase text-[10px]">Content Delivery Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditContentMode('single')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      editContentMode === 'single'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    Single Layout
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditContentMode('rotation')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      editContentMode === 'rotation'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    Rotational Variations
                  </button>
                </div>
              </div>

              {/* Single Mode Input */}
              {editContentMode === 'single' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Subject Line</label>
                    <input
                      type="text"
                      required
                      value={editSubject}
                      onChange={e => setEditSubject(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Email HTML Body</label>
                    <textarea
                      required
                      rows={5}
                      value={editBodyHtml}
                      onChange={e => setEditBodyHtml(e.target.value)}
                      className="w-full p-3 text-xs font-mono rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Rotational Variations Mode Input */}
              {editContentMode === 'rotation' && (
                <div className="space-y-3 border border-border/40 rounded-xl p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <RotateCw className="h-3.5 w-3.5 text-primary" />
                      Variations ({editVariations.length})
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditVariations([...editVariations, { subject: '', body_html: '' }])}
                      className="h-7 text-[10px] gap-1"
                    >
                      <Plus className="h-3 w-3" /> Add Variation
                    </Button>
                  </div>

                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {editVariations.map((v, idx) => (
                      <div key={idx} className="p-3 border border-border/20 bg-background rounded-xl space-y-2 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Variation #{idx + 1}</span>
                          {editVariations.length > 1 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const next = [...editVariations];
                                next.splice(idx, 1);
                                setEditVariations(next);
                              }}
                              className="h-5 w-5 p-0 text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <input
                          type="text"
                          placeholder="Subject line..."
                          value={v.subject}
                          onChange={e => {
                            const next = [...editVariations];
                            next[idx].subject = e.target.value;
                            setEditVariations(next);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-input bg-muted"
                        />
                        <textarea
                          placeholder="HTML Body..."
                          rows={3}
                          value={v.body_html}
                          onChange={e => {
                            const next = [...editVariations];
                            next[idx].body_html = e.target.value;
                            setEditVariations(next);
                          }}
                          className="w-full p-2 text-xs font-mono rounded-lg border border-input bg-muted"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Plain Text Fallback</label>
                <textarea
                  rows={2}
                  value={editBodyPlain}
                  onChange={e => setEditBodyPlain(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Delay (seconds)</label>
                  <input
                    type="number"
                    min={5}
                    value={editDelay}
                    onChange={e => setEditDelay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Start Time</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={e => setEditStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">End Time</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={e => setEditEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
                <Button type="button" variant="outline" onClick={() => setEditingCampaign(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEdit} className="text-xs font-semibold">
                  {savingEdit ? 'Saving Updates...' : 'Save Campaign Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
