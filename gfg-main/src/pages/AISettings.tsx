import React, { useState, useEffect } from 'react';
import { api, type AIConfig, type AIRules } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { 
  Sparkles, Key, Globe, Cpu, CheckCircle2, AlertTriangle, 
  RefreshCw, Save, BookOpen, Layers, Bot, ExternalLink, HelpCircle
} from 'lucide-react';

interface AIProviderPreset {
  id: string;
  name: string;
  baseUrl: string;
  defaultModel: string;
  getKeyUrl: string;
  badge?: string;
}

const PROVIDERS: AIProviderPreset[] = [
  {
    id: 'nvidia',
    name: 'Nvidia NIM API',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.3-70b-instruct',
    getKeyUrl: 'https://build.nvidia.com/explore/discover',
    badge: 'Enterprise'
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    getKeyUrl: 'https://openrouter.ai/keys',
    badge: '200+ Models'
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    getKeyUrl: 'https://platform.openai.com/api-keys'
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-1.5-flash',
    getKeyUrl: 'https://aistudio.google.com/apikey'
  },
  {
    id: 'groq',
    name: 'Groq API',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    getKeyUrl: 'https://console.groq.com/keys',
    badge: 'Ultra Fast'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek AI',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    getKeyUrl: 'https://platform.deepseek.com/api_keys'
  },
  {
    id: 'custom',
    name: 'Custom / Self-Hosted',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3:latest',
    getKeyUrl: '',
    badge: 'Local / Ollama'
  }
];

export default function AISettings() {
  const [activeTab, setActiveTab] = useState<'connection' | 'rules'>('connection');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Connection State
  const [selectedProvider, setSelectedProvider] = useState<string>('openrouter');
  const [apiKey, setApiKey] = useState<string>('');
  const [baseUrl, setBaseUrl] = useState<string>('https://openrouter.ai/api/v1');
  const [model, setModel] = useState<string>('openai/gpt-4o-mini');
  const [maskedKey, setMaskedKey] = useState<string>('');

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
      const [config, rulesData] = await Promise.all([
        api.getAIConfig().catch(() => ({ configured: false } as AIConfig)),
        api.getAIRules().catch(() => ({} as AIRules))
      ]);

      if (config && config.configured) {
        setSelectedProvider(config.provider || 'custom');
        setBaseUrl(config.baseUrl || 'https://openrouter.ai/api/v1');
        setModel(config.model || 'openai/gpt-4o-mini');
        setMaskedKey(config.maskedApiKey || '');
      }

      setRules({
        knowledge: rulesData.knowledge || '',
        initial: rulesData.initial || '',
        followup_1: rulesData.followup_1 || '',
        followup_2: rulesData.followup_2 || '',
        objection: rulesData.objection || ''
      });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error loading settings', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: AIProviderPreset) => {
    setSelectedProvider(preset.id);
    setBaseUrl(preset.baseUrl);
    setModel(preset.defaultModel);
    setTestResult(null);
  };

  const handleSaveConnection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate: only allow saving if user entered a NEW key (not sending masked key)
    if (!apiKey) {
      toast({ 
        variant: 'destructive', 
        title: 'API Key Required', 
        description: 'Please enter a NEW API key. Cannot save without providing the actual key value.' 
      });
      return;
    }

    // Additional check: reject masked keys or incomplete keys
    if (apiKey.includes('*') || apiKey.length < 10) {
      toast({ 
        variant: 'destructive', 
        title: 'Invalid API Key Format', 
        description: 'API key appears to be invalid. Please enter a complete, valid API key.' 
      });
      return;
    }

    setSaving(true);
    try {
      const res = await api.saveAIConfig({
        provider: selectedProvider,
        apiKey: apiKey.trim(),  // Only send actual key, never masked version
        baseUrl: baseUrl.trim(),
        model: model.trim()
      });
      toast({ title: 'AI Configuration Saved', description: res.message });
      setApiKey('');  // Clear input after successful save
      loadData();  // Reload to get fresh masked key
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      // Only save config if user provided a NEW key
      if (apiKey && apiKey.trim() && !apiKey.includes('*') && apiKey.length > 10) {
        await api.saveAIConfig({
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          baseUrl: baseUrl.trim(),
          model: model.trim()
        });
        setApiKey('');  // Clear after saving
      } else if (apiKey && (apiKey.includes('*') || apiKey.length < 10)) {
        // Reject invalid/masked keys
        throw new Error('Invalid API key format. Please enter a complete, valid key.');
      }
      
      const res = await api.testAIConnection();
      if (res.success) {
        setTestResult({ success: true, message: res.response || 'Connection verified successfully!' });
        toast({ title: 'AI Connection Verified', description: 'AI responded cleanly to test prompt.' });
      } else {
        setTestResult({ success: false, message: res.error || 'Connection failed.' });
      }
      loadData();  // Reload to refresh config display
    } catch (err: any) {
      setTestResult({ success: false, message: err.message });
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

  return (
    <AppShell>
      <SEO title="AI Settings & Rules | OutreachFlow" description="Configure AI provider connections and automated outreach SOP rules." />

      <div className="max-w-6xl mx-auto space-y-6 pb-12">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-6 w-6 text-[#635bff]" />
              <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                AI &amp; SOP Rules
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Connect OpenAI-compatible AI models and train automated outreach SOP guidelines.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40">
            <button
              onClick={() => setActiveTab('connection')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'connection'
                  ? 'bg-card text-[#635bff] shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              API Connections
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'rules'
                  ? 'bg-card text-[#635bff] shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Outreach SOPs
            </button>
          </div>
        </header>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#635bff]" />
            Loading AI Engine Configurations...
          </div>
        ) : activeTab === 'connection' ? (
          /* TAB 1: API Connection & Provider Hub */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Presets Column */}
            <div className="space-y-4">
              <div className="bg-card rounded-xl border border-border/60 p-5 shadow-2xs space-y-3">
                <div className="space-y-1">
                  <h3 className="font-heading text-sm font-bold text-foreground flex items-center gap-2">
                    <Bot className="h-4 w-4 text-[#635bff]" /> Supported AI Providers
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select a preset to auto-configure server URLs and default models.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  {PROVIDERS.map((preset) => {
                    const isSelected = selectedProvider === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[#635bff] bg-[#635bff]/10 font-semibold shadow-2xs'
                            : 'border-border/60 hover:border-border bg-background'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-foreground">{preset.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate max-w-[180px]">
                            {preset.baseUrl}
                          </div>
                        </div>
                        {preset.badge && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0.5 border-[#635bff]/30 text-[#635bff] font-bold">
                            {preset.badge}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Config Form Column */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card rounded-xl border border-border/60 p-6 shadow-2xs space-y-5">
                <div className="space-y-1 border-b border-border/60 pb-3">
                  <h3 className="font-heading text-base font-bold text-foreground flex items-center gap-2">
                    <Globe className="h-4 w-4 text-[#635bff]" /> Provider Configuration
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Keys are encrypted server-side and proxy requests securely without client exposure.
                  </p>
                </div>

                <form onSubmit={handleSaveConnection} className="space-y-4">
                  {/* API Key */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-[#635bff]" /> API Key
                      </label>
                      {PROVIDERS.find(p => p.id === selectedProvider)?.getKeyUrl && (
                        <a
                          href={PROVIDERS.find(p => p.id === selectedProvider)?.getKeyUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] font-bold text-[#635bff] hover:underline flex items-center gap-1"
                        >
                          Get Key <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                    <Input
                      type="password"
                      placeholder={maskedKey ? `Configured (${maskedKey}) — Paste new key to update` : 'Paste your API key here...'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="font-mono text-xs h-10 bg-background"
                    />
                  </div>

                  {/* Base / Server URL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-[#635bff]" /> Server / Base URL
                    </label>
                    <Input
                      type="text"
                      placeholder="https://openrouter.ai/api/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="font-mono text-xs h-10 bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground font-mono">
                      Must point to an OpenAI-compatible `/v1` endpoint.
                    </p>
                  </div>

                  {/* Model Selector / Custom String */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Cpu className="h-3.5 w-3.5 text-[#635bff]" /> Model Identifier String
                    </label>
                    <Input
                      type="text"
                      placeholder="meta/llama-3.3-70b-instruct or gpt-4o-mini"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="font-mono text-xs h-10 bg-background"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Supported model string (e.g. <code className="bg-muted/60 px-1 rounded font-mono">meta/llama-3.3-70b-instruct</code>, <code className="bg-muted/60 px-1 rounded font-mono">gpt-4o-mini</code>, <code className="bg-muted/60 px-1 rounded font-mono">deepseek-chat</code>).
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-3 border-t border-border/60">
                    <Button
                      type="submit"
                      disabled={saving}
                      className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                    >
                      {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save Configuration
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleTestConnection}
                      disabled={testing}
                      className="h-9 text-xs font-bold border-border/60 hover:border-[#635bff] hover:text-[#635bff] gap-1.5"
                    >
                      {testing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-[#635bff]" />}
                      Test Connection
                    </Button>
                  </div>
                </form>

                {/* Test Result Display */}
                {testResult && (
                  <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testResult.success 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-500'
                  }`}>
                    {testResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
                    <div>
                      <div className="font-bold">{testResult.success ? 'Connection Verified' : 'Connection Failed'}</div>
                      <div className="mt-0.5 text-[11px] opacity-90 leading-relaxed">{testResult.message}</div>
                    </div>
                  </div>
                )}
              </div>
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
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-[#635bff]" /> 1. Brand Knowledge Base &amp; Offer Context
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Describe your company, main value proposition, key offer, target audience, and demo URLs..."
                    value={rules.knowledge || ''}
                    onChange={(e) => setRules({ ...rules, knowledge: e.target.value })}
                    className="text-xs bg-background leading-relaxed"
                  />
                </div>

                {/* Initial Outreach SOP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-[#635bff]" /> 2. Initial Cold Email Stage Rule
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Keep under 100 words, start with personalized observation about {{company_name}}, low-friction CTA."
                    value={rules.initial || ''}
                    onChange={(e) => setRules({ ...rules, initial: e.target.value })}
                    className="text-xs bg-background leading-relaxed"
                  />
                </div>

                {/* Follow-up 1 SOP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-[#635bff]" /> 3. First Follow-Up Stage Rule
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Send 2-3 days after initial. Provide a short 1-line case study or social proof angle."
                    value={rules.followup_1 || ''}
                    onChange={(e) => setRules({ ...rules, followup_1: e.target.value })}
                    className="text-xs bg-background leading-relaxed"
                  />
                </div>

                {/* Follow-up 2 SOP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Bot className="h-3.5 w-3.5 text-[#635bff]" /> 4. Second / Breakup Follow-Up Stage Rule
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Final push. Friendly permission to close the file."
                    value={rules.followup_2 || ''}
                    onChange={(e) => setRules({ ...rules, followup_2: e.target.value })}
                    className="text-xs bg-background leading-relaxed"
                  />
                </div>

                {/* Objection Handling SOP */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <HelpCircle className="h-3.5 w-3.5 text-[#635bff]" /> 5. Objection &amp; Inquiry Handling Guidelines
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="e.g. If prospect asks for pricing, explain ROI first. If prospect says not interested, thank them gracefully."
                    value={rules.objection || ''}
                    onChange={(e) => setRules({ ...rules, objection: e.target.value })}
                    className="text-xs bg-background leading-relaxed"
                  />
                </div>

                <div className="pt-3 border-t border-border/60">
                  <Button
                    type="submit"
                    disabled={savingRules}
                    className="h-9 px-5 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white gap-2"
                  >
                    {savingRules ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save AI Rules &amp; SOPs
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
