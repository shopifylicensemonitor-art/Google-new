import React, { useState, useEffect } from 'react';
import { api, type Campaign, type CampaignRecipient, type Contact, type ContactListInfo, type LogItem, type Template, type Account } from '../api';
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
  UploadCloud, ListFilter, Check, ArrowRight, ArrowLeft, Users, Mail, Layers, X,
  Eye, Sparkles, Tag, SlidersHorizontal, MousePointerClick, RefreshCw, Copy, Globe, Calculator, Brain,
} from 'lucide-react';
import { SendTestEmailModal } from '@/components/SendTestEmailModal';

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
  const [accounts, setAccounts] = useState<Account[]>([]);
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

  // Deliverability Test Email Modal State
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);
  const [testTargetCampaign, setTestTargetCampaign] = useState<{
    id?: number;
    name?: string;
    subject?: string;
    body_html?: string;
    body_plain?: string;
    step_number?: number;
  } | null>(null);

  const handleOpenCampaignTestModal = (c?: Campaign | null) => {
    if (c) {
      setTestTargetCampaign({
        id: c.id,
        name: c.name,
        subject: c.subject,
        body_html: c.body_html,
        body_plain: c.body_plain,
      });
    } else if (editingCampaign) {
      setTestTargetCampaign({
        id: editingCampaign.id,
        name: editName || editingCampaign.name,
        subject: editSubject || editingCampaign.subject,
        body_html: editBodyHtml || editingCampaign.body_html,
        body_plain: editBodyPlain || editingCampaign.body_plain,
      });
    } else {
      setTestTargetCampaign({
        name: name || 'Draft Campaign',
        subject: subject || (subjectVariations?.[0]) || '',
        body_html: formatType === 'html' ? bodyHtml || (bodyVariations?.[0]) || '' : '',
        body_plain: formatType === 'plain' ? bodyPlain || (bodyVariations?.[0]) || '' : bodyPlain || '',
      });
    }
    setTestModalOpen(true);
  };

  // Audience & Filter State
  const [listTokens, setListTokens] = useState<string[]>([]);
  const [selectedListContacts, setSelectedListContacts] = useState<Contact[]>([]);
  const [loadingListContacts, setLoadingListContacts] = useState<boolean>(false);
  const [prospectSearch, setProspectSearch] = useState<string>('');
  const [prospectDomainFilter, setProspectDomainFilter] = useState<string>('all');
  const [prospectStatusFilter, setProspectStatusFilter] = useState<string>('all');
  const [customFilterRules, setCustomFilterRules] = useState<{ id: string; field: string; operator: string; value: string }[]>([]);
  const [targetLimitMode, setTargetLimitMode] = useState<'all' | 'limit' | 'range'>('all');
  const [targetLimit, setTargetLimit] = useState<number>(500);
  const [targetRangeStart, setTargetRangeStart] = useState<number>(1);
  const [targetRangeEnd, setTargetRangeEnd] = useState<number>(500);
  const [excludePreviouslyContacted, setExcludePreviouslyContacted] = useState<boolean>(false);

  // Message & Format State
  const [formatType, setFormatType] = useState<'html' | 'plain'>('html');
  const [activeEditorField, setActiveEditorField] = useState<'subject' | 'bodyHtml' | 'bodyPlain'>('subject');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Multiple Subject Lines & Multiple Body Variations
  const [subjectVariations, setSubjectVariations] = useState<string[]>(['']);
  const [bodyVariations, setBodyVariations] = useState<string[]>(['']);

  // Schedule & Senders State
  const [selectedAccountIds, setSelectedAccountIds] = useState<number[]>([]);
  const [timezone, setTimezone] = useState<string>('Africa/Lagos');
  const [calcHours, setCalcHours] = useState<number>(4);
  const [calcMinutes, setCalcMinutes] = useState<number>(0);

  // Cold Email Timing Randomizer & Cooldown State
  const [timingMode, setTimingMode] = useState<'smart' | 'fixed' | 'stealth' | 'burst' | 'custom'>('smart');
  const [minDelay, setMinDelay] = useState<number>(30);
  const [maxDelay, setMaxDelay] = useState<number>(90);
  const [cooldownEnabled, setCooldownEnabled] = useState<boolean>(true);
  const [cooldownBatchSize, setCooldownBatchSize] = useState<number>(15);
  const [cooldownDurationMinutes, setCooldownDurationMinutes] = useState<number>(5);

  // Edit State
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editContactList, setEditContactList] = useState<string>('');
  const [editSubject, setEditSubject] = useState<string>('');
  const [editBodyHtml, setEditBodyHtml] = useState<string>('');
  const [editBodyPlain, setEditBodyPlain] = useState<string>('');
  const [editFormatType, setEditFormatType] = useState<'html' | 'plain'>('html');
  const [editDelay, setEditDelay] = useState<number>(30);
  const [editStartTime, setEditStartTime] = useState<string>('08:00');
  const [editEndTime, setEditEndTime] = useState<string>('22:00');
  const [editIgnoreWindow, setEditIgnoreWindow] = useState<boolean>(true);
  const [editTimezone, setEditTimezone] = useState<string>('Africa/Lagos');
  const [editSelectedAccountIds, setEditSelectedAccountIds] = useState<number[]>([]);
  const [editCustomFilterRules, setEditCustomFilterRules] = useState<{ id: string; field: string; operator: string; value: string }[]>([]);
  const [editTargetLimitMode, setEditTargetLimitMode] = useState<'all' | 'limit' | 'range'>('all');
  const [editTargetLimit, setEditTargetLimit] = useState<number>(0);
  const [editTargetRangeStart, setEditTargetRangeStart] = useState<number>(0);
  const [editTargetRangeEnd, setEditTargetRangeEnd] = useState<number>(0);
  const [editExcludePreviouslyContacted, setEditExcludePreviouslyContacted] = useState<boolean>(false);
  const [editSubjectVariations, setEditSubjectVariations] = useState<string[]>(['']);
  const [editBodyVariations, setEditBodyVariations] = useState<string[]>(['']);
  const [editListTokens, setEditListTokens] = useState<string[]>([]);
  const [editWorkflowSteps, setEditWorkflowSteps] = useState<{ id: number; trigger_event: string; delay_seconds: number; subject: string; body_html: string; body_plain?: string }[]>([]);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  // Preview & Details State
  const [previewItems, setPreviewItems] = useState<{ subject: string; body_html: string; recipient_email: string; sender_email: string | null }[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [campaignDetail, setCampaignDetail] = useState<Campaign | null>(null);
  const [campaignRecipients, setCampaignRecipients] = useState<CampaignRecipient[]>([]);
  const [campaignLogs, setCampaignLogs] = useState<LogItem[]>([]);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);

  // Campaign Filtering State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [listFilter, setListFilter] = useState<string>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  // Form State & Stepper Wizard
  const [formStep, setFormStep] = useState<number>(1);
  const [name, setName] = useState<string>('');
  const [selectedList, setSelectedList] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [bodyPlain, setBodyPlain] = useState<string>('');
  const [showPreview, setShowPreview] = useState<boolean>(false);
  const [showFallbackEditor, setShowFallbackEditor] = useState<boolean>(false);
  const [workflowSteps, setWorkflowSteps] = useState<{ id: number; trigger_event: string; delay_seconds: number; subject: string; body_html: string; body_plain?: string }[]>([]);
  const [expandedStepIds, setExpandedStepIds] = useState<Set<number>>(new Set());
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
      setLoadingListContacts(true);
      api.getContacts(selectedList, 300).then(contacts => {
        setSelectedListContacts(contacts);
        const tokenSet = new Set<string>();
        contacts.forEach(c => {
          if (c.fields) {
            Object.keys(c.fields).forEach(k => tokenSet.add(k));
          }
        });
        setListTokens(Array.from(tokenSet));
      }).catch(() => {
        setSelectedListContacts([]);
        setListTokens([]);
      }).finally(() => {
        setLoadingListContacts(false);
      });
    } else {
      setSelectedListContacts([]);
      setListTokens([]);
    }
  }, [selectedList]);

  useEffect(() => {
    if (editContactList) {
      api.getContacts(editContactList, 100).then(contacts => {
        const tokenSet = new Set<string>();
        contacts.forEach(c => {
          if (c.fields) {
            Object.keys(c.fields).forEach(k => tokenSet.add(k));
          }
        });
        setEditListTokens(Array.from(tokenSet));
      }).catch(() => {
        setEditListTokens([]);
      });
    } else {
      setEditListTokens([]);
    }
  }, [editContactList]);

  const allPersonalizationTokens = Array.from(new Set([
    'first_name',
    'last_name',
    'email',
    'company',
    'date',
    ...listTokens
  ]));

  const handleCopyToken = (token: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tokenStr = `{{${token}}}`;
    navigator.clipboard.writeText(tokenStr);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({
      title: 'Copied to Clipboard!',
      description: `Variable ${tokenStr} copied.`
    });
  };

  const handleInsertToken = (token: string, target?: 'subject' | 'bodyHtml' | 'bodyPlain') => {
    const field = target || activeEditorField;
    const tokenStr = `{{${token}}}`;
    if (field === 'subject') {
      setSubject(prev => prev ? `${prev} ${tokenStr}` : tokenStr);
      setSubjectVariations(prev => {
        const next = [...prev];
        if (next.length === 0) return [tokenStr];
        next[0] = next[0] ? `${next[0]} ${tokenStr}` : tokenStr;
        return next;
      });
    } else if (field === 'bodyPlain') {
      setBodyPlain(prev => prev ? `${prev} ${tokenStr}` : tokenStr);
      setBodyVariations(prev => {
        const next = [...prev];
        if (next.length === 0) return [tokenStr];
        next[0] = next[0] ? `${next[0]} ${tokenStr}` : tokenStr;
        return next;
      });
    } else {
      setBodyHtml(prev => prev ? `${prev} ${tokenStr}` : tokenStr);
      setBodyVariations(prev => {
        const next = [...prev];
        if (next.length === 0) return [tokenStr];
        next[0] = next[0] ? `${next[0]} ${tokenStr}` : tokenStr;
        return next;
      });
    }
    toast({
      title: `Inserted {{${token}}}`,
      description: `Added to ${field === 'subject' ? 'Subject' : field === 'bodyPlain' ? 'Plain Text' : 'HTML Body'}.`
    });
  };

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
      const [cRes, lRes, tRes, sRes, wRes, aRes] = await Promise.all([
        api.getCampaigns(),
        api.getContactLists(),
        api.getTemplates(),
        api.getSettings(),
        api.getWorkerStatus().catch(() => null),
        api.getAccounts().catch(() => [])
      ]);
      setCampaigns(cRes);
      setLists(lRes);
      setTemplates(tRes);
      setAccounts(aRes || []);
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
    // Poll progress updates every 10s (or 60s in battery saver mode)
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
      setSubjectVariations([t.subject]);
      setBodyVariations([formatType === 'plain' ? t.body_plain : t.body_html]);
      toast({
        title: 'Template loaded',
        description: `Subject and bodies updated with "${t.name}" content.`
      });
    }
  };

  const handleCreate = async (launchImmediately: boolean = false) => {
    const action = async () => {
      const campaignName = (name || '').trim() || (selectedList ? `${selectedList} Campaign - ${new Date().toLocaleDateString()}` : `Campaign ${new Date().toLocaleDateString()}`);

      let finalSubject = subject;
      let finalBodyHtml = bodyHtml;
      let finalBodyPlain = bodyPlain;

      const validSubjects = subjectVariations.filter(s => s.trim());
      const validBodies = bodyVariations.filter(b => b.trim());

      let finalVariations: any = null;

      if (contentMode === 'rotation') {
        if (validSubjects.length > 0 || validBodies.length > 0) {
          finalVariations = {
            subjects: validSubjects.length > 0 ? validSubjects : [subject],
            bodies: validBodies.length > 0 ? validBodies : [formatType === 'plain' ? bodyPlain : bodyHtml]
          };
          finalSubject = validSubjects[0] || subject;
          finalBodyHtml = validBodies[0] || bodyHtml;
          finalBodyPlain = formatType === 'plain' ? (validBodies[0] || bodyPlain) : bodyPlain;
        } else {
          const invalid = variations.some(v => !v.subject || !v.body_html);
          if (invalid || variations.length === 0) {
            toast({
              variant: 'destructive',
              title: 'Empty variations',
              description: 'All rotational variations must have a subject line and body content.'
            });
            return;
          }
          finalVariations = variations;
          finalSubject = variations[0].subject;
          finalBodyHtml = variations[0].body_html;
          finalBodyPlain = '';
        }
      }

      const activeFilters = customFilterRules.filter(r => r.field && (r.value !== '' || r.operator === 'is_empty' || r.operator === 'is_not_empty'));
      const targetCount = targetLimitMode === 'limit' && targetLimit > 0 ? targetLimit : 0;
      const startRange = targetLimitMode === 'range' && targetRangeStart > 0 ? targetRangeStart : 0;
      const endRange = targetLimitMode === 'range' && targetRangeEnd >= targetRangeStart ? targetRangeEnd : 0;

      setLoading(true);
      try {
        const res = await api.createCampaign({
          name: campaignName,
          subject: finalSubject,
          body_html: formatType === 'plain' ? '' : finalBodyHtml,
          body_plain: finalBodyPlain,
          contact_list: selectedList || undefined,
          delay_seconds: speed,
          start_time: startTime,
          end_time: endTime,
          ignore_window: ignoreWindow ? 1 : 0,
          timezone: timezone || 'Africa/Lagos',
          account_ids: selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
          target_limit: targetCount,
          target_range_start: startRange,
          target_range_end: endRange,
          exclude_previously_contacted: excludePreviouslyContacted ? 1 : 0,
          custom_filters: activeFilters.length > 0 ? activeFilters : undefined,
          format_type: formatType,
          timing_mode: timingMode,
          min_delay: minDelay,
          max_delay: maxDelay,
          cooldown_enabled: cooldownEnabled ? 1 : 0,
          cooldown_batch_size: cooldownBatchSize,
          cooldown_duration_minutes: cooldownDurationMinutes,
          steps: workflowSteps.map((s, idx) => ({
            step_number: idx + 2,
            subject: s.subject,
            body_html: formatType === 'plain' ? '' : s.body_html,
            body_plain: s.body_plain || (formatType === 'plain' ? s.body_html : ''),
            delay_seconds: s.delay_seconds,
            trigger_event: s.trigger_event
          })),
          content_mode: contentMode,
          content_variations: finalVariations
        });

        toast({
          title: 'Campaign created',
          description: `"${name}" was saved as draft with Africa/Lagos (WAT) schedule.`
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
              const launchRes = await api.launchCampaign(res.id, {
                account_ids: selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
                custom_filters: activeFilters.length > 0 ? activeFilters : undefined,
                target_limit: targetCount,
                target_range_start: startRange,
                target_range_end: endRange,
                exclude_previously_contacted: excludePreviouslyContacted ? 1 : 0
              });
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

        // Reset Form
        setShowForm(false);
        setFormStep(1);
        setName('');
        setSelectedList('');
        setSelectedTemplateId('');
        setSubject('');
        setBodyHtml('');
        setBodyPlain('');
        setFormatType('html');
        setSpeed(30);
        setStartTime('08:00');
        setEndTime('22:00');
        setTimezone('Africa/Lagos');
        setSelectedAccountIds([]);
        setCustomFilterRules([]);
        setTargetLimitMode('all');
        setTargetLimit(50000);
        setContentMode('single');
        setVariations([{ subject: '', body_html: '' }]);
        setSubjectVariations(['']);
        setBodyVariations(['']);
        setWorkflowSteps([]);
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
    setEditSubject(c.subject || '');
    setEditBodyHtml(c.body_html || '');
    setEditBodyPlain(c.body_plain || '');
    setEditFormatType((c.format_type as any) || 'html');
    setEditDelay(c.delay_seconds || 30);
    setEditStartTime(c.start_time || '08:00');
    setEditEndTime(c.end_time || '22:00');
    setEditIgnoreWindow(Boolean(c.ignore_window ?? 1));
    setEditTimezone(c.timezone || 'Africa/Lagos');
    setEditContentMode(c.content_mode || 'single');

    let accIds: number[] = [];
    if (c.account_ids) {
      try {
        const raw = typeof c.account_ids === 'string' ? JSON.parse(c.account_ids) : c.account_ids;
        if (Array.isArray(raw)) accIds = raw.map(Number);
      } catch (_) {}
    }
    setEditSelectedAccountIds(accIds);

    let parsedFilters: any[] = [];
    if (c.custom_filters) {
      try {
        const raw = typeof c.custom_filters === 'string' ? JSON.parse(c.custom_filters) : c.custom_filters;
        if (Array.isArray(raw)) parsedFilters = raw;
      } catch (_) {}
    }
    setEditCustomFilterRules(parsedFilters);

    const tLim = c.target_limit || 0;
    const rStart = c.target_range_start || 0;
    const rEnd = c.target_range_end || 0;
    setEditTargetLimit(tLim);
    setEditTargetRangeStart(rStart);
    setEditTargetRangeEnd(rEnd);
    setEditExcludePreviouslyContacted(Boolean(c.exclude_previously_contacted));
    if (rStart > 0 && rEnd >= rStart) {
      setEditTargetLimitMode('range');
    } else if (tLim > 0) {
      setEditTargetLimitMode('limit');
    } else {
      setEditTargetLimitMode('all');
    }

    let parsedVariations: { subject: string; body_html: string }[] = [];
    let parsedSubjList: string[] = [c.subject || ''];
    let parsedBodyList: string[] = [c.body_html || c.body_plain || ''];

    if (c.content_variations) {
      try {
        const parsed = JSON.parse(c.content_variations);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsedVariations = parsed;
          parsedSubjList = parsed.map(p => p.subject).filter(Boolean);
          parsedBodyList = parsed.map(p => p.body_html).filter(Boolean);
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.subjects)) parsedSubjList = parsed.subjects;
          if (Array.isArray(parsed.bodies)) parsedBodyList = parsed.bodies;
        }
      } catch (_) {}
    }
    if (parsedVariations.length === 0) {
      parsedVariations = [{ subject: c.subject || '', body_html: c.body_html || '' }];
    }
    setEditVariations(parsedVariations);
    setEditSubjectVariations(parsedSubjList.length > 0 ? parsedSubjList : ['']);
    setEditBodyVariations(parsedBodyList.length > 0 ? parsedBodyList : ['']);

    const parsedSteps = Array.isArray(c.steps) && c.steps.length > 0
      ? c.steps.map((step, idx) => ({
          id: step.id ?? Date.now() + idx,
          trigger_event: step.trigger_event || 'wait',
          delay_seconds: step.delay_seconds || 86400,
          subject: step.subject || '',
          body_html: step.body_html || '',
          body_plain: step.body_plain || '',
        }))
      : [];
    setEditWorkflowSteps(parsedSteps);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setSavingEdit(true);
    try {
      const validSubjects = editSubjectVariations.filter(s => s.trim());
      const validBodies = editBodyVariations.filter(b => b.trim());

      let finalVariations: any = null;
      if (editContentMode === 'rotation') {
        if (validSubjects.length > 0 || validBodies.length > 0) {
          finalVariations = {
            subjects: validSubjects.length > 0 ? validSubjects : [editSubject],
            bodies: validBodies.length > 0 ? validBodies : [editFormatType === 'plain' ? editBodyPlain : editBodyHtml]
          };
        } else if (editVariations.length > 0) {
          finalVariations = editVariations;
        }
      }

      const finalSubj = editContentMode === 'rotation' && validSubjects.length > 0 ? validSubjects[0] : editSubject;
      const finalHtml = editContentMode === 'rotation' && validBodies.length > 0 ? validBodies[0] : (editFormatType === 'plain' ? '' : editBodyHtml);
      const nextSteps = editWorkflowSteps.map((step, idx) => ({
        step_number: idx + 2,
        subject: step.subject,
        body_html: editFormatType === 'plain' ? '' : step.body_html,
        body_plain: step.body_plain || (editFormatType === 'plain' ? step.body_html : ''),
        delay_seconds: step.delay_seconds,
        trigger_event: step.trigger_event,
      }));

      const activeFilters = editCustomFilterRules.filter(r => r.field && (r.value !== '' || r.operator === 'is_empty' || r.operator === 'is_not_empty'));
      const targetCount = editTargetLimitMode === 'limit' && editTargetLimit > 0 ? editTargetLimit : 0;
      const startRange = editTargetLimitMode === 'range' && editTargetRangeStart > 0 ? editTargetRangeStart : 0;
      const endRange = editTargetLimitMode === 'range' && editTargetRangeEnd >= editTargetRangeStart ? editTargetRangeEnd : 0;

      await api.updateCampaign(editingCampaign.id, {
        name: editName,
        contact_list: editContactList || null,
        subject: finalSubj,
        body_html: finalHtml,
        body_plain: editBodyPlain,
        format_type: editFormatType,
        delay_seconds: editDelay,
        start_time: editStartTime,
        end_time: editEndTime,
        ignore_window: editIgnoreWindow ? 1 : 0,
        timezone: editTimezone || 'Africa/Lagos',
        account_ids: editSelectedAccountIds.length > 0 ? editSelectedAccountIds : undefined,
        target_limit: targetCount,
        target_range_start: startRange,
        target_range_end: endRange,
        exclude_previously_contacted: editExcludePreviouslyContacted ? 1 : 0,
        custom_filters: activeFilters.length > 0 ? activeFilters : undefined,
        content_mode: editContentMode,
        content_variations: finalVariations,
        steps: nextSteps,
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
            </div>
          </div>

          {/* Top Dashboard Stats */}
          {(() => {
            const activeCount = campaigns.filter(c => c.status === 'sending').length;
            const totalSent = campaigns.reduce((acc, c) => acc + (c.sent_count || 0), 0);
            const totalOpens = campaigns.reduce((acc, c) => acc + (c.total_opens || 0), 0);
            const totalClicks = campaigns.reduce((acc, c) => acc + (c.total_clicks || 0), 0);
            const avgOpenRate = totalSent > 0 ? `${((totalOpens / totalSent) * 100).toFixed(1)}%` : '0.0%';

            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Campaigns</p>
                  <p className="font-heading text-2xl font-bold text-foreground">{activeCount}</p>
                </div>
                <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Sent</p>
                  <p className="font-heading text-2xl font-bold text-foreground">{totalSent.toLocaleString()}</p>
                </div>
                <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Avg Open Rate</p>
                  <p className="font-heading text-2xl font-bold text-foreground">{avgOpenRate}</p>
                </div>
                <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Total Opens</p>
                  <p className="font-heading text-2xl font-bold text-foreground">{totalOpens.toLocaleString()}</p>
                </div>
              </div>
            );
          })()}

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
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Campaign Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Q4 Growth Outreach (Optional, auto-generated if left blank)"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-background text-xs sm:text-sm rounded-xl border border-input px-3.5 py-2.5 focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Target Contact List &amp; Audience Filters</h3>
                    <p className="text-xs text-muted-foreground">Select your prospect list, apply custom field criteria (e.g. revenue, company size), and define volume limits.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-bold text-xs text-foreground">Assigned Contact List</span>
                      </div>
                      {selectedList && (
                        <span className="text-[11px] text-muted-foreground">
                          Total List: <strong className="text-foreground">{lists.find(l => l.list_name === selectedList)?.count ?? 0} leads</strong>
                        </span>
                      )}
                    </div>

                    {lists.length === 0 ? (
                      <div className="text-xs text-muted-foreground p-4 border border-dashed rounded-xl bg-background text-center">
                        No contact lists found. Please upload contacts in the Contacts section first.
                      </div>
                    ) : (
                      <select
                        value={selectedList}
                        onChange={e => setSelectedList(e.target.value)}
                        className="w-full bg-background text-xs sm:text-sm rounded-xl border border-input p-2.5 focus:ring-1 focus:ring-primary font-medium"
                      >
                        <option value="">Select a contact list...</option>
                        {lists.map(l => (
                          <option key={l.list_name} value={l.list_name}>
                            {l.list_name} ({l.count} recipients)
                          </option>
                        ))}
                      </select>
                    )}

                    {selectedList && (
                      <div className="pt-4 border-t border-border/20 space-y-4">
                        {/* Dynamic CSV Headers Bar with 1-Click Copy */}
                        {listTokens.length > 0 && (
                          <div className="p-3 bg-background rounded-xl border border-border/60 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                <Tag className="h-3 w-3 text-primary" /> Detected Contact CSV Headers (Click to Copy):
                              </span>
                              <span className="text-[10px] text-muted-foreground">{listTokens.length} columns detected</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {listTokens.map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={(e) => handleCopyToken(t, e)}
                                  className="px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-mono text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                                  title="Click to copy variable token"
                                >
                                  {copiedToken === t ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-2.5 w-2.5 opacity-60" />}
                                  <span>{`{{${t}}}`}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Custom Attribute Filter Rule Builder */}
                        <div className="p-3.5 bg-background rounded-xl border border-border/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Filter className="h-3.5 w-3.5 text-primary" />
                              Custom Attribute Filters ({customFilterRules.length})
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const defaultField = listTokens[0] || 'company';
                                setCustomFilterRules([...customFilterRules, { id: String(Date.now()), field: defaultField, operator: 'contains', value: '' }]);
                              }}
                              className="h-7 text-[10px] gap-1 font-semibold"
                            >
                              <Plus className="h-3 w-3" /> Add Filter Rule
                            </Button>
                          </div>

                          {customFilterRules.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground italic">
                              No custom filter applied. All contacts in list will be targeted. Click "+ Add Filter Rule" to filter by attributes like revenue, job title, city, or tags.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              {customFilterRules.map((rule, idx) => (
                                <div key={rule.id || idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-lg border border-border/40 text-xs">
                                  <div className="sm:col-span-4">
                                    <select
                                      value={rule.field}
                                      onChange={e => {
                                        const next = [...customFilterRules];
                                        next[idx].field = e.target.value;
                                        setCustomFilterRules(next);
                                      }}
                                      className="w-full bg-background text-xs rounded-md border border-input p-1.5 font-mono"
                                    >
                                      {Array.from(new Set(['email', 'first_name', 'last_name', 'company', ...listTokens])).map(f => (
                                        <option key={f} value={f}>{f}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="sm:col-span-3">
                                    <select
                                      value={rule.operator}
                                      onChange={e => {
                                        const next = [...customFilterRules];
                                        next[idx].operator = e.target.value;
                                        setCustomFilterRules(next);
                                      }}
                                      className="w-full bg-background text-xs rounded-md border border-input p-1.5 font-medium"
                                    >
                                      <option value="contains">Contains text</option>
                                      <option value="not_contains">Does not contain</option>
                                      <option value="equals">Equals exactly (=)</option>
                                      <option value="not_equals">Not equal to (!=)</option>
                                      <option value="starts_with">Starts with</option>
                                      <option value="ends_with">Ends with</option>
                                      <option value="gt">&gt; Greater than (&gt;)</option>
                                      <option value="gte">&gt;= Greater or equal (&gt;=)</option>
                                      <option value="lt">&lt; Less than (&lt;)</option>
                                      <option value="lte">&lt;= Less or equal (&lt;=)</option>
                                      <option value="is_empty">Is empty / No value</option>
                                      <option value="is_not_empty">Is not empty / Has value</option>
                                    </select>
                                  </div>
                                  <div className="sm:col-span-4">
                                    {rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty' && (
                                      <input
                                        type="text"
                                        placeholder="Value (e.g. 20000, CEO, London)..."
                                        value={rule.value}
                                        onChange={e => {
                                          const next = [...customFilterRules];
                                          next[idx].value = e.target.value;
                                          setCustomFilterRules(next);
                                        }}
                                        className="w-full bg-background text-xs rounded-md border border-input p-1.5"
                                      />
                                    )}
                                  </div>
                                  <div className="sm:col-span-1 text-right">
                                    <button
                                      type="button"
                                      onClick={() => setCustomFilterRules(customFilterRules.filter((_, i) => i !== idx))}
                                      className="text-destructive hover:opacity-80 p-1"
                                      title="Remove filter"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Target Lead Volume & Range Slicing Box */}
                        <div className="p-3.5 bg-background rounded-xl border border-border/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                              Target Lead Volume &amp; Range Slicing
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <button
                              type="button"
                              onClick={() => { setTargetLimitMode('all'); }}
                              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                                targetLimitMode === 'all'
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/60 text-muted-foreground hover:bg-muted/30'
                              }`}
                            >
                              <span className="block font-bold">All Matching Leads</span>
                              <span className="text-[10px] opacity-80">Send to all contacts in list without caps</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setTargetLimitMode('limit'); if (!targetLimit) setTargetLimit(500); }}
                              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                                targetLimitMode === 'limit'
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/60 text-muted-foreground hover:bg-muted/30'
                              }`}
                            >
                              <span className="block font-bold">First N Leads (Max Cap)</span>
                              <span className="text-[10px] opacity-80">Send from contact 1 up to contact N</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setTargetLimitMode('range'); if (!targetRangeStart) setTargetRangeStart(1); if (!targetRangeEnd) setTargetRangeEnd(500); }}
                              className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition-all ${
                                targetLimitMode === 'range'
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/60 text-muted-foreground hover:bg-muted/30'
                              }`}
                            >
                              <span className="block font-bold">Row Range / Slice</span>
                              <span className="text-[10px] opacity-80">Send precise slice (e.g. row 500 to 600)</span>
                            </button>
                          </div>

                          {targetLimitMode === 'limit' && (
                            <div className="pt-2 flex flex-wrap items-center gap-2">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Max Recipients:</label>
                              <input
                                type="number"
                                min={1}
                                value={targetLimit}
                                onChange={e => setTargetLimit(Math.max(1, Number(e.target.value)))}
                                className="w-36 bg-muted/30 text-xs font-bold rounded-lg border border-input px-3 py-1.5"
                                placeholder="500"
                              />
                              <span className="text-xs text-muted-foreground">contacts (1 to {targetLimit})</span>
                              <div className="flex gap-1 ml-auto">
                                {[100, 250, 500, 1000, 2500, 5000].map(cnt => (
                                  <button
                                    key={cnt}
                                    type="button"
                                    onClick={() => setTargetLimit(cnt)}
                                    className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-muted/80 text-muted-foreground font-medium border border-border/40"
                                  >
                                    {cnt}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {targetLimitMode === 'range' && (
                            <div className="pt-2 space-y-2">
                              <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">From Row:</label>
                                  <input
                                    type="number"
                                    min={1}
                                    value={targetRangeStart}
                                    onChange={e => setTargetRangeStart(Math.max(1, Number(e.target.value)))}
                                    className="w-24 bg-muted/30 text-xs font-bold rounded-lg border border-input px-3 py-1.5"
                                    placeholder="1"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">To Row:</label>
                                  <input
                                    type="number"
                                    min={targetRangeStart}
                                    value={targetRangeEnd}
                                    onChange={e => setTargetRangeEnd(Math.max(targetRangeStart, Number(e.target.value)))}
                                    className="w-24 bg-muted/30 text-xs font-bold rounded-lg border border-input px-3 py-1.5"
                                    placeholder="500"
                                  />
                                </div>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                  Targeting {Math.max(0, targetRangeEnd - targetRangeStart + 1)} contacts (Rows {targetRangeStart} to {targetRangeEnd})
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                                <span className="font-bold">Quick presets:</span>
                                {[
                                  { label: '1 – 500', start: 1, end: 500 },
                                  { label: '501 – 1000', start: 501, end: 1000 },
                                  { label: '1001 – 1500', start: 1001, end: 1500 },
                                  { label: '1501 – 2000', start: 1501, end: 2000 },
                                  { label: '1 – 1000', start: 1, end: 1000 },
                                ].map(p => (
                                  <button
                                    key={p.label}
                                    type="button"
                                    onClick={() => { setTargetRangeStart(p.start); setTargetRangeEnd(p.end); }}
                                    className="px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-foreground font-medium border border-border/40"
                                  >
                                    {p.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sent Memory & Deduplication Box */}
                        <div className="p-3.5 bg-background rounded-xl border border-border/60 flex items-center justify-between gap-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Brain className="h-4 w-4 text-primary" />
                              <span className="text-xs font-bold text-foreground">Sent Memory &amp; Cross-Campaign Deduplication</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              Automatically exclude leads who have already been sent an email in any prior campaign or Direct Send.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExcludePreviouslyContacted(!excludePreviouslyContacted)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                              excludePreviouslyContacted
                                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                : 'bg-muted text-muted-foreground border-border/60 hover:bg-muted/80'
                            }`}
                          >
                            {excludePreviouslyContacted ? '✓ Exclude Contacted (Active)' : 'Off (Include All)'}
                          </button>
                        </div>

                        {/* Audience Filter & Inspection Table */}
                        {(() => {
                          const filteredProspects = selectedListContacts.filter(c => {
                            const q = prospectSearch.toLowerCase();
                            const matchesQ = !q || c.email.toLowerCase().includes(q) || (c.fields && Object.values(c.fields).some(v => String(v).toLowerCase().includes(q)));
                            const domain = c.email.split('@')[1] || '';
                            const matchesDomain = prospectDomainFilter === 'all' || domain === prospectDomainFilter;
                            const matchesStatus = prospectStatusFilter === 'all' || (c.status || 'pending') === prospectStatusFilter;
                            if (!matchesQ || !matchesDomain || !matchesStatus) return false;

                            if (customFilterRules.length > 0) {
                              return customFilterRules.every(rule => {
                                if (!rule.field) return true;
                                const op = String(rule.operator || 'contains').toLowerCase().trim();
                                const fVal = String(c.fields?.[rule.field] ?? (c as any)[rule.field] ?? '').toLowerCase().trim();
                                const targetVal = String(rule.value !== undefined ? rule.value : '').toLowerCase().trim();
                                const numFVal = parseFloat(fVal);
                                const numTargetVal = parseFloat(targetVal);

                                if (op === 'is_empty') return fVal === '';
                                if (op === 'is_not_empty') return fVal !== '';
                                if (rule.value === undefined || rule.value === '') return true;

                                switch (op) {
                                  case 'equals':
                                  case '=':
                                    return fVal === targetVal;
                                  case 'not_equals':
                                  case '!=':
                                    return fVal !== targetVal;
                                  case 'contains':
                                    return fVal.includes(targetVal);
                                  case 'not_contains':
                                    return !fVal.includes(targetVal);
                                  case 'starts_with':
                                    return fVal.startsWith(targetVal);
                                  case 'ends_with':
                                    return fVal.endsWith(targetVal);
                                  case 'gt':
                                  case '>':
                                    return !isNaN(numFVal) && !isNaN(numTargetVal) ? numFVal > numTargetVal : fVal > targetVal;
                                  case 'lt':
                                  case '<':
                                    return !isNaN(numFVal) && !isNaN(numTargetVal) ? numFVal < numTargetVal : fVal < targetVal;
                                  case 'gte':
                                  case '>=':
                                    return !isNaN(numFVal) && !isNaN(numTargetVal) ? numFVal >= numTargetVal : fVal >= targetVal;
                                  case 'lte':
                                  case '<=':
                                    return !isNaN(numFVal) && !isNaN(numTargetVal) ? numFVal <= numTargetVal : fVal <= targetVal;
                                  default:
                                    return true;
                                }
                              });
                            }
                            return true;
                          });

                          let effectiveProspects = filteredProspects;
                          if (targetLimitMode === 'range' && targetRangeStart > 0 && targetRangeEnd >= targetRangeStart) {
                            effectiveProspects = filteredProspects.slice(Math.max(0, targetRangeStart - 1), Math.min(filteredProspects.length, targetRangeEnd));
                          } else if (targetLimitMode === 'limit' && targetLimit > 0) {
                            effectiveProspects = filteredProspects.slice(0, targetLimit);
                          }
                          const effectiveCount = effectiveProspects.length;

                          return (
                            <div className="p-3 bg-background rounded-xl border border-border/60 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <Eye className="h-3.5 w-3.5 text-primary" />
                                  Matching Audience Inspection
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                                  {effectiveCount} contacts targeted {
                                    targetLimitMode === 'range'
                                      ? `(Slice: Rows ${targetRangeStart} to ${targetRangeEnd})`
                                      : targetLimitMode === 'limit' && targetLimit > 0
                                        ? `(Capped at ${targetLimit})`
                                        : `(All matching)`
                                  }
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                <div className="relative">
                                  <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                                  <input
                                    type="text"
                                    placeholder="Search by keyword..."
                                    value={prospectSearch}
                                    onChange={e => setProspectSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-muted/30 border border-input rounded-lg text-xs focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <select
                                    value={prospectDomainFilter}
                                    onChange={e => setProspectDomainFilter(e.target.value)}
                                    className="w-full py-1.5 px-2.5 bg-muted/30 border border-input rounded-lg text-xs focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="all">All Domains</option>
                                    {Array.from(new Set(selectedListContacts.map(c => c.email.split('@')[1]).filter(Boolean))).map(d => (
                                      <option key={d} value={d}>@{d}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <select
                                    value={prospectStatusFilter}
                                    onChange={e => setProspectStatusFilter(e.target.value)}
                                    className="w-full py-1.5 px-2.5 bg-muted/30 border border-input rounded-lg text-xs focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="all">All Delivery Statuses</option>
                                    <option value="pending">Pending</option>
                                    <option value="queued">Queued</option>
                                    <option value="sent">Sent</option>
                                    <option value="failed">Failed</option>
                                  </select>
                                </div>
                              </div>

                              {/* Filtered Preview Table */}
                              <div className="max-h-40 overflow-y-auto border border-border/40 rounded-lg">
                                <table className="w-full text-left text-[11px]">
                                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[9px] font-bold sticky top-0">
                                    <tr>
                                      <th className="p-2">Recipient Email</th>
                                      <th className="p-2">Name / Company / Title</th>
                                      <th className="p-2">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/20">
                                    {filteredProspects.slice(0, 15).map((c, i) => (
                                      <tr key={c.id || i} className="hover:bg-muted/20">
                                        <td className="p-2 font-mono">{c.email}</td>
                                        <td className="p-2 text-muted-foreground">{c.fields?.company || c.fields?.title || c.fields?.first_name || '-'}</td>
                                        <td className="p-2 capitalize">
                                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600">
                                            {c.status || 'Ready'}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
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
                      placeholder="e.g. Q4 Growth Outreach"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-background text-xs sm:text-sm rounded-xl border border-input px-3.5 py-2.5 focus:ring-1 focus:ring-primary font-medium"
                    />
                  </div>

                  {/* Message Format Selection Checklist / Toggle */}
                  <div className="p-3 bg-muted/15 border border-border/60 rounded-xl space-y-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Message Format Mode</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormatType('html')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          formatType === 'html'
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border/60 text-muted-foreground hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formatType === 'html' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                            {formatType === 'html' && <Check className="h-2.5 w-2.5" />}
                          </div>
                          <span className="text-xs font-bold">HTML Rich Format</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 pl-6">
                          Includes rich styling, images, links, and live HTML rendering preview.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormatType('plain')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          formatType === 'plain'
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border/60 text-muted-foreground hover:bg-muted/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${formatType === 'plain' ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                            {formatType === 'plain' && <Check className="h-2.5 w-2.5" />}
                          </div>
                          <span className="text-xs font-bold">Plain Text Only</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 pl-6">
                          Pure text message for highest deliverability and inbox placement.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Personalization Reference Headers Bar with 1-Click Insert & 1-Click Copy */}
                  <div className="p-3.5 bg-muted/20 border border-border/60 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5 text-primary" />
                        Dynamic Personalization Headers (Click to insert or copy):
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Targeting: {activeEditorField === 'subject' ? 'Subject Line' : activeEditorField === 'bodyPlain' ? 'Plain Text' : 'HTML Body'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {allPersonalizationTokens.map(tok => (
                        <div
                          key={tok}
                          className="inline-flex items-center rounded-lg border border-border/60 bg-card hover:border-primary/40 text-foreground transition-all shadow-2xs overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => handleInsertToken(tok)}
                            className="px-2.5 py-1 hover:bg-primary/10 text-foreground hover:text-primary font-mono text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Click to insert variable"
                          >
                            <span>{`{{${tok}}}`}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleCopyToken(tok, e)}
                            className="px-1.5 py-1 border-l border-border/40 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Copy variable to clipboard"
                          >
                            {copiedToken === tok ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-2.5 w-2.5" />}
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Sentence & Word Spintax Helper Tip */}
                    <div className="pt-2 border-t border-border/20 flex items-start gap-2 text-[11px] text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p>
                          <strong className="text-foreground">Full Sentence Spintax Engine:</strong> Use <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-primary font-bold">&#123;Sentence A|Sentence B&#125;</code> for full paragraphs or sentences with embedded variables.
                        </p>
                        <div className="flex flex-wrap gap-3 text-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              const sample = "{Hi {{first_name}}, hope your week is going great at {{company}}.|Hello {{first_name}}, reaching out to your team at {{company}} with a quick question.}";
                              if (formatType === 'plain') {
                                setBodyPlain(prev => prev ? `${prev}\n\n${sample}` : sample);
                              } else {
                                setBodyHtml(prev => prev ? `${prev}\n<p>${sample}</p>` : `<p>${sample}</p>`);
                              }
                              toast({ title: 'Sentence Spintax Inserted', description: 'Added multi-sentence rotational options.' });
                            }}
                            className="text-primary hover:underline font-mono font-semibold cursor-pointer"
                          >
                            + Insert Sample Sentence Spintax
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const sampleGreeting = "{Hi|Hello|Hey}";
                              setSubject(`${sampleGreeting} {{first_name}} - quick note`);
                              setSubjectVariations([`${sampleGreeting} {{first_name}} - quick note`]);
                              toast({ title: 'Spintax Subject Applied', description: 'Set rotational greeting in Subject.' });
                            }}
                            className="text-primary hover:underline font-mono font-semibold cursor-pointer"
                          >
                            + Insert Spintax Subject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Load Pre-built Template (Optional)</label>
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

                  {/* Mode Toggles: Single Layout vs Rotational Variations */}
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      onClick={() => setContentMode('single')}
                      className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                        contentMode === 'single'
                          ? 'border-primary bg-primary/10 font-bold text-primary shadow-sm'
                          : 'border-border/60 text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      <span className="text-xs block font-bold">Single Layout</span>
                      <span className="text-[10px] opacity-75">1 Subject line and 1 Body message</span>
                    </div>
                    <div
                      onClick={() => setContentMode('rotation')}
                      className={`p-3 rounded-xl border cursor-pointer text-center transition-all ${
                        contentMode === 'rotation'
                          ? 'border-primary bg-primary/10 font-bold text-primary shadow-sm'
                          : 'border-border/60 text-muted-foreground hover:bg-muted/20'
                      }`}
                    >
                      <span className="text-xs block font-bold">Rotational Variations (Deliverability Matrix)</span>
                      <span className="text-[10px] opacity-75">Multiple Subjects × Multiple Bodies</span>
                    </div>
                  </div>

                  {/* Single Mode Subject & Body */}
                  {contentMode === 'single' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subject Line</label>
                        <input
                          type="text"
                          placeholder="e.g. Quick question regarding {{company}}"
                          value={subject}
                          onFocus={() => setActiveEditorField('subject')}
                          onChange={e => {
                            setSubject(e.target.value);
                            setSubjectVariations([e.target.value]);
                          }}
                          className="w-full bg-background text-xs rounded-xl border border-input px-3.5 py-2.5 focus:ring-1 focus:ring-primary font-medium"
                        />
                      </div>

                      {/* HTML Mode: HTML Editor & Preview */}
                      {formatType === 'html' && (
                        <>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">HTML Body</label>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  type="button"
                                  onClick={() => setShowPreview(!showPreview)}
                                  className="h-7 text-[10px] text-muted-foreground hover:text-foreground"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  {showPreview ? 'Hide Preview' : 'Live HTML Preview'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  type="button"
                                  onClick={() => handleOpenCampaignTestModal()}
                                  className="h-7 text-[10px] gap-1 font-bold border-[#635bff]/40 text-[#635bff] hover:bg-[#635bff]/10"
                                  title="Send a live test email with this draft"
                                >
                                  <Send className="h-3 w-3" />
                                  <span>Send Test</span>
                                </Button>
                                <VoiceToTextButton
                                  size="sm"
                                  label="Voice Input"
                                  onTranscript={(text) => {
                                    setBodyHtml(prev => prev ? `${prev}\n<p>${text}</p>` : `<p>${text}</p>`);
                                    setBodyPlain(prev => prev ? `${prev}\n${text}` : text);
                                  }}
                                />
                              </div>
                            </div>
                            <div className={`grid ${showPreview ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-1'} items-start`}>
                              <textarea
                                placeholder="<h2>Hello!</h2><p>Writing regarding your outreach...</p>"
                                value={bodyHtml}
                                onFocus={() => setActiveEditorField('bodyHtml')}
                                onChange={e => {
                                  setBodyHtml(e.target.value);
                                  setBodyVariations([e.target.value]);
                                }}
                                className={`w-full bg-background text-xs rounded-xl border border-input p-3 min-h-[160px] font-mono focus:ring-1 focus:ring-primary ${showPreview ? 'h-[160px]' : ''}`}
                              />
                              {showPreview && (
                                <div className="w-full h-[160px] bg-white text-black p-4 rounded-xl border border-border/60 overflow-y-auto shadow-inner text-sm">
                                  <div dangerouslySetInnerHTML={{ __html: bodyHtml || '<p style="color:#999;font-style:italic">Live rendered HTML preview...</p>' }} />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Collapsible Plain Text Fallback */}
                          <div className="pt-1">
                            {!showFallbackEditor && !bodyPlain ? (
                              <button
                                type="button"
                                onClick={() => setShowFallbackEditor(true)}
                                className="text-[11px] text-muted-foreground hover:text-primary font-medium flex items-center gap-1.5 transition-colors py-1"
                              >
                                <Plus className="h-3 w-3" /> Add Plain Text Fallback (Optional)
                              </button>
                            ) : (
                              <div className="space-y-1 p-2.5 rounded-lg bg-muted/20 border border-border/60 animate-in fade-in duration-150">
                                <div className="flex items-center justify-between">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Plain Text Fallback</label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowFallbackEditor(false);
                                      if (!bodyPlain) setBodyPlain('');
                                    }}
                                    className="text-[10px] text-muted-foreground hover:text-foreground"
                                  >
                                    Collapse
                                  </button>
                                </div>
                                <textarea
                                  placeholder="Plain text fallback for clients that disable HTML..."
                                  value={bodyPlain}
                                  onFocus={() => setActiveEditorField('bodyPlain')}
                                  onChange={e => setBodyPlain(e.target.value)}
                                  className="w-full bg-background text-xs rounded-lg border border-input p-2.5 min-h-[60px] focus:ring-1 focus:ring-primary"
                                />
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Plain Text Only Mode: Single text editor without any HTML UI */}
                      {formatType === 'plain' && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Plain Text Message Content</label>
                            <VoiceToTextButton
                              size="sm"
                              label="Voice Input"
                              onTranscript={(text) => {
                                setBodyPlain(prev => prev ? `${prev}\n${text}` : text);
                              }}
                            />
                          </div>
                          <textarea
                            placeholder="Hi {{first_name}},\n\nReaching out regarding {{company}}...\n\nBest regards,\nYour Name"
                            value={bodyPlain}
                            onFocus={() => setActiveEditorField('bodyPlain')}
                            onChange={e => {
                              setBodyPlain(e.target.value);
                              setBodyVariations([e.target.value]);
                            }}
                            className="w-full bg-background text-xs sm:text-sm rounded-xl border border-input p-3 min-h-[160px] font-sans focus:ring-1 focus:ring-primary leading-relaxed"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rotational Variations: Multiple Subject Lines & Multiple Body Variations */}
                  {contentMode === 'rotation' && (
                    <div className="space-y-4 border border-border/40 rounded-xl p-4 bg-muted/10">
                      {/* Matrix Combination Live Indicator */}
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                          <RotateCw className="h-4 w-4" />
                          Deliverability Matrix: {subjectVariations.filter(s => s.trim()).length || 1} Subjects × {bodyVariations.filter(b => b.trim()).length || 1} Bodies = {(subjectVariations.filter(s => s.trim()).length || 1) * (bodyVariations.filter(b => b.trim()).length || 1)} Unique Outreaches
                        </span>
                        <span className="text-[10px] text-primary font-semibold">Rotated evenly per lead</span>
                      </div>

                      {/* 1. Multiple Subject Lines */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1">
                            <Tag className="h-3.5 w-3.5 text-primary" />
                            Multiple Subject Lines ({subjectVariations.length})
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => setSubjectVariations([...subjectVariations, ''])}
                            className="h-7 text-[10px] font-semibold gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add Subject Line
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {subjectVariations.map((subj, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-muted-foreground w-6 text-center shrink-0">#{sIdx + 1}</span>
                              <input
                                type="text"
                                placeholder={`Subject line variation #${sIdx + 1}...`}
                                value={subj}
                                onFocus={() => setActiveEditorField('subject')}
                                onChange={e => {
                                  const next = [...subjectVariations];
                                  next[sIdx] = e.target.value;
                                  setSubjectVariations(next);
                                }}
                                className="w-full bg-background text-xs rounded-lg border border-input p-2 font-medium"
                              />
                              {subjectVariations.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setSubjectVariations(subjectVariations.filter((_, i) => i !== sIdx))}
                                  className="text-destructive hover:opacity-80 p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 2. Multiple Body Variations */}
                      <div className="space-y-2 pt-3 border-t border-border/20">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5 text-primary" />
                            Multiple Body Variations ({bodyVariations.length}) [{formatType.toUpperCase()}]
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => setBodyVariations([...bodyVariations, ''])}
                            className="h-7 text-[10px] font-semibold gap-1"
                          >
                            <Plus className="h-3 w-3" /> Add Body Variation
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {bodyVariations.map((body, bIdx) => (
                            <div key={bIdx} className="p-3 border border-border/40 bg-background rounded-xl space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">Body Variation #{bIdx + 1}</span>
                                {bodyVariations.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => setBodyVariations(bodyVariations.filter((_, i) => i !== bIdx))}
                                    className="text-destructive hover:opacity-80 p-1"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                              <textarea
                                placeholder={formatType === 'html' ? `<p>Hello {{first_name}}, option #${bIdx + 1}...</p>` : `Hi {{first_name}},\n\nVariation #${bIdx + 1}...`}
                                value={body}
                                onFocus={() => setActiveEditorField(formatType === 'plain' ? 'bodyPlain' : 'bodyHtml')}
                                onChange={e => {
                                  const next = [...bodyVariations];
                                  next[bIdx] = e.target.value;
                                  setBodyVariations(next);
                                }}
                                className={`w-full bg-muted/20 text-xs rounded-lg border border-input p-2.5 min-h-[90px] ${formatType === 'html' ? 'font-mono' : 'font-sans leading-relaxed'}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Follow-up Sequences */}
              {formStep === 3 && (
                <div className="py-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Post-Outreach Automated Follow-up Sequences</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">Configure subsequent automated touches triggered if a prospect does not reply or open.</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      type="button" 
                      onClick={() => setWorkflowSteps([...workflowSteps, { id: Date.now(), trigger_event: 'wait', delay_seconds: 86400, subject: 'Re: ' + (subject || 'Following up'), body_html: '', body_plain: '' }])}
                      className="h-8 text-xs font-semibold gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Follow-up Step
                    </Button>
                  </div>
                  {workflowSteps.length === 0 ? (
                    <div className="p-8 text-center border border-dashed rounded-xl bg-muted/10 text-xs text-muted-foreground space-y-2">
                      <Layers className="h-8 w-8 mx-auto opacity-30 text-primary" />
                      <p className="font-semibold text-foreground">No Follow-up Sequence Added</p>
                      <p>Campaign will only send the initial outreach email (Step 1). Click "Add Follow-up Step" to trigger automatic multi-touch sequences.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {workflowSteps.map((step, index) => {
                        const isExpanded = expandedStepIds.has(step.id) || (!step.body_html && !step.body_plain);
                        const toggleExpand = () => {
                          setExpandedStepIds(prev => {
                            const next = new Set(prev);
                            if (next.has(step.id)) next.delete(step.id);
                            else next.add(step.id);
                            return next;
                          });
                        };

                        return (
                          <div key={step.id} className="rounded-xl border border-border/70 bg-card overflow-hidden shadow-2xs transition-all">
                            {/* Compact Step Header & Summary Bar */}
                            <div 
                              onClick={toggleExpand}
                              className="px-3.5 py-2.5 bg-muted/30 hover:bg-muted/50 cursor-pointer flex items-center justify-between gap-3 border-b border-border/40 select-none"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="bg-primary text-primary-foreground h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0">
                                  {index + 2}
                                </span>
                                <div className="min-w-0 flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-foreground truncate">
                                    Step #{index + 2}: {step.subject || '(No subject set)'}
                                  </span>
                                  <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 shrink-0">
                                    {step.trigger_event === 'wait' ? 'Wait Delay' : step.trigger_event} · {Math.round(step.delay_seconds / 3600)}h
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={toggleExpand}
                                  className="p-1 text-muted-foreground hover:text-foreground rounded"
                                  title={isExpanded ? "Collapse step" : "Expand step"}
                                >
                                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  type="button"
                                  onClick={() => setWorkflowSteps(workflowSteps.filter(s => s.id !== step.id))}
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                  title="Delete step"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>

                            {/* Collapsible Step Body Editor */}
                            {isExpanded && (
                              <div className="p-3.5 space-y-3 bg-background/50 animate-in fade-in duration-150">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Trigger Condition</label>
                                    <select
                                      value={step.trigger_event}
                                      onChange={(e) => {
                                        const newSteps = [...workflowSteps];
                                        newSteps[index].trigger_event = e.target.value;
                                        setWorkflowSteps(newSteps);
                                      }}
                                      className="w-full bg-background text-xs rounded-lg border border-input p-2 outline-none focus:ring-1 focus:ring-primary font-medium"
                                    >
                                      <option value="wait">Wait Time (Always Send)</option>
                                      <option value="unopened">If Previous Email Unopened</option>
                                      <option value="opened">If Previous Email Opened</option>
                                      <option value="clicked">If Link Clicked</option>
                                      <option value="no_reply">If No Reply Received</option>
                                    </select>
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Wait Delay</label>
                                    <select
                                      value={step.delay_seconds}
                                      onChange={(e) => {
                                        const newSteps = [...workflowSteps];
                                        newSteps[index].delay_seconds = Number(e.target.value);
                                        setWorkflowSteps(newSteps);
                                      }}
                                      className="w-full bg-background text-xs rounded-lg border border-input p-2 outline-none focus:ring-1 focus:ring-primary font-medium"
                                    >
                                      <option value={3600}>1 Hour</option>
                                      <option value={43200}>12 Hours</option>
                                      <option value={86400}>1 Day (24h)</option>
                                      <option value={172800}>2 Days (48h)</option>
                                      <option value={259200}>3 Days (72h)</option>
                                      <option value={432000}>5 Days</option>
                                      <option value={604800}>7 Days</option>
                                    </select>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Subject Line</label>
                                  <input 
                                    type="text"
                                    placeholder="Re: Following up..."
                                    value={step.subject}
                                    onChange={(e) => {
                                      const newSteps = [...workflowSteps];
                                      newSteps[index].subject = e.target.value;
                                      setWorkflowSteps(newSteps);
                                    }}
                                    className="w-full bg-background text-xs rounded-lg border border-input p-2 outline-none focus:ring-1 focus:ring-primary font-medium"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Message Content</label>
                                  <textarea 
                                    placeholder="Hi {{first_name}}, just checking in on my previous email..."
                                    value={formatType === 'plain' ? (step.body_plain || step.body_html) : step.body_html}
                                    onChange={(e) => {
                                      const newSteps = [...workflowSteps];
                                      newSteps[index].body_html = e.target.value;
                                      newSteps[index].body_plain = e.target.value;
                                      setWorkflowSteps(newSteps);
                                    }}
                                    className="w-full bg-background text-xs rounded-lg border border-input p-2.5 min-h-[80px] font-mono focus:ring-1 focus:ring-primary leading-relaxed"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Schedule, Senders & Smart Rate Calculator */}
              {formStep === 4 && (
                <div className="py-4 space-y-5">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Sender Accounts, West Africa Time (WAT) &amp; Dispatch Speed</h3>
                    <p className="text-xs text-muted-foreground">Select specific sending mailboxes, configure sending windows in Lagos time (WAT), and calculate optimal dispatch rate.</p>
                  </div>

                  {/* 1. Sender Email Account(s) Selector */}
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        <span className="font-bold text-xs text-foreground">Sender Email Accounts</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => setSelectedAccountIds(accounts.map(a => a.id))}
                          className="text-primary hover:underline font-semibold"
                        >
                          Select All
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={() => setSelectedAccountIds([])}
                          className="text-muted-foreground hover:underline font-semibold"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>

                    {accounts.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No connected accounts found. System will fallback to any active connected mailboxes.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {accounts.map(acc => {
                          const isSelected = selectedAccountIds.includes(acc.id);
                          return (
                            <div
                              key={acc.id}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedAccountIds(selectedAccountIds.filter(id => id !== acc.id));
                                } else {
                                  setSelectedAccountIds([...selectedAccountIds, acc.id]);
                                }
                              }}
                              className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border/60 bg-background text-muted-foreground hover:bg-muted/20'
                              }`}
                            >
                              <div className="min-w-0 pr-2">
                                <span className="text-xs font-bold block truncate text-foreground">{acc.display_name || acc.email}</span>
                                <span className="text-[10px] text-muted-foreground block truncate">{acc.email}</span>
                              </div>
                              <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>
                                {isSelected && <Check className="h-3 w-3" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      {selectedAccountIds.length === 0 ? 'All active accounts will be rotated evenly.' : `Round-robin sending will rotate exclusively across the ${selectedAccountIds.length} selected account(s).`}
                    </p>
                  </div>

                  {/* 2. West Africa Time (WAT / Lagos UTC+1) & Sending Window */}
                  <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="font-bold text-xs text-foreground">Timezone: Africa/Lagos (WAT, UTC+1)</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                        Default Timezone (Lagos UTC+1)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 p-2.5 bg-background border border-border/40 rounded-xl">
                      <input
                        type="checkbox"
                        id="ignoreWindowCheckStep"
                        checked={ignoreWindow}
                        onChange={e => setIgnoreWindow(e.target.checked)}
                        className="h-4 w-4 rounded border-input text-primary"
                      />
                      <label htmlFor="ignoreWindowCheckStep" className="text-xs font-semibold text-foreground cursor-pointer">
                        Run 24/7 Immediately (Ignore daily time window restrictions)
                      </label>
                    </div>

                    {!ignoreWindow && (
                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Start Window (WAT)</label>
                          <input
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            className="w-full bg-background text-xs rounded-lg border border-input p-2 mt-1 font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">End Window (WAT)</label>
                          <input
                            type="time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            className="w-full bg-background text-xs rounded-lg border border-input p-2 mt-1 font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Smart Dispatch Rate Calculator */}
                  {(() => {
                    const filteredCount = selectedListContacts.length || (lists.find(l => l.list_name === selectedList)?.count ?? 100);
                    const effectiveTargetBasis = targetLimitMode === 'custom' && targetLimit > 0 ? Math.min(targetLimit, filteredCount) : filteredCount;
                    const totalDurationSeconds = (calcHours * 3600) + (calcMinutes * 60);
                    const calculatedDelay = Math.max(1, Math.floor(totalDurationSeconds / Math.max(1, effectiveTargetBasis)));
                    const emailsPerMin = (60 / calculatedDelay).toFixed(1);

                    return (
                      <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <Calculator className="h-4 w-4" />
                            Smart Dispatch Rate Calculator
                          </span>
                          <span className="text-[11px] text-muted-foreground">Targeting: <strong>{effectiveTargetBasis} leads</strong></span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Desired Outreach Duration:</label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={72}
                                value={calcHours}
                                onChange={e => setCalcHours(Math.max(0, Number(e.target.value)))}
                                className="w-20 bg-background text-xs font-bold rounded-lg border border-input p-2"
                              />
                              <span className="text-xs text-muted-foreground">hours</span>
                              <input
                                type="number"
                                min={0}
                                max={59}
                                value={calcMinutes}
                                onChange={e => setCalcMinutes(Math.max(0, Number(e.target.value)))}
                                className="w-20 bg-background text-xs font-bold rounded-lg border border-input p-2"
                              />
                              <span className="text-xs text-muted-foreground">mins</span>
                            </div>
                          </div>

                          <div className="p-2.5 bg-background rounded-xl border border-border/40 text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Computed Speed:</span>
                              <strong className="text-primary font-mono">{calculatedDelay}s delay ({emailsPerMin} emails/min)</strong>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setSpeed(calculatedDelay);
                                toast({
                                  title: 'Dispatch Rate Applied!',
                                  description: `Configured campaign delay to ${calculatedDelay}s (~${emailsPerMin} emails/min) for ${effectiveTargetBasis} contacts.`
                                });
                              }}
                              className="w-full h-7 text-[11px] font-bold bg-primary text-primary-foreground mt-1"
                            >
                              Apply Calculated Rate ({calculatedDelay}s)
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* 4. Cold Email Timing Randomizer Selector & 24hr Capacity Analysis */}
                  {(() => {
                    const filteredCount = selectedListContacts.length || (lists.find(l => l.list_name === selectedList)?.count ?? 100);
                    const effectiveTargetBasis = targetLimitMode === 'limit' && targetLimit > 0 ? Math.min(targetLimit, filteredCount) : filteredCount;
                    const numSenders = Math.max(1, selectedAccountIds.length || accounts.length || 1);
                    const avgDelay = timingMode === 'fixed' ? speed : Math.round((minDelay + maxDelay) / 2);
                    const cooldownAdditionalSeconds = cooldownEnabled && cooldownBatchSize > 0
                      ? Math.floor(effectiveTargetBasis / cooldownBatchSize) * (cooldownDurationMinutes * 60)
                      : 0;
                    const totalEstimatedSeconds = (effectiveTargetBasis * avgDelay) + cooldownAdditionalSeconds;
                    const estimatedTotalHours = totalEstimatedSeconds / 3600;
                    const estHoursInt = Math.floor(estimatedTotalHours);
                    const estMinsInt = Math.round((estimatedTotalHours - estHoursInt) * 60);

                    // 24hr throughput calculation
                    const theoretical24h = Math.floor(86400 / Math.max(1, avgDelay));
                    const maxQuota24h = numSenders * 450;
                    const effective24hCapacity = Math.min(theoretical24h, maxQuota24h);

                    const targetTimeframeHours = calcHours + (calcMinutes / 60);
                    const willExtend = !ignoreWindow && targetTimeframeHours > 0 && estimatedTotalHours > targetTimeframeHours;

                    return (
                      <div className="space-y-4">
                        {/* Randomizer Mode Selection */}
                        <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Sparkles className="h-4 w-4 text-primary" />
                              Cold Email Timing Randomizer
                            </span>
                            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                              Anti-Spam & Deliverability Guard
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Natural jitter humanizes sending patterns to prevent spam filters, mailbox throttling, and bot flags.
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                            {/* Preset 1: Smart Anti-Spam */}
                            <div
                              onClick={() => {
                                setTimingMode('smart');
                                setMinDelay(30);
                                setMaxDelay(90);
                                setSpeed(60);
                                setCooldownEnabled(true);
                                setCooldownBatchSize(15);
                                setCooldownDurationMinutes(5);
                              }}
                              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                timingMode === 'smart'
                                  ? 'border-primary bg-primary/10 shadow-sm'
                                  : 'border-border/60 bg-background hover:bg-muted/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                  🛡️ Smart Anti-Spam Jitter
                                </span>
                                {timingMode === 'smart' && <Check className="h-3.5 w-3.5 text-primary" />}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Random 30s – 90s delay with 5min rest every 15 emails. (Recommended for Gmail / Outlook cold outreach).
                              </p>
                            </div>

                            {/* Preset 2: Ultra Stealth */}
                            <div
                              onClick={() => {
                                setTimingMode('stealth');
                                setMinDelay(60);
                                setMaxDelay(180);
                                setSpeed(120);
                                setCooldownEnabled(true);
                                setCooldownBatchSize(10);
                                setCooldownDurationMinutes(10);
                              }}
                              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                timingMode === 'stealth'
                                  ? 'border-primary bg-primary/10 shadow-sm'
                                  : 'border-border/60 bg-background hover:bg-muted/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                  🥷 Ultra Stealth Mode
                                </span>
                                {timingMode === 'stealth' && <Check className="h-3.5 w-3.5 text-primary" />}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Random 60s – 180s delay with 10min pause every 10 emails. Ideal for newly warmed mailboxes.
                              </p>
                            </div>

                            {/* Preset 3: Balanced Cold Outreach */}
                            <div
                              onClick={() => {
                                setTimingMode('burst');
                                setMinDelay(15);
                                setMaxDelay(45);
                                setSpeed(30);
                                setCooldownEnabled(true);
                                setCooldownBatchSize(25);
                                setCooldownDurationMinutes(3);
                              }}
                              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                timingMode === 'burst'
                                  ? 'border-primary bg-primary/10 shadow-sm'
                                  : 'border-border/60 bg-background hover:bg-muted/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                  ⚡ Balanced Outreach
                                </span>
                                {timingMode === 'burst' && <Check className="h-3.5 w-3.5 text-primary" />}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Random 15s – 45s delay with 3min breather every 25 emails. Higher volume with natural jitter.
                              </p>
                            </div>

                            {/* Preset 4: Custom Range */}
                            <div
                              onClick={() => setTimingMode('custom')}
                              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                                timingMode === 'custom'
                                  ? 'border-primary bg-primary/10 shadow-sm'
                                  : 'border-border/60 bg-background hover:bg-muted/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-foreground flex items-center gap-1">
                                  ⚙️ Custom Range &amp; Cooldown
                                </span>
                                {timingMode === 'custom' && <Check className="h-3.5 w-3.5 text-primary" />}
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                Fine-tune exact minimum and maximum seconds and custom batch resting intervals.
                              </p>
                            </div>
                          </div>

                          {/* Custom Parameters Form */}
                          {timingMode === 'custom' && (
                            <div className="p-3 bg-background rounded-xl border border-border/40 space-y-3 mt-2">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Min Delay (seconds)</label>
                                  <input
                                    type="number"
                                    min={5}
                                    max={600}
                                    value={minDelay}
                                    onChange={e => setMinDelay(Math.max(1, Number(e.target.value)))}
                                    className="w-full bg-muted/20 text-xs rounded-lg border border-input p-2 mt-1 font-mono font-bold"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase">Max Delay (seconds)</label>
                                  <input
                                    type="number"
                                    min={minDelay}
                                    max={1200}
                                    value={maxDelay}
                                    onChange={e => setMaxDelay(Math.max(minDelay, Number(e.target.value)))}
                                    className="w-full bg-muted/20 text-xs rounded-lg border border-input p-2 mt-1 font-mono font-bold"
                                  />
                                </div>
                              </div>

                              <div className="flex items-center gap-2 pt-1 border-t border-border/20">
                                <input
                                  type="checkbox"
                                  id="cooldownCheck"
                                  checked={cooldownEnabled}
                                  onChange={e => setCooldownEnabled(e.target.checked)}
                                  className="h-3.5 w-3.5 rounded border-input text-primary"
                                />
                                <label htmlFor="cooldownCheck" className="text-xs font-semibold text-foreground cursor-pointer">
                                  Enable Periodic Batch Cooldown (Rest periods between email bursts)
                                </label>
                              </div>

                              {cooldownEnabled && (
                                <div className="grid grid-cols-2 gap-3 pt-1">
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Batch Size (emails)</label>
                                    <input
                                      type="number"
                                      min={5}
                                      max={200}
                                      value={cooldownBatchSize}
                                      onChange={e => setCooldownBatchSize(Math.max(1, Number(e.target.value)))}
                                      className="w-full bg-muted/20 text-xs rounded-lg border border-input p-2 mt-1 font-mono font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-muted-foreground uppercase">Cooldown Pause (minutes)</label>
                                    <input
                                      type="number"
                                      min={1}
                                      max={60}
                                      value={cooldownDurationMinutes}
                                      onChange={e => setCooldownDurationMinutes(Math.max(1, Number(e.target.value)))}
                                      className="w-full bg-muted/20 text-xs rounded-lg border border-input p-2 mt-1 font-mono font-bold"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 24-Hour Estimation & Timeframe Feasibility Alert */}
                        <div className={`p-4 rounded-xl border space-y-3 ${
                          willExtend
                            ? 'border-amber-500/40 bg-amber-500/5'
                            : 'border-emerald-500/40 bg-emerald-500/5'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              <Calculator className="h-4 w-4 text-primary" />
                              24-Hour Outreach Capacity &amp; Timeframe Calculation
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              willExtend
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            }`}>
                              {willExtend ? '⚠️ Timeframe Extension Alert' : '✅ Within Timeframe'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                            <div className="p-2.5 bg-background rounded-lg border border-border/40 space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">Target Contacts</span>
                              <strong className="text-foreground font-mono">{effectiveTargetBasis} leads</strong>
                            </div>
                            <div className="p-2.5 bg-background rounded-lg border border-border/40 space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">Active Senders</span>
                              <strong className="text-foreground font-mono">{numSenders} mailbox{numSenders > 1 ? 'es' : ''}</strong>
                            </div>
                            <div className="p-2.5 bg-background rounded-lg border border-border/40 space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">Avg Delay / Send</span>
                              <strong className="text-foreground font-mono">{avgDelay}s (±{Math.abs(maxDelay - minDelay) / 2}s)</strong>
                            </div>
                            <div className="p-2.5 bg-background rounded-lg border border-border/40 space-y-0.5">
                              <span className="text-[10px] text-muted-foreground block">Estimated Duration</span>
                              <strong className="text-primary font-mono">{estHoursInt}h {estMinsInt}m</strong>
                            </div>
                          </div>

                          <div className="p-3 bg-background rounded-lg border border-border/40 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">Estimated 24-Hour Max Volume:</span>
                              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                                ~{effective24hCapacity.toLocaleString()} emails / 24hrs
                              </strong>
                            </div>

                            {willExtend ? (
                              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px] leading-relaxed">
                                <strong>⚠️ Campaign will extend past timeframe:</strong> With the selected randomization delay (average {avgDelay}s), delivering {effectiveTargetBasis} emails will take approx <strong>{estHoursInt} hours {estMinsInt} minutes</strong>, exceeding your desired {calcHours}h target window.
                                <div className="mt-1 opacity-90">
                                  💡 <em>Recommendation: Select more sender accounts to distribute volume or adjust the randomizer range to a faster preset.</em>
                                </div>
                              </div>
                            ) : (
                              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[11px]">
                                ✨ <strong>On Schedule:</strong> {effectiveTargetBasis} emails will easily complete within approx <strong>{estHoursInt}h {estMinsInt}m</strong>, fully complying with your target window.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Step 5: Review */}
              {formStep === 5 && (
                <div className="py-4 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground mb-1">Campaign Configuration Summary</h3>
                    <p className="text-xs text-muted-foreground">Verify all parameters and deliverability settings before saving or launching.</p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/60 bg-muted/10 space-y-3 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Campaign Name:</span>
                      <input
                        type="text"
                        placeholder={selectedList ? `${selectedList} Campaign` : 'Untitled Campaign'}
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="bg-background text-xs font-bold text-foreground rounded-lg border border-input px-2.5 py-1 text-right focus:ring-1 focus:ring-primary max-w-[260px]"
                      />
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Target Contact List:</span>
                      <span className="font-bold text-foreground">{selectedList || 'None selected'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Custom Attribute Filters:</span>
                      <span className="font-bold text-foreground">{customFilterRules.length > 0 ? `${customFilterRules.length} rule(s) active` : 'All list leads targeted'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Target Volume Limit:</span>
                      <span className="font-bold text-foreground">{targetLimitMode === 'custom' && targetLimit > 0 ? `Capped to ${targetLimit} contacts` : 'Unlimited'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Message Format:</span>
                      <span className="font-bold text-foreground uppercase">{formatType}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Rotational Combinations:</span>
                      <span className="font-bold text-foreground">
                        {contentMode === 'rotation'
                          ? `${subjectVariations.filter(s => s.trim()).length || 1} Subjects × ${bodyVariations.filter(b => b.trim()).length || 1} Bodies (${(subjectVariations.filter(s => s.trim()).length || 1) * (bodyVariations.filter(b => b.trim()).length || 1)} combinations)`
                          : 'Single Layout'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Automated Follow-ups:</span>
                      <span className="font-bold text-foreground">{workflowSteps.length} follow-up step(s)</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Selected Sender Accounts:</span>
                      <span className="font-bold text-foreground">{selectedAccountIds.length > 0 ? `${selectedAccountIds.length} account(s) selected` : 'All connected mailboxes'}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-border/20">
                      <span className="text-muted-foreground font-medium">Timezone &amp; Window:</span>
                      <span className="font-bold text-foreground">Africa/Lagos (WAT UTC+1) · {ignoreWindow ? '24/7 Immediate' : `${startTime} - ${endTime}`}</span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-muted-foreground font-medium">Dispatch Speed:</span>
                      <span className="font-bold text-primary font-mono">{speed}s delay ({(60 / speed).toFixed(1)} emails/min)</span>
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
                            onClick={() => handleOpenCampaignTestModal(c)}
                            className="h-8 gap-1 rounded-lg text-xs font-semibold hover:bg-[#635bff]/10 hover:text-[#635bff] border-border/40"
                            title="Send a live test email to verify formatting and deliverability"
                          >
                            <Send className="h-3 w-3 text-[#635bff]" />
                            <span>Test</span>
                          </Button>
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
                <X className="h-4 w-4" />
              </Button>
              </div>
            </div>

            <div className="grid gap-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Status</p>
                  <p className="mt-2 font-semibold text-foreground capitalize">{campaignDetail.status}</p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-muted/50 p-4">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Contacts</p>
                  <p className="mt-2 font-semibold text-foreground">{campaignDetail.total_contacts}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <div className="max-h-64 overflow-y-auto overflow-x-auto text-[11px]">
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
                <X className="h-4 w-4" />
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

              {/* Format Selection in Edit */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-muted-foreground uppercase text-[10px]">Message Format Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditFormatType('html')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      editFormatType === 'html'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    HTML Rich Format
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormatType('plain')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      editFormatType === 'plain'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    Plain Text Only
                  </button>
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

              {/* Personalization Reference Bar for Edit with 1-Click Copy */}
              <div className="p-2.5 bg-muted/40 border border-border/60 rounded-xl space-y-1.5">
                <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                  <Tag className="h-3 w-3 text-primary" /> Personalization Headers (Click to insert or copy):
                </span>
                <div className="flex flex-wrap gap-1">
                  {Array.from(new Set(['first_name', 'last_name', 'email', 'company', 'date', ...editListTokens])).map(tok => (
                    <div
                      key={tok}
                      className="inline-flex items-center rounded border border-border/60 bg-background text-[10px] font-mono font-semibold"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (editFormatType === 'plain') {
                            setEditBodyPlain(prev => prev ? `${prev} {{${tok}}}` : `{{${tok}}}`);
                          } else {
                            setEditBodyHtml(prev => prev ? `${prev} {{${tok}}}` : `{{${tok}}}`);
                          }
                          toast({ title: `Added {{${tok}}}`, description: 'Appended variable.' });
                        }}
                        className="px-1.5 py-0.5 hover:text-primary cursor-pointer"
                      >
                        {`{{${tok}}}`}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleCopyToken(tok, e)}
                        className="px-1 py-0.5 border-l border-border/40 text-muted-foreground hover:text-foreground cursor-pointer"
                        title="Copy variable"
                      >
                        <Copy className="h-2 w-2" />
                      </button>
                    </div>
                  ))}
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
                      onChange={e => {
                        setEditSubject(e.target.value);
                        setEditSubjectVariations([e.target.value]);
                      }}
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none font-medium"
                    />
                  </div>

                  {editFormatType === 'html' ? (
                    <div>
                      <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Email HTML Body</label>
                      <textarea
                        required
                        rows={5}
                        value={editBodyHtml}
                        onChange={e => {
                          setEditBodyHtml(e.target.value);
                          setEditBodyVariations([e.target.value]);
                        }}
                        className="w-full p-3 text-xs font-mono rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Plain Text Body Content</label>
                      <textarea
                        required
                        rows={5}
                        value={editBodyPlain}
                        onChange={e => {
                          setEditBodyPlain(e.target.value);
                          setEditBodyVariations([e.target.value]);
                        }}
                        className="w-full p-3 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Rotational Variations Mode Input */}
              {editContentMode === 'rotation' && (
                <div className="space-y-3 border border-border/40 rounded-xl p-3 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-primary">
                      <RotateCw className="h-3.5 w-3.5" />
                      Matrix: {editSubjectVariations.filter(s => s.trim()).length || 1} Subjects × {editBodyVariations.filter(b => b.trim()).length || 1} Bodies
                    </span>
                  </div>

                  {/* Multiple Subjects */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Multiple Subject Lines</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditSubjectVariations([...editSubjectVariations, ''])}
                        className="h-6 text-[9px] gap-1"
                      >
                        <Plus className="h-2.5 w-2.5" /> Add Subject
                      </Button>
                    </div>
                    {editSubjectVariations.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder={`Subject variation #${idx + 1}...`}
                          value={s}
                          onChange={e => {
                            const next = [...editSubjectVariations];
                            next[idx] = e.target.value;
                            setEditSubjectVariations(next);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-input bg-muted"
                        />
                        {editSubjectVariations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEditSubjectVariations(editSubjectVariations.filter((_, i) => i !== idx))}
                            className="text-destructive p-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Multiple Bodies */}
                  <div className="space-y-2 pt-2 border-t border-border/20">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Multiple Body Variations [{editFormatType.toUpperCase()}]</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditBodyVariations([...editBodyVariations, ''])}
                        className="h-6 text-[9px] gap-1"
                      >
                        <Plus className="h-2.5 w-2.5" /> Add Body
                      </Button>
                    </div>
                    {editBodyVariations.map((b, idx) => (
                      <div key={idx} className="p-2 border border-border/30 rounded-lg bg-background space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-bold text-muted-foreground">Body #{idx + 1}</span>
                          {editBodyVariations.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setEditBodyVariations(editBodyVariations.filter((_, i) => i !== idx))}
                              className="text-destructive p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={3}
                          value={b}
                          onChange={e => {
                            const next = [...editBodyVariations];
                            next[idx] = e.target.value;
                            setEditBodyVariations(next);
                          }}
                          className={`w-full p-2 text-xs rounded border border-input bg-muted ${editFormatType === 'html' ? 'font-mono' : 'font-sans'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sender Email Accounts Selector */}
              <div className="space-y-1.5 p-3 rounded-xl border border-border/40 bg-muted/10">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-muted-foreground uppercase text-[10px] flex items-center gap-1">
                    <Mail className="h-3 w-3 text-primary" /> Sender Mailboxes
                  </label>
                  <span className="text-[10px] text-primary font-semibold">
                    {editSelectedAccountIds.length === 0 ? 'All Accounts' : `${editSelectedAccountIds.length} Selected`}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-32 overflow-y-auto">
                  {accounts.map(acc => {
                    const isSel = editSelectedAccountIds.includes(acc.id);
                    return (
                      <div
                        key={acc.id}
                        onClick={() => {
                          if (isSel) setEditSelectedAccountIds(editSelectedAccountIds.filter(id => id !== acc.id));
                          else setEditSelectedAccountIds([...editSelectedAccountIds, acc.id]);
                        }}
                        className={`p-2 rounded-lg border text-[11px] cursor-pointer flex items-center justify-between ${
                          isSel ? 'border-primary bg-primary/10 text-primary font-bold' : 'border-border/40 bg-background text-muted-foreground'
                        }`}
                      >
                        <span className="truncate pr-1">{acc.display_name || acc.email}</span>
                        {isSel && <Check className="h-3 w-3 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Custom Filter Rules for Edit */}
              <div className="space-y-1.5 p-3 rounded-xl border border-border/40 bg-muted/10">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-muted-foreground uppercase text-[10px] flex items-center gap-1">
                    <Filter className="h-3 w-3 text-primary" /> Custom Attribute Filters ({editCustomFilterRules.length})
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditCustomFilterRules([...editCustomFilterRules, { id: String(Date.now()), field: 'company', operator: 'contains', value: '' }])}
                    className="h-6 text-[9px] gap-1"
                  >
                    <Plus className="h-2.5 w-2.5" /> Add Filter
                  </Button>
                </div>
                {editCustomFilterRules.map((rule, idx) => (
                  <div key={rule.id || idx} className="grid grid-cols-12 gap-1 items-center bg-background p-1.5 rounded border text-xs">
                    <input
                      type="text"
                      placeholder="Field (e.g. company, city, revenue)"
                      value={rule.field}
                      onChange={e => {
                        const next = [...editCustomFilterRules];
                        next[idx].field = e.target.value;
                        setEditCustomFilterRules(next);
                      }}
                      className="col-span-4 bg-muted p-1 rounded text-[11px] font-mono"
                    />
                    <select
                      value={rule.operator}
                      onChange={e => {
                        const next = [...editCustomFilterRules];
                        next[idx].operator = e.target.value;
                        setEditCustomFilterRules(next);
                      }}
                      className="col-span-4 bg-muted p-1 rounded text-[11px]"
                    >
                      <option value="contains">Contains text</option>
                      <option value="not_contains">Does not contain</option>
                      <option value="equals">Equals (=)</option>
                      <option value="not_equals">Not equal (!=)</option>
                      <option value="starts_with">Starts with</option>
                      <option value="gt">&gt; Greater than</option>
                      <option value="gte">&gt;= Greater/Equal</option>
                      <option value="lt">&lt; Less than</option>
                      <option value="lte">&lt;= Less/Equal</option>
                      <option value="is_empty">Is empty</option>
                      <option value="is_not_empty">Is not empty</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Value"
                      value={rule.value}
                      onChange={e => {
                        const next = [...editCustomFilterRules];
                        next[idx].value = e.target.value;
                        setEditCustomFilterRules(next);
                      }}
                      className="col-span-3 bg-muted p-1 rounded text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => setEditCustomFilterRules(editCustomFilterRules.filter((_, i) => i !== idx))}
                      className="col-span-1 text-destructive text-center"
                    >
                      <Trash2 className="h-3 w-3 mx-auto" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Target Volume & Range Slicing for Edit */}
              <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                    <SlidersHorizontal className="h-3 w-3 text-primary" /> Target Lead Volume &amp; Slicing
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => { setEditTargetLimitMode('all'); setEditTargetLimit(0); setEditTargetRangeStart(0); setEditTargetRangeEnd(0); }}
                    className={`p-1.5 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                      editTargetLimitMode === 'all'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    All Leads
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditTargetLimitMode('limit'); if (!editTargetLimit) setEditTargetLimit(500); }}
                    className={`p-1.5 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                      editTargetLimitMode === 'limit'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    First N (Cap)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditTargetLimitMode('range'); if (!editTargetRangeStart) setEditTargetRangeStart(1); if (!editTargetRangeEnd) setEditTargetRangeEnd(500); }}
                    className={`p-1.5 rounded-lg border text-[11px] font-semibold text-center transition-all ${
                      editTargetLimitMode === 'range'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/40 text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    Row Range (Slice)
                  </button>
                </div>

                {editTargetLimitMode === 'limit' && (
                  <div className="pt-1 flex items-center gap-2">
                    <label className="text-[10px] font-bold text-muted-foreground uppercase shrink-0">Max Recipients:</label>
                    <input
                      type="number"
                      min={1}
                      value={editTargetLimit}
                      onChange={e => setEditTargetLimit(Math.max(1, Number(e.target.value)))}
                      className="w-28 bg-background p-1.5 rounded-lg border border-input text-xs font-bold"
                      placeholder="500"
                    />
                    <span className="text-[10px] text-muted-foreground">contacts</span>
                  </div>
                )}

                {editTargetLimitMode === 'range' && (
                  <div className="pt-1 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">From:</label>
                      <input
                        type="number"
                        min={1}
                        value={editTargetRangeStart}
                        onChange={e => setEditTargetRangeStart(Math.max(1, Number(e.target.value)))}
                        className="w-20 bg-background p-1.5 rounded-lg border border-input text-xs font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">To:</label>
                      <input
                        type="number"
                        min={editTargetRangeStart}
                        value={editTargetRangeEnd}
                        onChange={e => setEditTargetRangeEnd(Math.max(editTargetRangeStart, Number(e.target.value)))}
                        className="w-20 bg-background p-1.5 rounded-lg border border-input text-xs font-bold"
                      />
                    </div>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      {Math.max(0, editTargetRangeEnd - editTargetRangeStart + 1)} leads (Rows {editTargetRangeStart}–{editTargetRangeEnd})
                    </span>
                  </div>
                )}
              </div>

              {/* Sent Memory for Edit */}
              <div className="p-2.5 rounded-xl bg-muted/20 border border-border/40 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Brain className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-foreground">Sent Memory (Exclude Contacted)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditExcludePreviouslyContacted(!editExcludePreviouslyContacted)}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                    editExcludePreviouslyContacted
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-muted text-muted-foreground border-border/40'
                  }`}
                >
                  {editExcludePreviouslyContacted ? '✓ Active' : 'Off'}
                </button>
              </div>

              {/* Timezone and Window */}
              <div className="p-2.5 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-semibold text-muted-foreground">
                  <Globe className="h-3.5 w-3.5 text-primary" /> Timezone:
                </span>
                <span className="font-bold text-foreground">Africa/Lagos (WAT UTC+1)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Delay (seconds)</label>
                  <input
                    type="number"
                    min={1}
                    value={editDelay}
                    onChange={e => setEditDelay(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">Start Time (WAT)</label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={e => setEditStartTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1 uppercase text-[10px]">End Time (WAT)</label>
                  <input
                    type="time"
                    value={editEndTime}
                    onChange={e => setEditEndTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-muted focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-muted/20 border border-border/40 rounded-xl">
                <input
                  type="checkbox"
                  id="editIgnoreWindowCheck"
                  checked={editIgnoreWindow}
                  onChange={e => setEditIgnoreWindow(e.target.checked)}
                  className="h-4 w-4 rounded border-input text-primary"
                />
                <label htmlFor="editIgnoreWindowCheck" className="text-xs font-semibold text-foreground cursor-pointer">
                  Ignore Sending Window (Send 24/7 immediately)
                </label>
              </div>

              <div className="pt-6 border-t border-border/40 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Automated Workflow</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Define a sequence of automated email steps triggered by specific events.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setEditWorkflowSteps([...editWorkflowSteps, { id: Date.now(), trigger_event: 'wait', delay_seconds: 86400, subject: '', body_html: '', body_plain: '' }])}
                    className="h-8 text-xs font-semibold gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Step
                  </Button>
                </div>

                {editWorkflowSteps.length > 0 && (
                  <div className="space-y-4">
                    {editWorkflowSteps.map((step, index) => (
                      <div key={step.id} className="p-4 rounded-xl border border-border/60 bg-muted/20 space-y-3 relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          onClick={() => setEditWorkflowSteps(editWorkflowSteps.filter(s => s.id !== step.id))}
                          className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <span className="bg-primary/20 text-primary h-5 w-5 rounded-full flex items-center justify-center">{index + 2}</span>
                          Follow-up Step
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Trigger Event</label>
                            <select
                              value={step.trigger_event}
                              onChange={(e) => {
                                const next = [...editWorkflowSteps];
                                next[index].trigger_event = e.target.value;
                                setEditWorkflowSteps(next);
                              }}
                              className="w-full bg-background text-xs rounded-lg border border-input p-2 outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="wait">Wait Time (No Action)</option>
                              <option value="opened">If Email Opened</option>
                              <option value="clicked">If Link Clicked</option>
                              <option value="unopened">If Not Opened</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase">Wait Duration</label>
                            <select
                              value={step.delay_seconds}
                              onChange={(e) => {
                                const next = [...editWorkflowSteps];
                                next[index].delay_seconds = Number(e.target.value);
                                setEditWorkflowSteps(next);
                              }}
                              className="w-full bg-background text-xs rounded-lg border border-input p-2 outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value={3600}>1 Hour</option>
                              <option value={86400}>1 Day</option>
                              <option value={172800}>2 Days</option>
                              <option value={259200}>3 Days</option>
                              <option value={604800}>7 Days</option>
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">Subject Line</label>
                          <input
                            type="text"
                            placeholder="Re: Following up..."
                            value={step.subject}
                            onChange={(e) => {
                              const next = [...editWorkflowSteps];
                              next[index].subject = e.target.value;
                              setEditWorkflowSteps(next);
                            }}
                            className="w-full bg-background text-xs rounded-lg border border-input p-2 outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground uppercase">HTML Body</label>
                          <textarea
                            placeholder="Just checking in..."
                            value={step.body_html}
                            onChange={(e) => {
                              const next = [...editWorkflowSteps];
                              next[index].body_html = e.target.value;
                              setEditWorkflowSteps(next);
                            }}
                            className="w-full bg-background text-xs rounded-lg border border-input p-2 min-h-[80px] font-mono focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-3 border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenCampaignTestModal()}
                  className="text-xs font-semibold gap-1.5 border-[#635bff]/40 text-[#635bff] hover:bg-[#635bff]/10 w-full sm:w-auto"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>Send Test Email</span>
                </Button>

                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <Button type="button" variant="outline" onClick={() => setEditingCampaign(null)} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={savingEdit} className="text-xs font-semibold">
                    {savingEdit ? 'Saving Updates...' : 'Save Campaign Changes'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Campaign Deliverability Test Email Modal */}
      <SendTestEmailModal
        isOpen={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        type="campaign"
        campaignId={testTargetCampaign?.id}
        campaignName={testTargetCampaign?.name}
        subject={testTargetCampaign?.subject || ''}
        bodyHtml={testTargetCampaign?.body_html || ''}
        bodyPlain={testTargetCampaign?.body_plain || ''}
        accounts={accounts}
      />
    </AppShell>
  );
}
