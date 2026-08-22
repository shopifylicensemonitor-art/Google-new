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
  Copy, Check, Trash2, ShieldCheck, Zap, Activity, AlertCircle
} from 'lucide-react';

interface AIProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  getKeyUrl: string;
  badge?: string;
  description: string;
}

const PROVIDERS: AIProviderPreset[] = [
  {
    id: 'nvidia',
    name: 'Nvidia NIM API',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    getKeyUrl: 'https://build.nvidia.com/explore/discover',
    badge: 'Enterprise',
    description: 'High-throughput accelerated inference for Llama 3.3 and DeepSeek models.'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    getKeyUrl: 'https://openrouter.ai/keys',
    badge: '200+ Models',
    description: 'Universal unified router with access to Claude, GPT-4o, Llama 3, and Mistral.'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    getKeyUrl: 'https://platform.openai.com/api-keys',
    badge: 'Industry Standard',
    description: 'Direct GPT-4o, GPT-4o-mini, and o1 models from OpenAI.'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-flash',
    getKeyUrl: 'https://aistudio.google.com/apikey',
    badge: 'Multimodal / Fast',
    description: 'Google Gemini 1.5 Flash and Pro with large context and fast reasoning.'
  },
  {
    id: 'groq',
    name: 'Groq API',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    getKeyUrl: 'https://console.groq.com/keys',
    badge: 'Ultra Fast LPU',
    description: 'Sub-second real-time email generation powered by Groq LPUs.'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    getKeyUrl: 'https://platform.deepseek.com/api_keys',
    badge: 'Deep Reasoning',
    description: 'Cost-efficient DeepSeek-V3 and DeepSeek-R1 reasoning models.'
  },
  {
    id: 'anthropic',
    name: 'Anthropic (via OpenRouter)',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    getKeyUrl: 'https://openrouter.ai/keys',
    badge: 'Peak Copywriting',
    description: 'Claude 3.5 Sonnet & Haiku for nuanced, hyper-personalized email outreach.'
  },
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    getKeyUrl: 'https://api.together.ai/settings/api-keys',
    badge: 'Open Source Hub',
    description: 'Fast open-source model inference on dedicated serverless infrastructure.'
  },
  {
    id: 'custom',
    name: 'Custom / Local Ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3:latest',
    getKeyUrl: '',
    badge: 'Self-Hosted',
    description: 'Local Ollama, vLLM, LM Studio, or private OpenAI-compatible proxy.'
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

  // Active form editing state
  const [selectedProvider, setSelectedProvider] = useState<string>('openrouter');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [baseUrlInput, setBaseUrlInput] = useState<string>('https://openrouter.ai/api/v1');
  const [modelInput, setModelInput] = useState<string>('openai/gpt-4o-mini');

  // Key Visibility / Reveal Toggles (per provider and inside form)
  const [revealedCardKeys, setRevealedCardKeys] = useState<Record<string, boolean>>({});
  const [showFormKey, setShowFormKey] = useState<boolean>(false);
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
      if (configsRes && Array.isArray(configsRes.configs)) {
        configsRes.configs.forEach(c => {
          configMap[c.provider.toLowerCase()] = c;
        });
      }
      setSavedConfigs(configMap);

      const activeProv = configsRes.activeProvider || (configsRes.configs?.[0]?.provider) || 'openrouter';
      setActiveProviderKey(activeProv.toLowerCase());

      // Pre-fill form with active provider or first available
      const activeObj = configMap[activeProv.toLowerCase()] || PROVIDERS.find(p => p.id === activeProv.toLowerCase()) || PROVIDERS[1];
      setSelectedProvider(activeObj.provider || (activeObj as any).id || 'openrouter');
      setBaseUrlInput(activeObj.baseUrl || 'https://openrouter.ai/api/v1');
      setModelInput(activeObj.model || (activeObj as any).defaultModel || 'openai/gpt-4o-mini');
      setApiKeyInput(activeObj.apiKey || '');

      setRules({
        knowledge: rulesData.knowledge || '',
        initial: rulesData.initial || '',
        followup_1: rulesData.followup_1 || '',
        followup_2: rulesData.followup_2 || '',
        objection: rulesData.objection || ''
      });

      // Automatically run health check on load if there are saved keys
      if (Object.keys(configMap).length > 0) {
        runValidationCheck();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error loading AI settings', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const runValidationCheck = async () => {
    setValidatingAll(true);
    try {
      const res = await api.validateAllAIKeys();
      if (res.success && res.results) {
        setValidationResults(res.results);
      }
    } catch (_) {
      // Non-fatal background health check
    } finally {
      setValidatingAll(false);
    }
  };

  const handleSelectProviderCard = (preset: AIProviderPreset) => {
    setSelectedProvider(preset.id);
    const existing = savedConfigs[preset.id];
    if (existing) {
      setBaseUrlInput(existing.baseUrl || preset.baseUrl);
      setModelInput(existing.model || preset.defaultModel);
      setApiKeyInput(existing.apiKey || '');
    } else {
      setBaseUrlInput(preset.baseUrl);
      setModelInput(preset.defaultModel);
      setApiKeyInput('');
    }
    setTestResult(null);
  };

  const handleToggleRevealCardKey = (providerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRevealedCardKeys(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const handleCopyKey = (keyText: string, providerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!keyText) return;
    navigator.clipboard.writeText(keyText);
    setCopiedProvider(providerId);
    toast({ title: 'API Key Copied', description: 'API Key copied to clipboard.' });
    setTimeout(() => setCopiedProvider(null), 2000);
  };

  const handleSetActive = async (providerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await api.setActiveAIProvider(providerId);
      if (res.success) {
        setActiveProviderKey(providerId);
        toast({ title: 'Active AI Model Updated', description: res.message });
        loadData();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Activation Failed', description: err.message });
    }
  };

  const handleDeleteProviderKey = async (providerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm(`Are you sure you want to delete the saved API key for ${providerId.toUpperCase()}?`)) return;
    try {
      const res = await api.deleteAIConfig(providerId);
      if (res.success) {
        toast({ title: 'Key Removed', description: res.message });
        if (selectedProvider === providerId) {
          setApiKeyInput('');
        }
        loadData();
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to delete key', description: err.message });
    }
  };

  const handleSaveConnection = async (e: React.FormEvent, makeActive: boolean = true) => {
    e.preventDefault();
    const existing = savedConfigs[selectedProvider];

    if (!apiKeyInput.trim() && (!existing || !existing.hasKey)) {
      toast({ 
        variant: 'destructive', 
        title: 'API Key Required', 
        description: `Please enter an API key for ${selectedProvider.toUpperCase()} to save.` 
      });
      return;
    }

    setSaving(true);
    try {
      const res = await api.saveAIConfig({
        provider: selectedProvider,
        apiKey: apiKeyInput.trim() || undefined,
        baseUrl: baseUrlInput.trim(),
        model: modelInput.trim(),
        setActive: makeActive
      });
      toast({ title: 'AI Configuration Saved', description: res.message });
      await loadData();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const startTime = Date.now();
    try {
      const res = await api.testAIConnection({
        provider: selectedProvider,
        apiKey: apiKeyInput.trim() || undefined,
        baseUrl: baseUrlInput.trim() || undefined,
        model: modelInput.trim() || undefined
      });
      const latencyMs = Date.now() - startTime;
      if (res.success) {
        setTestResult({ 
          success: true, 
          message: res.response || 'Connection verified successfully!',
          latencyMs
        });
        setValidationResults(prev => ({
          ...prev,
          [selectedProvider]: {
            valid: true,
            status: 'valid',
            latencyMs,
            model: modelInput,
            message: 'Connection verified & functional'
          }
        }));
        toast({ title: 'AI Connection Verified', description: `Response received in ${latencyMs}ms.` });
      } else {
        setTestResult({ success: false, message: res.error || 'Connection failed.' });
        setValidationResults(prev => ({
          ...prev,
          [selectedProvider]: {
            valid: false,
            status: 'invalid',
            model: modelInput,
            error: res.error || 'Connection failed'
          }
        }));
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
      setValidationResults(prev => ({
        ...prev,
        [selectedProvider]: {
          valid: false,
          status: 'invalid',
          model: modelInput,
          error: err.message
        }
      }));
      toast({ variant: 'destructive', title: 'Test Failed', description: err.message });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingRules(true);
    try {
      const res = await api.saveAIRules(rules);
      toast({ title: 'AI Rules Saved', description: res.message });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to Save Rules', description: err.message });
    } finally {
      setSavingRules(false);
    }
  };

  const currentPreset = PROVIDERS.find(p => p.id === selectedProvider) || PROVIDERS[0];
  const currentSavedConfig = savedConfigs[selectedProvider];
  const currentValidation = validationResults[selectedProvider];

  // Calculated Stats
  const totalConfigured = Object.keys(savedConfigs).length;
  const validKeysCount = Object.values(validationResults).filter(r => r.valid).length;
  const invalidKeysCount = Object.values(validationResults).filter(r => !r.valid && r.status === 'invalid').length;

  return (
    <AppShell>
      <SEO title="AI Settings & Models | Peak Xender" description="Manage multi-provider AI keys, active models, validation health checks, and outreach SOP rules." />

      <div className="max-w-6xl mx-auto space-y-6 pb-16 px-2 sm:px-4">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-6 w-6 text-[#635bff]" />
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                AI Engine &amp; API Key Hub
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Save, view, and switch between your API keys across multiple platforms (OpenAI, Gemini, Groq, DeepSeek, Nvidia NIM, Ollama) with live health checks.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
            <button
              onClick={() => setActiveTab('connection')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'connection'
                  ? 'bg-card text-[#635bff] shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Model Connections &amp; Keys
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'rules'
                  ? 'bg-card text-[#635bff] shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Outreach SOPs &amp; Brand
            </button>
          </div>
        </header>

        {loading ? (
          <div className="p-16 text-center text-muted-foreground text-xs">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-3 text-[#635bff]" />
            Loading Multi-Provider AI Configurations...
          </div>
        ) : activeTab === 'connection' ? (
          /* TAB 1: Multi-Provider Matrix & API Key Management */
          <div className="space-y-6">
            {/* Executive Status & Health Check Overview Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Active Engine Card */}
              <div className="p-4 rounded-xl border border-[#635bff]/40 bg-gradient-to-br from-[#635bff]/10 via-background to-card shadow-2xs space-y-1">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Current Active Engine</span>
                  <Badge className="bg-[#635bff] text-white text-[9px] px-1.5 py-0 font-bold">
                    ACTIVE
                  </Badge>
                </div>
                <div className="text-base font-bold text-foreground truncate">
                  {PROVIDERS.find(p => p.id === activeProviderKey)?.name || activeProviderKey.toUpperCase()}
                </div>
                <div className="text-xs font-mono text-[#635bff] truncate">
                  {savedConfigs[activeProviderKey]?.model || 'openai/gpt-4o-mini'}
                </div>
              </div>

              {/* Configured Platforms Count */}
              <div className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs space-y-1">
                <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                  Configured Platforms
                </div>
                <div className="text-xl font-bold text-foreground">
                  {totalConfigured} <span className="text-xs text-muted-foreground font-normal">/ {PROVIDERS.length} platforms saved</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Switch active models instantly with 1-click
                </div>
              </div>

              {/* Health Check & Validation Action */}
              <div className="p-4 rounded-xl border border-border/60 bg-card shadow-2xs flex flex-col justify-between gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-[#635bff]" /> Key Validation Status
                  </div>
                  {invalidKeysCount > 0 && (
                    <Badge variant="destructive" className="text-[9px] px-1.5 py-0 font-bold">
                      {invalidKeysCount} Invalid
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    {validKeysCount} Operational
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={runValidationCheck}
                    disabled={validatingAll}
                    className="h-7 px-2.5 text-xs font-bold border-[#635bff]/40 text-[#635bff] hover:bg-[#635bff]/10 gap-1.5"
                  >
                    {validatingAll ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                    Health Check All
                  </Button>
                </div>
              </div>
            </div>

            {/* Supported Models & Saved Keys Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Bot className="h-4 w-4 text-[#635bff]" /> Platform Credentials &amp; Model Selection
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    View saved API keys directly under each model. Click any card to edit, validate, or set as your active system engine.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {PROVIDERS.map((preset) => {
                  const saved = savedConfigs[preset.id];
                  const isSelected = selectedProvider === preset.id;
                  const isActive = activeProviderKey === preset.id;
                  const hasKey = saved && Boolean(saved.hasKey && saved.apiKey);
                  const isRevealed = revealedCardKeys[preset.id] || false;
                  const validation = validationResults[preset.id];
                  const displayKey = hasKey 
                    ? (isRevealed ? saved.apiKey : (saved.maskedApiKey || '••••••••••••••••••••')) 
                    : null;

                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectProviderCard(preset)}
                      className={`relative rounded-xl border p-4 transition-all cursor-pointer flex flex-col justify-between gap-3 text-left ${
                        isActive
                          ? 'border-[#635bff] bg-gradient-to-br from-[#635bff]/10 via-background to-card shadow-sm ring-1 ring-[#635bff]/30'
                          : isSelected
                          ? 'border-[#635bff]/60 bg-muted/30 shadow-2xs'
                          : 'border-border/60 hover:border-border hover:bg-muted/15 bg-card'
                      }`}
                    >
                      {/* Top Header & Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-foreground">{preset.name}</span>
                            {isActive && (
                              <Badge className="bg-[#635bff] text-white text-[10px] px-1.5 py-0 h-4 font-bold gap-1 shadow-2xs">
                                <Sparkles className="h-2.5 w-2.5" /> Active
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                            {preset.description}
                          </p>
                        </div>

                        {preset.badge && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 border-[#635bff]/30 text-[#635bff] font-bold shrink-0">
                            {preset.badge}
                          </Badge>
                        )}
                      </div>

                      {/* Model String & Key Status */}
                      <div className="space-y-1.5 bg-background/80 p-2.5 rounded-lg border border-border/40 text-[11px]">
                        <div className="flex items-center justify-between text-muted-foreground">
                          <span className="flex items-center gap-1 font-mono text-[10px] truncate max-w-[170px]" title={saved?.model || preset.defaultModel}>
                            <Cpu className="h-3 w-3 text-[#635bff] shrink-0" /> {saved?.model || preset.defaultModel}
                          </span>

                          {/* Health status badge */}
                          {hasKey ? (
                            validation ? (
                              validation.valid ? (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> Valid {validation.latencyMs ? `(${validation.latencyMs}ms)` : ''}
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1" title={validation.error}>
                                  <AlertCircle className="h-3 w-3" /> Invalid Key
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                ● Saved
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              ○ Not saved
                            </span>
                          )}
                        </div>

                        {/* View Saved Key Under Model */}
                        <div className="pt-1.5 border-t border-border/30 flex items-center justify-between gap-1.5">
                          <div className="font-mono text-[11px] text-foreground truncate max-w-[170px]" title={hasKey ? saved.apiKey : 'No key saved'}>
                            {hasKey ? (
                              <span className="text-[#635bff] font-medium">{displayKey}</span>
                            ) : (
                              <span className="text-muted-foreground/60 italic">No API key saved</span>
                            )}
                          </div>

                          {hasKey && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                title={isRevealed ? 'Hide API Key' : 'Reveal API Key'}
                                onClick={(e) => handleToggleRevealCardKey(preset.id, e)}
                                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                              >
                                {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </button>
                              <button
                                type="button"
                                title="Copy API Key"
                                onClick={(e) => handleCopyKey(saved.apiKey, preset.id, e)}
                                className="p-1 rounded-md text-muted-foreground hover:text-[#635bff] hover:bg-muted/80 transition-colors"
                              >
                                {copiedProvider === preset.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                              </button>
                              <button
                                type="button"
                                title="Delete Key"
                                onClick={(e) => handleDeleteProviderKey(preset.id, e)}
                                className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* If validation error exists, show error snippet */}
                        {validation && !validation.valid && validation.error && (
                          <div className="text-[10px] text-rose-500 font-mono pt-1 truncate border-t border-rose-500/20" title={validation.error}>
                            ⚠️ {validation.error}
                          </div>
                        )}
                      </div>

                      {/* Card Footer Actions: Base URL & 1-Click Activate */}
                      <div className="flex items-center justify-between pt-1 gap-2">
                        <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]">
                          {saved?.baseUrl || preset.baseUrl}
                        </span>

                        {hasKey && !isActive && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => handleSetActive(preset.id, e)}
                            className="h-6 px-2 text-[10px] font-bold text-[#635bff] hover:bg-[#635bff]/10 gap-1 ml-auto"
                          >
                            <Zap className="h-2.5 w-2.5" /> Use This Key
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Provider Configuration & Editing Form */}
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground flex items-center gap-2">
                    <Globe className="h-5 w-5 text-[#635bff]" /> Configure {currentPreset.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Save or update your API credentials for this platform. Credentials are preserved independently per model.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {currentPreset.getKeyUrl && (
                    <a
                      href={currentPreset.getKeyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[#635bff] bg-[#635bff]/10 px-3 py-1.5 rounded-lg hover:bg-[#635bff]/20 flex items-center gap-1.5 transition-colors"
                    >
                      Get {currentPreset.name} Key <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>

              <form onSubmit={(e) => handleSaveConnection(e, true)} className="space-y-4">
                {/* API Key Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-[#635bff]" /> API Key for {currentPreset.name}
                    </label>
                    {currentSavedConfig?.hasKey && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Credential currently saved
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Input
                      type={showFormKey ? 'text' : 'password'}
                      placeholder={currentSavedConfig?.hasKey ? 'Enter new key to update or leave current key...' : 'Enter your API key (e.g. sk-...)'}
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                      className="font-mono text-xs h-10 bg-background pr-20"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {apiKeyInput && (
                        <button
                          type="button"
                          onClick={() => handleCopyKey(apiKeyInput, selectedProvider)}
                          className="p-1.5 text-muted-foreground hover:text-[#635bff] transition-colors rounded"
                          title="Copy key"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowFormKey(!showFormKey)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
                        title={showFormKey ? 'Hide key' : 'Show key'}
                      >
                        {showFormKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Base URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-[#635bff]" /> Endpoint / Base URL
                  </label>
                  <Input
                    type="text"
                    placeholder="https://api.openai.com/v1"
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    className="font-mono text-xs h-10 bg-background"
                  />
                </div>

                {/* Model Identifier */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-[#635bff]" /> Model Identifier String
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. gpt-4o-mini, llama-3.3-70b-versatile, deepseek-chat"
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    className="font-mono text-xs h-10 bg-background"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
                  <div className="flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                    >
                      {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save &amp; Set Active
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => handleSaveConnection(e, false)}
                      disabled={saving}
                      className="h-9 px-4 text-xs font-bold border-border/60 hover:border-[#635bff] gap-1.5"
                    >
                      Save Key (Keep Inactive)
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="h-9 text-xs font-bold border-border/60 hover:border-[#635bff] hover:text-[#635bff] gap-1.5"
                    >
                      {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-[#635bff]" />}
                      Validate {currentPreset.name}
                    </Button>
                  </div>

                  {currentSavedConfig?.hasKey && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={(e) => handleDeleteProviderKey(selectedProvider, e)}
                      className="h-9 px-3 text-xs text-destructive hover:bg-destructive/10 gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Clear Key
                    </Button>
                  )}
                </div>
              </form>

              {/* Test & Validation Feedback Display */}
              {testResult && (
                <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                  testResult.success 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                }`}>
                  {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold">
                        {testResult.success ? `Connection Operational (${currentPreset.name})` : 'Connection Test Failed'}
                      </div>
                      {testResult.latencyMs && (
                        <span className="text-[10px] font-mono opacity-80">{testResult.latencyMs}ms latency</span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] opacity-90 leading-relaxed font-mono whitespace-pre-wrap">
                      {testResult.message}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: AI Rules & SOP Engine */
          <div className="space-y-6 max-w-4xl">
            <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-5">
              <div className="space-y-1 border-b border-border/60 pb-3">
                <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[#635bff]" /> Knowledge Base &amp; Campaign Stage Guidelines
                </h3>
                <p className="text-xs text-muted-foreground">
                  Train your AI assistant on your offer context, value prop, and stage-by-stage follow-up rules.
                </p>
              </div>

              <form onSubmit={handleSaveRules} className="space-y-5">
                {/* Knowledge Base */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    1. Brand / Company Knowledge Base
                  </label>
                  <Textarea
                    rows={4}
                    placeholder="Describe your company, main value proposition, key offer, target audience, and demo URLs..."
                    value={rules.knowledge || ''}
                    onChange={(e) => setRules({ ...rules, knowledge: e.target.value })}
                    className="text-xs leading-relaxed bg-background font-sans"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Injected into all system prompts for context across email generation and replies.
                  </p>
                </div>

                {/* Initial Outreach */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    2. Initial Cold Email Guidelines
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="e.g. Keep under 100 words, start with personalized observation about {{company_name}}, low-friction CTA."
                    value={rules.initial || ''}
                    onChange={(e) => setRules({ ...rules, initial: e.target.value })}
                    className="text-xs leading-relaxed bg-background"
                  />
                </div>

                {/* Follow-up 1 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    3. Follow-up #1 Guidelines (Value Add / Angle Shift)
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="e.g. Reference previous email politely, share quick 1-sentence case study or metric, ask if they are the right person."
                    value={rules.followup_1 || ''}
                    onChange={(e) => setRules({ ...rules, followup_1: e.target.value })}
                    className="text-xs leading-relaxed bg-background"
                  />
                </div>

                {/* Follow-up 2 (Breakup) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    4. Follow-up #2 / Breakup Guidelines
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="e.g. Graceful breakup email, let them know you will stop reaching out unless timing improves."
                    value={rules.followup_2 || ''}
                    onChange={(e) => setRules({ ...rules, followup_2: e.target.value })}
                    className="text-xs leading-relaxed bg-background"
                  />
                </div>

                {/* Objection Handling */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">
                    5. Objection Handling &amp; Reply Guidelines
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="e.g. If prospect asks about pricing, state starting price and offer 10-min intro call. If not interested, politely thank them."
                    value={rules.objection || ''}
                    onChange={(e) => setRules({ ...rules, objection: e.target.value })}
                    className="text-xs leading-relaxed bg-background"
                  />
                </div>

                <div className="pt-3 border-t border-border/60 flex items-center justify-end">
                  <Button
                    type="submit"
                    disabled={savingRules}
                    className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                  >
                    {savingRules ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Outreach SOPs
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
