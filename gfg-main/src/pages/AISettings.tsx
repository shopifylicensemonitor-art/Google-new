import React, { useState, useEffect } from 'react';
import { api, type AIProviderConfig, type AIRules } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Sparkles, Key, Globe, Cpu, CheckCircle2, AlertTriangle, 
  RefreshCw, Save, BookOpen, Bot, ExternalLink, Eye, EyeOff,
  Copy, Check, Trash2, ShieldCheck, Zap, Activity, AlertCircle,
  ChevronDown, ChevronUp, Sliders, Lock, Search, Filter,
  Gift, CheckCheck, Compass, Radio
} from 'lucide-react';

export interface AIProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  getKeyUrl: string;
  badge?: string;
  isFreeTier?: boolean;
  freeTierNote?: string;
  description: string;
  recommendedModels?: string[];
  freeModels?: string[];
}

const PROVIDERS: AIProviderPreset[] = [
  {
    id: 'openrouter',
    name: 'OpenRouter (Free & Premium)',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-r1:free',
    getKeyUrl: 'https://openrouter.ai/keys',
    badge: '100% Free Models Available',
    isFreeTier: true,
    freeTierNote: 'Offers multiple 100% free models with zero credit card required.',
    description: 'Universal unified router with access to Claude, GPT-4o, Llama 3.3, and free DeepSeek R1.',
    recommendedModels: [
      'deepseek/deepseek-r1:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'deepseek/deepseek-chat:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet'
    ],
    freeModels: [
      'deepseek/deepseek-r1:free',
      'meta-llama/llama-3.3-70b-instruct:free',
      'google/gemini-2.0-flash-exp:free',
      'deepseek/deepseek-chat:free',
      'qwen/qwen-2.5-72b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free',
      'mistralai/mistral-7b-instruct:free'
    ]
  },
  {
    id: 'groq',
    name: 'Groq API (Free Developer Tier)',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    getKeyUrl: 'https://console.groq.com/keys',
    badge: 'Free Tier Available',
    isFreeTier: true,
    freeTierNote: 'Generous free rate limits (up to 30 RPM / 14,400 RPD) for developers.',
    description: 'Ultra-fast sub-second cold email generation powered by Groq LPUs.',
    recommendedModels: [
      'llama-3.3-70b-versatile',
      'deepseek-r1-distill-llama-70b',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'gemma2-9b-it',
      'mixtral-8x7b-32768'
    ],
    freeModels: [
      'llama-3.3-70b-versatile',
      'deepseek-r1-distill-llama-70b',
      'llama3-70b-8192',
      'llama3-8b-8192',
      'gemma2-9b-it'
    ]
  },
  {
    id: 'gemini',
    name: 'Google Gemini (Free in AI Studio)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    badge: 'Free Tier (15 RPM)',
    isFreeTier: true,
    freeTierNote: 'Free on Google AI Studio with up to 15 Requests/Min and 1M tokens/min.',
    description: 'Next-generation Gemini 2.0 Flash and 1.5 Flash with fast reasoning and long context.',
    recommendedModels: [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-2.0-flash-lite-preview-02-05'
    ],
    freeModels: [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-2.0-flash-lite-preview-02-05'
    ]
  },
  {
    id: 'nvidia',
    name: 'Nvidia NIM API',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    getKeyUrl: 'https://build.nvidia.com/explore/discover',
    badge: '1000 Free Credits',
    isFreeTier: true,
    freeTierNote: 'Includes 1,000 free API trial credits on developer account creation.',
    description: 'High-throughput accelerated inference for Llama 3.3 and DeepSeek R1 models.',
    recommendedModels: [
      'meta/llama-3.3-70b-instruct',
      'deepseek-ai/deepseek-r1',
      'nvidia/llama-3.1-nemotron-70b-instruct',
      'mistralai/mistral-large-2-instruct'
    ],
    freeModels: [
      'meta/llama-3.3-70b-instruct',
      'deepseek-ai/deepseek-r1'
    ]
  },
  {
    id: 'custom',
    name: 'Custom / Local Ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3:latest',
    getKeyUrl: '',
    badge: '100% Free & Unlimited',
    isFreeTier: true,
    freeTierNote: 'Completely free, private, and offline with zero API rate limits.',
    description: 'Run local Ollama, vLLM, LM Studio, or a private self-hosted model proxy.',
    recommendedModels: [
      'llama3:latest',
      'deepseek-r1:latest',
      'mistral:latest',
      'qwen2.5:latest',
      'phi3:latest'
    ],
    freeModels: [
      'llama3:latest',
      'deepseek-r1:latest',
      'mistral:latest',
      'qwen2.5:latest'
    ]
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI (Direct)',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
    badge: 'Ultra Low Cost / Trial',
    isFreeTier: false,
    freeTierNote: 'Includes free introductory promotional credits on new account setup.',
    description: 'Official DeepSeek-V3 and DeepSeek-R1 reasoning models with unmatched cost efficiency.',
    recommendedModels: [
      'deepseek-chat',
      'deepseek-reasoner'
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    badge: 'Industry Standard',
    isFreeTier: false,
    description: 'Direct GPT-4o, GPT-4o-mini, and o1 reasoning models from OpenAI.',
    recommendedModels: [
      'gpt-4o-mini',
      'gpt-4o',
      'o1-mini',
      'gpt-3.5-turbo'
    ]
  },
  {
    id: 'anthropic',
    name: 'Anthropic (via OpenRouter)',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    getKeyUrl: 'https://openrouter.ai/keys',
    badge: 'Peak Copywriting',
    isFreeTier: false,
    description: 'Claude 3.5 Sonnet & Haiku for nuanced, hyper-personalized email outreach.',
    recommendedModels: [
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-5-haiku'
    ]
  },
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    getKeyUrl: 'https://api.together.ai/settings/api-keys',
    badge: '$5 Free Trial Credits',
    isFreeTier: true,
    freeTierNote: '$5 free trial credit provided on initial account signup.',
    description: 'Fast open-source model inference on dedicated serverless infrastructure.',
    recommendedModels: [
      'meta-llama/Llama-3.3-70B-Instruct-Turbo',
      'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'
    ]
  }
];

export default function AISettings() {
  const [activeTab, setActiveTab] = useState<'connection' | 'rules'>('connection');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);

  // Multi-Provider Saved Configs
  const [savedConfigs, setSavedConfigs] = useState<Record<string, AIProviderConfig>>({});
  const [activeProviderKey, setActiveProviderKey] = useState<string>('openrouter');

  // Key Validity & Health Check State
  const [validatingAll, setValidatingAll] = useState<boolean>(false);
  const [validationResults, setValidationResults] = useState<Record<string, { valid: boolean; status: string; latencyMs?: number; model?: string; message?: string; error?: string }>>({});

  // Dynamic Live Synced Models per Provider
  const [liveModels, setLiveModels] = useState<Record<string, string[]>>({});
  const [liveFreeModels, setLiveFreeModels] = useState<Record<string, string[]>>({});
  const [fetchingModels, setFetchingModels] = useState<Record<string, boolean>>({});

  // Collapsible Accordion State: Set of open provider IDs
  const [openProviderIds, setOpenProviderIds] = useState<Set<string>>(new Set(['openrouter', 'groq']));
  const [providerFilter, setProviderFilter] = useState<'all' | 'free' | 'saved' | 'active'>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');

  // Per-provider inline input state
  const [providerInputs, setProviderInputs] = useState<Record<string, { name?: string; priority?: number; apiKey: string; baseUrl: string; model: string; isRevealed: boolean }>>({});
  const [copiedProvider, setCopiedProvider] = useState<string | null>(null);

  // AI Rules State
  const [rules, setRules] = useState<AIRules>({
    knowledge: '',
    initial: '',
    followup_1: '',
    followup_2: '',
    objection: ''
  });
  const [savingRules, setSavingRules] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [configsRes, rulesData] = await Promise.all([
        api.getAIConfigs().catch(() => ({ success: false, configs: [], activeProvider: null, activeConfig: null })),
        api.getAIRules().catch(() => ({} as AIRules))
      ]);

      const configMap: Record<string, AIProviderConfig> = {};
      const inputsMap: Record<string, { name?: string; priority?: number; apiKey: string; baseUrl: string; model: string; isRevealed: boolean }> = {};

      if (configsRes && Array.isArray(configsRes.configs)) {
        configsRes.configs.forEach(c => {
          configMap[c.provider.toLowerCase()] = c;
        });
      }
      setSavedConfigs(configMap);

      const activeProv = (configsRes.activeProvider || (configsRes.configs?.[0]?.provider) || 'openrouter').toLowerCase();
      setActiveProviderKey(activeProv);
      setOpenProviderIds(new Set([activeProv]));

      // Populate inputs for each provider preset
      PROVIDERS.forEach(p => {
        const saved = configMap[p.id];
        inputsMap[p.id] = {
          name: saved?.name || p.name,
          priority: saved?.priority || 1,
          apiKey: saved?.apiKey || '',
          baseUrl: saved?.baseUrl || p.baseUrl,
          model: saved?.model || p.defaultModel,
          isRevealed: false
        };
      });
      setProviderInputs(inputsMap);

      setRules({
        knowledge: rulesData.knowledge || '',
        initial: rulesData.initial || '',
        followup_1: rulesData.followup_1 || '',
        followup_2: rulesData.followup_2 || '',
        objection: rulesData.objection || ''
      });

      if (Object.keys(configMap).length > 0) {
        runValidationCheck();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error loading AI settings', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleProviderOpen = (id: string) => {
    setOpenProviderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Auto-fetch live models when expanding if API key is present
        const input = providerInputs[id];
        if (input?.apiKey && !liveModels[id]) {
          const preset = PROVIDERS.find(p => p.id === id);
          if (preset) handleFetchLiveModels(preset, false);
        }
      }
      return next;
    });
  };

  const handleUpdateProviderInput = (id: string, field: 'apiKey' | 'baseUrl' | 'model', value: string) => {
    setProviderInputs(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleToggleRevealKey = (id: string) => {
    setProviderInputs(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        isRevealed: !prev[id]?.isRevealed
      }
    }));
  };

  const handleCopyKey = (key: string, providerId: string) => {
    if (!key) return;
    navigator.clipboard.writeText(key);
    setCopiedProvider(providerId);
    toast({ title: 'API Key Copied', description: 'Copied credentials to clipboard.' });
    setTimeout(() => setCopiedProvider(null), 2000);
  };

  const handleFetchLiveModels = async (preset: AIProviderPreset, showToast = true) => {
    const input = providerInputs[preset.id];
    setFetchingModels(prev => ({ ...prev, [preset.id]: true }));
    try {
      const res = await api.fetchAIModels({
        provider: preset.id,
        apiKey: input?.apiKey,
        baseUrl: input?.baseUrl || preset.baseUrl
      });

      if (res.success && res.models && res.models.length > 0) {
        setLiveModels(prev => ({ ...prev, [preset.id]: res.models }));
        if (res.freeModels && res.freeModels.length > 0) {
          setLiveFreeModels(prev => ({ ...prev, [preset.id]: res.freeModels || [] }));
        }
        if (showToast) {
          toast({
            title: `Synced ${res.models.length} Models from ${preset.name}!`,
            description: res.freeModels?.length 
              ? `Found ${res.freeModels.length} free-tier models ready to use.`
              : `Loaded real-time model list directly from provider.`
          });
        }
      }
    } catch (err: any) {
      if (showToast) {
        toast({
          variant: 'destructive',
          title: 'Model Sync Failed',
          description: err.message || 'Could not fetch models. Check API key.'
        });
      }
    } finally {
      setFetchingModels(prev => ({ ...prev, [preset.id]: false }));
    }
  };

  const handleSaveProviderConfig = async (preset: AIProviderPreset) => {
    const input = providerInputs[preset.id];
    if (!input) return;

    const hasSaved = Boolean(savedConfigs[preset.id]?.hasKey);
    const enteredKey = input.apiKey.trim();

    if (!enteredKey && !hasSaved) {
      toast({
        variant: 'destructive',
        title: 'API Key Required',
        description: `Please enter an API Key for ${preset.name} before saving.`
      });
      return;
    }

    setSaving(true);
    try {
      const res = await api.saveAIConfig({
        provider: preset.id,
        name: input.name?.trim() || preset.name,
        priority: input.priority || 1,
        apiKey: enteredKey,
        api_key: enteredKey,
        baseUrl: input.baseUrl.trim() || preset.baseUrl,
        base_url: input.baseUrl.trim() || preset.baseUrl,
        model: input.model.trim() || preset.defaultModel,
        is_active: activeProviderKey === preset.id,
        setActive: activeProviderKey === preset.id
      });

      if (res.success) {
        toast({
          title: 'Provider Saved',
          description: `Configured credentials for ${preset.name}.`
        });
        loadData();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (providerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.setActiveAIProvider(providerId);
      if (res.success) {
        setActiveProviderKey(providerId.toLowerCase());
        toast({
          title: 'Active Engine Switched',
          description: `AI operations will now execute via ${PROVIDERS.find(p => p.id === providerId)?.name || providerId}.`
        });
        loadData();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Activation Failed', description: err.message });
    }
  };

  const handleDeleteProviderKey = async (providerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Remove saved API key for ${PROVIDERS.find(p => p.id === providerId)?.name}?`)) return;

    try {
      const res = await api.deleteAIConfig(providerId);
      if (res.success) {
        toast({ title: 'Key Removed', description: 'API credentials deleted for this provider.' });
        loadData();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: err.message });
    }
  };

  const handleTestConnection = async (preset: AIProviderPreset) => {
    const input = providerInputs[preset.id];
    if (!input) return;

    const hasSaved = Boolean(savedConfigs[preset.id]?.hasKey);
    const enteredKey = input.apiKey.trim();

    if (!enteredKey && !hasSaved) {
      toast({
        variant: 'destructive',
        title: 'API Key Required',
        description: `Please enter an API Key for ${preset.name} before running connection test.`
      });
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testAIConnection({
        provider: preset.id,
        apiKey: enteredKey,
        api_key: enteredKey,
        baseUrl: input.baseUrl.trim() || preset.baseUrl,
        base_url: input.baseUrl.trim() || preset.baseUrl,
        model: input.model.trim() || preset.defaultModel
      });

      setTestResult(res);
      if (res.success) {
        toast({
          title: 'Test Succeeded!',
          description: `${preset.name} (${input.model || preset.defaultModel}) responded in ${res.latencyMs || 0}ms.`
        });
        setValidationResults(prev => ({
          ...prev,
          [preset.id]: { valid: true, status: 'valid', latencyMs: res.latencyMs }
        }));
      } else {
        toast({
          variant: 'destructive',
          title: 'Test Failed',
          description: res.error || 'Connection test failed. Check key or model name.'
        });
        setValidationResults(prev => ({
          ...prev,
          [preset.id]: { valid: false, status: 'invalid', error: res.error }
        }));
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Test Failed',
        description: err.message
      });
      setValidationResults(prev => ({
        ...prev,
        [preset.id]: { valid: false, status: 'invalid', error: err.message }
      }));
    } finally {
      setTesting(false);
    }
  };

  const runValidationCheck = async () => {
    setValidatingAll(true);
    try {
      const res = await api.validateAllAIKeys();
      if (res.success && res.results) {
        setValidationResults(res.results);
      }
    } catch (error) { void error; } finally {
      setValidatingAll(false);
    }
  };

  const handleSaveRules = async () => {
    setSavingRules(true);
    try {
      await api.saveAIRules(rules);
      toast({ title: 'SOP & Prompt Rules Saved', description: 'Your business context and stage prompts have been updated.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setSavingRules(false);
    }
  };

  // Filtered providers
  const filteredProviders = PROVIDERS.filter(p => {
    const saved = savedConfigs[p.id];
    const hasKey = Boolean(saved && saved.apiKey);
    const isActive = activeProviderKey === p.id;

    if (providerFilter === 'free' && !p.isFreeTier) return false;
    if (providerFilter === 'saved' && !hasKey) return false;
    if (providerFilter === 'active' && !isActive) return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesDesc = p.description.toLowerCase().includes(q);
      const matchesModel = p.defaultModel.toLowerCase().includes(q);
      if (!matchesName && !matchesDesc && !matchesModel) return false;
    }

    return true;
  });

  const activePreset = PROVIDERS.find(p => p.id === activeProviderKey) || PROVIDERS[0];
  const activeSaved = savedConfigs[activeProviderKey];

  return (
    <AppShell title="AI & SOP Rules">
      <SEO
        title="AI Engine & Prompt Rules - Peak Xender"
        description="Configure your LLM provider credentials, model selection, custom business context, and cold outreach sequence prompts."
      />

      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-[#635bff]" /> AI Engine &amp; SOP Rules
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Connect external AI platforms (OpenRouter, Groq, Gemini, Nvidia NIM, DeepSeek) with automatic live model discovery and 100% free model presets.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-xl border border-border/60">
            <button
              onClick={() => setActiveTab('connection')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'connection'
                  ? 'bg-[#635bff] text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Cpu className="h-3.5 w-3.5" /> Platform Credentials
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'rules'
                  ? 'bg-[#635bff] text-white shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> SOP &amp; Stage Rules
            </button>
          </div>
        </div>

        {activeTab === 'connection' ? (
          <div className="space-y-6">
            {/* Active Engine Hero Card */}
            <div className="bg-card rounded-2xl border border-[#635bff]/40 p-5 shadow-sm bg-gradient-to-r from-[#635bff]/10 via-card to-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="h-11 w-11 rounded-xl bg-[#635bff]/20 text-[#635bff] flex items-center justify-center font-bold shrink-0 mt-0.5">
                  <Bot className="h-6 w-6 text-[#635bff]" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Active System Engine:</span>
                    <span className="font-heading font-black text-sm text-foreground">{activePreset.name}</span>
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                      ● Active Dispatcher
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    Active Model: <strong className="text-foreground">{activeSaved?.model || activePreset.defaultModel}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runValidationCheck}
                  disabled={validatingAll}
                  className="text-xs font-bold gap-1.5 border-border/60 h-8"
                >
                  <RefreshCw className={`h-3 w-3 ${validatingAll ? 'animate-spin' : ''}`} />
                  Health Check All
                </Button>
              </div>
            </div>

            {/* Quick Free Models Banner */}
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <Gift className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-800 dark:text-emerald-300">
                    Latest Free Tier Models Available
                  </span>
                  <p className="text-muted-foreground text-[11px]">
                    Use <strong>DeepSeek R1 (:free)</strong>, <strong>Llama 3.3 70B (Groq/OpenRouter)</strong>, or <strong>Gemini 2.0 Flash</strong> with zero subscription cost.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setProviderFilter('free')}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shrink-0 self-start sm:self-auto"
              >
                View 100% Free Models →
              </button>
            </div>

            {/* Platform Credentials Minimalist Collapsible Hub */}
            <div className="space-y-3">
              {/* Toolbar & Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/60">
                <div className="relative flex-1 max-w-sm">
                  <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search AI providers or models..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-8 h-8 text-xs bg-background border-border/60"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs flex-wrap">
                  <button
                    onClick={() => setProviderFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      providerFilter === 'all' ? 'bg-[#635bff] text-white shadow-2xs' : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All ({PROVIDERS.length})
                  </button>
                  <button
                    onClick={() => setProviderFilter('free')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
                      providerFilter === 'free' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                    }`}
                  >
                    <Gift className="h-3 w-3" /> Free Tier ({PROVIDERS.filter(p => p.isFreeTier).length})
                  </button>
                  <button
                    onClick={() => setProviderFilter('saved')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      providerFilter === 'saved' ? 'bg-[#635bff] text-white shadow-2xs' : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Configured ({Object.values(savedConfigs).filter(c => c.apiKey).length})
                  </button>
                  <button
                    onClick={() => setProviderFilter('active')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      providerFilter === 'active' ? 'bg-[#635bff] text-white shadow-2xs' : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Active Only
                  </button>
                </div>
              </div>

              {/* Collapsible Provider Accordion Cards */}
              <div className="space-y-2.5">
                {filteredProviders.map((preset) => {
                  const saved = savedConfigs[preset.id];
                  const isActive = activeProviderKey === preset.id;
                  const hasKey = saved && Boolean(saved.hasKey && saved.apiKey);
                  const isOpen = openProviderIds.has(preset.id);
                  const validation = validationResults[preset.id];
                  const input = providerInputs[preset.id] || { apiKey: '', baseUrl: preset.baseUrl, model: preset.defaultModel, isRevealed: false };
                  const liveList = liveModels[preset.id] || [];
                  const liveFreeList = liveFreeModels[preset.id] || preset.freeModels || [];
                  const isSyncing = fetchingModels[preset.id] || false;

                  return (
                    <div
                      key={preset.id}
                      className={`rounded-xl border transition-all duration-200 overflow-hidden bg-card ${
                        isActive
                          ? 'border-[#635bff] shadow-sm ring-1 ring-[#635bff]/30'
                          : isOpen
                          ? 'border-border/80 shadow-2xs'
                          : 'border-border/60 hover:border-border'
                      }`}
                    >
                      {/* Compact Collapsible Header Row */}
                      <div
                        onClick={() => toggleProviderOpen(preset.id)}
                        className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-muted/20 select-none"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-[#635bff] text-white font-bold' : 'bg-muted text-muted-foreground border border-border/50'
                          }`}>
                            <Cpu className="h-4 w-4" />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-heading font-bold text-sm text-foreground truncate">{preset.name}</span>
                              {preset.isFreeTier && (
                                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 font-bold">
                                  FREE TIER
                                </Badge>
                              )}
                              {preset.badge && !preset.isFreeTier && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[#635bff]/30 text-[#635bff] font-bold">
                                  {preset.badge}
                                </Badge>
                              )}
                              {isActive && (
                                <Badge className="bg-[#635bff] text-white text-[9px] px-1.5 py-0 h-4 font-bold gap-1 shadow-2xs">
                                  <Sparkles className="h-2.5 w-2.5" /> Active
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate flex items-center gap-2 mt-0.5">
                              <span>Model: <strong className="text-foreground">{saved?.model || preset.defaultModel}</strong></span>
                              <span className="text-muted-foreground/40">•</span>
                              {hasKey ? (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">● Key Saved</span>
                              ) : (
                                <span className="text-muted-foreground/60 italic">○ Not Configured</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {hasKey && !isActive && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => handleSetActive(preset.id, e)}
                              className="h-7 px-2.5 text-[11px] font-bold text-[#635bff] border-[#635bff]/40 hover:bg-[#635bff]/10 gap-1"
                            >
                              <Zap className="h-3 w-3" /> Set Active
                            </Button>
                          )}

                          <button
                            type="button"
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground"
                            aria-label={isOpen ? 'Collapse' : 'Expand'}
                          >
                            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Configuration Form Panel */}
                      {isOpen && (
                        <div className="px-5 py-4 border-t border-border/60 bg-muted/10 space-y-4 animate-in fade-in duration-150 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              {preset.description}
                            </p>
                            {preset.freeTierNote && (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md font-medium shrink-0">
                                🎁 {preset.freeTierNote}
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                            {/* Key Label / Friendly Name & Priority */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:col-span-2">
                              <div className="sm:col-span-2 space-y-1">
                                <label className="font-bold text-foreground flex items-center gap-1 text-[11px]">
                                  <Tag className="h-3 w-3 text-[#635bff]" /> Key Name / Label (e.g. My Free Key, Fast Backup)
                                </label>
                                <Input
                                  placeholder={`e.g. ${preset.name} - Primary Key`}
                                  value={input.name || ''}
                                  onChange={(e) => handleUpdateProviderInput(preset.id, 'name', e.target.value)}
                                  className="text-xs h-8 bg-background font-medium"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-foreground flex items-center gap-1 text-[11px]">
                                  <Sliders className="h-3 w-3 text-[#635bff]" /> Priority Order
                                </label>
                                <select
                                  value={input.priority || 1}
                                  onChange={(e) => handleUpdateProviderInput(preset.id, 'priority', parseInt(e.target.value, 10))}
                                  className="w-full text-xs h-8 bg-background border border-border/80 rounded-md px-2 font-medium"
                                >
                                  <option value={1}>1 - Primary (Preferred)</option>
                                  <option value={2}>2 - Failover Backup</option>
                                  <option value={3}>3 - Second Backup</option>
                                  <option value={4}>4 - Emergency Fallback</option>
                                </select>
                              </div>
                            </div>

                            {/* API Key Input */}
                            <div className="space-y-1 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <label className="font-bold text-foreground flex items-center gap-1">
                                  <Key className="h-3.5 w-3.5 text-[#635bff]" /> API Key
                                </label>
                                {preset.getKeyUrl && (
                                  <a
                                    href={preset.getKeyUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-[#635bff] hover:underline flex items-center gap-1 font-semibold"
                                  >
                                    Get API Key {preset.isFreeTier ? '(Free)' : ''} <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>

                              <div className="relative flex items-center">
                                <Input
                                  type={input.isRevealed ? 'text' : 'password'}
                                  placeholder={`Enter your ${preset.name} API Key...`}
                                  value={input.apiKey}
                                  onChange={(e) => handleUpdateProviderInput(preset.id, 'apiKey', e.target.value)}
                                  className="pr-24 font-mono text-xs h-9 bg-background"
                                />

                                <div className="absolute right-1.5 flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRevealKey(preset.id)}
                                    className="p-1 text-muted-foreground hover:text-foreground"
                                    title={input.isRevealed ? 'Hide' : 'Reveal'}
                                  >
                                    {input.isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                  {input.apiKey && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyKey(input.apiKey, preset.id)}
                                      className="p-1 text-muted-foreground hover:text-[#635bff]"
                                      title="Copy Key"
                                    >
                                      {copiedProvider === preset.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                                    </button>
                                  )}
                                  {hasKey && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteProviderKey(preset.id, e)}
                                      className="p-1 text-muted-foreground hover:text-destructive"
                                      title="Delete Key"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Model Selector / Dynamic Model Finder */}
                            <div className="space-y-1 md:col-span-2">
                              <div className="flex items-center justify-between">
                                <label className="font-bold text-foreground flex items-center gap-1">
                                  <Cpu className="h-3.5 w-3.5 text-[#635bff]" /> Model Identifier String
                                </label>

                                <button
                                  type="button"
                                  onClick={() => handleFetchLiveModels(preset, true)}
                                  disabled={isSyncing}
                                  className="text-[11px] text-[#635bff] hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                                  title="Query provider /models endpoint to discover newly available models"
                                >
                                  <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                                  {isSyncing ? 'Syncing...' : 'Auto-Sync Live Models'}
                                </button>
                              </div>

                              <div className="flex gap-2">
                                <Input
                                  value={input.model}
                                  onChange={(e) => handleUpdateProviderInput(preset.id, 'model', e.target.value)}
                                  className="h-9 font-mono text-xs bg-background flex-1"
                                  placeholder={preset.defaultModel}
                                />
                                
                                {/* Dropdown from live synced or recommended models */}
                                <select
                                  onChange={(e) => {
                                    if (e.target.value) handleUpdateProviderInput(preset.id, 'model', e.target.value);
                                  }}
                                  className="text-xs bg-background border border-border/80 rounded-md px-2 py-1 max-w-[180px] font-mono"
                                  defaultValue=""
                                >
                                  <option value="" disabled>Select Model...</option>
                                  {liveList.length > 0 ? (
                                    liveList.slice(0, 50).map(m => (
                                      <option key={m} value={m}>{m}</option>
                                    ))
                                  ) : (
                                    (preset.recommendedModels || []).map(m => (
                                      <option key={m} value={m}>{m}</option>
                                    ))
                                  )}
                                </select>
                              </div>

                              {/* 1-Click Free Model Badges */}
                              {liveFreeList && liveFreeList.length > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-0.5">
                                    <Gift className="h-2.5 w-2.5" /> Free Models:
                                  </span>
                                  {liveFreeList.map(m => (
                                    <button
                                      key={m}
                                      type="button"
                                      onClick={() => handleUpdateProviderInput(preset.id, 'model', m)}
                                      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                        input.model === m
                                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/60 font-bold shadow-2xs ring-1 ring-emerald-500/30'
                                          : 'bg-emerald-500/5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 border-emerald-500/30'
                                      }`}
                                    >
                                      ✓ {m}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Other Supported Models */}
                              {preset.recommendedModels && (
                                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                                  <span className="text-[10px] text-muted-foreground font-semibold">Recommended:</span>
                                  {preset.recommendedModels
                                    .filter(m => !liveFreeList.includes(m))
                                    .map(m => (
                                      <button
                                        key={m}
                                        type="button"
                                        onClick={() => handleUpdateProviderInput(preset.id, 'model', m)}
                                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                          input.model === m
                                            ? 'bg-[#635bff]/15 text-[#635bff] border-[#635bff]/40 font-bold'
                                            : 'bg-muted/40 text-muted-foreground hover:text-foreground border-border/50'
                                        }`}
                                      >
                                        {m}
                                      </button>
                                    ))}
                                </div>
                              )}
                            </div>

                            {/* Base API Endpoint */}
                            <div className="space-y-1 md:col-span-2">
                              <label className="font-bold text-foreground flex items-center gap-1">
                                <Globe className="h-3.5 w-3.5 text-[#635bff]" /> Base URL Endpoint
                              </label>
                              <Input
                                value={input.baseUrl}
                                onChange={(e) => handleUpdateProviderInput(preset.id, 'baseUrl', e.target.value)}
                                className="h-9 font-mono text-xs bg-background"
                                placeholder={preset.baseUrl}
                              />
                            </div>
                          </div>

                          {/* Action Buttons: Save & Test Connection */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleTestConnection(preset)}
                              disabled={testing || !input.apiKey.trim()}
                              className="h-8 text-xs font-semibold gap-1.5 border-border/60"
                            >
                              <Activity className={`h-3.5 w-3.5 text-[#635bff] ${testing ? 'animate-spin' : ''}`} />
                              {testing ? 'Validating...' : `Validate ${preset.name}`}
                            </Button>

                            <div className="flex items-center gap-2">
                              {!isActive && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => handleSetActive(preset.id, e)}
                                  disabled={!input.apiKey.trim()}
                                  className="h-8 text-xs font-bold text-[#635bff] hover:bg-[#635bff]/10 gap-1"
                                >
                                  <Zap className="h-3 w-3" /> Set As Active Engine
                                </Button>
                              )}

                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleSaveProviderConfig(preset)}
                                disabled={saving}
                                className="h-8 px-4 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-1.5 shadow-2xs"
                              >
                                <Save className="h-3.5 w-3.5" />
                                {saving ? 'Saving...' : 'Save Configuration'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* SOP Directives & Rules Tab */
          <div className="bg-card rounded-2xl border border-border/60 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div>
                <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#635bff]" /> System SOP &amp; Stage Directives
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Define your brand tone, offer value props, pain points, and stage-specific copywriting rules.
                </p>
              </div>
              <Button
                onClick={handleSaveRules}
                disabled={savingRules}
                className="bg-[#635bff] hover:bg-[#493ee5] text-white text-xs font-bold gap-1.5 shadow-sm"
              >
                <Save className="h-4 w-4" />
                {savingRules ? 'Saving...' : 'Save SOP Rules'}
              </Button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-[#635bff]" /> Company Knowledge &amp; Value Proposition
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Injected into every AI prompt as background reference context.
                </p>
                <Textarea
                  value={rules.knowledge}
                  onChange={(e) => setRules(prev => ({ ...prev, knowledge: e.target.value }))}
                  placeholder="e.g. We are Peak Xender, a multi-inbox cold outreach deliverability infrastructure built for B2B founders and high-volume Shopify agencies..."
                  rows={4}
                  className="font-mono text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Step 1: Cold Initial Outreach Directive</label>
                  <Textarea
                    value={rules.initial}
                    onChange={(e) => setRules(prev => ({ ...prev, initial: e.target.value }))}
                    placeholder="Short 2-3 sentences max. Focus on pain point and low friction CTA..."
                    rows={3}
                    className="font-mono text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Step 2: Value-Add Follow-up Directive</label>
                  <Textarea
                    value={rules.followup_1}
                    onChange={(e) => setRules(prev => ({ ...prev, followup_1: e.target.value }))}
                    placeholder="Bring a concrete case study or metric. Keep tone natural..."
                    rows={3}
                    className="font-mono text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Step 3: Polite Breakup Directive</label>
                  <Textarea
                    value={rules.followup_2}
                    onChange={(e) => setRules(prev => ({ ...prev, followup_2: e.target.value }))}
                    placeholder="Gracefully close the loop without pressure..."
                    rows={3}
                    className="font-mono text-xs bg-background"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-foreground">Objection Handling &amp; Reply Directive</label>
                  <Textarea
                    value={rules.objection}
                    onChange={(e) => setRules(prev => ({ ...prev, objection: e.target.value }))}
                    placeholder="When prospect asks for pricing or demo scheduling..."
                    rows={3}
                    className="font-mono text-xs bg-background"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
