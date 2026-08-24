import React, { useState, useEffect, useRef } from 'react';
import { api, type Template } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { VoiceToTextButton } from '@/components/VoiceToTextButton';
import { RecentSearchInput } from '@/components/RecentSearchInput';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, Trash2, Edit, Copy, Eye, Sparkles, FileText, Search, 
  MoreVertical, Check, RefreshCw, X, Save, Clock, ArrowUpRight, Code,
  Wand2, Layers, Tag
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface TemplatesProps {
  requirePin?: (label: string, action: () => void) => void;
}

// Mock initial category tags and stats for enhanced visual representation
const TEMPLATE_CATEGORIES = ['All Templates', 'Cold Outreach', 'Follow-up', 'Networking', 'Welcome Series'];

const STARTER_TEMPLATES = [
  {
    name: 'Shopify / E-Commerce Growth Pitch',
    subject: '{Quick idea for|Question regarding} {{store_name}}',
    body_html: '<p>Hi {{first_name}},</p>\n<p>I was browsing <strong>{{store_name}}</strong> and love what you are building in the {{niche}} space.</p>\n<p>We recently helped a similar brand scale their checkout conversion rate by 24% using automated AI cart recovery.</p>\n<p>Would you be open to a 5-minute chat this Thursday to see how we could do the same for {{store_name}}?</p>\n<p>Best regards,<br>{{my_name}}</p>',
    body_plain: 'Hi {{first_name}},\n\nI was browsing {{store_name}} and love what you are building in the {{niche}} space.\n\nWe recently helped a similar brand scale their checkout conversion rate by 24% using automated AI cart recovery.\n\nWould you be open to a 5-minute chat this Thursday to see how we could do the same for {{store_name}}?\n\nBest regards,\n{{my_name}}'
  },
  {
    name: 'B2B SaaS / Solution Pitch',
    subject: '{{first_name}}, quick question about {{company_name}}',
    body_html: '<p>Hi {{first_name}},</p>\n<p>Saw that you are leading growth at <strong>{{company_name}}</strong>.</p>\n<p>We developed a lightweight cold outreach infrastructure that automates multi-sender rotation and eliminates spam filters completely.</p>\n<p>Are you currently looking to ramp up outbound pipeline this quarter?</p>\n<p>Cheers,<br>{{my_name}}</p>',
    body_plain: 'Hi {{first_name}},\n\nSaw that you are leading growth at {{company_name}}.\n\nWe developed a lightweight cold outreach infrastructure that automates multi-sender rotation and eliminates spam filters completely.\n\nAre you currently looking to ramp up outbound pipeline this quarter?\n\nCheers,\n{{my_name}}'
  },
  {
    name: 'Gentle Step 2 Follow-Up',
    subject: 'Re: {Quick idea for|Question regarding} {{store_name}}',
    body_html: '<p>Hi {{first_name}},</p>\n<p>Floating this back to the top of your inbox in case it got buried under other messages.</p>\n<p>Let me know if this is something on your roadmap for {{company_name}} this month.</p>',
    body_plain: 'Hi {{first_name}},\n\nFloating this back to the top of your inbox in case it got buried under other messages.\n\nLet me know if this is something on your roadmap for {{company_name}} this month.'
  }
];

export default function Templates({ requirePin }: TemplatesProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Templates');

  // Modal / Form state
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('Cold Outreach');
  const [subject, setSubject] = useState<string>('');
  const [bodyHtml, setBodyHtml] = useState<string>('');
  const [bodyPlain, setBodyPlain] = useState<string>('');
  const [showFallback, setShowFallback] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // AI Prompt Generation State
  const [showAiGenBox, setShowAiGenBox] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiStage, setAiStage] = useState<string>('initial');

  const previewRef = useRef<HTMLIFrameElement | null>(null);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading templates',
        description: e.message || 'Could not fetch templates.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportStarters = async () => {
    setLoading(true);
    try {
      for (const st of STARTER_TEMPLATES) {
        await api.createTemplate({
          name: st.name,
          subject: st.subject,
          body_html: st.body_html,
          body_plain: st.body_plain
        });
      }
      toast({
        title: 'Starters Imported',
        description: 'Added E-Commerce, SaaS & Follow-up starter templates to your library.'
      });
      loadTemplates();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  // Update live preview iframe
  useEffect(() => {
    if (previewRef.current && showModal) {
      previewRef.current.srcdoc = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 16px; margin: 0; font-size: 14px; line-height: 1.6; color: #151c27; background-color: #ffffff; }
            </style>
          </head>
          <body>
            ${bodyHtml || '<p style="color:#777587;font-style:italic">Email HTML preview will render here in real-time...</p>'}
          </body>
        </html>`;
    }
  }, [bodyHtml, showModal]);

  const handleOpenNew = () => {
    setName('');
    setCategory('Cold Outreach');
    setSubject('');
    setBodyHtml('<p>Hi {{first_name}},</p>\n<p></p>');
    setBodyPlain('Hi {{first_name}},\n\n');
    setEditingTemplate(null);
    setShowAiGenBox(false);
    setShowModal(true);
  };

  const handleOpenEdit = (t: Template) => {
    setName(t.name);
    setCategory('Cold Outreach');
    setSubject(t.subject || '');
    setBodyHtml(t.body_html || '');
    setBodyPlain(t.body_plain || '');
    setEditingTemplate(t);
    setShowAiGenBox(false);
    setShowModal(true);
  };

  const insertVariable = (tag: string) => {
    setBodyHtml(prev => `${prev || ''} {{${tag}}}`);
    setBodyPlain(prev => `${prev || ''} {{${tag}}}`);
    toast({ title: 'Variable Added', description: `Inserted {{${tag}}} into template.` });
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.aiGenerate({
        prompt: aiPrompt.trim(),
        stage: aiStage
      });
      if (res.success) {
        if (res.subject) setSubject(res.subject);
        if (res.body_html) setBodyHtml(res.body_html);
        if (!name) setName(aiPrompt.trim().slice(0, 30));
        toast({ title: 'AI Template Generated', description: 'Subject and body updated with AI copy.' });
        setShowAiGenBox(false);
        setAiPrompt('');
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Generation Failed', description: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiImprove = async () => {
    if (!bodyHtml.trim()) {
      toast({ variant: 'destructive', title: 'No Content', description: 'Enter some template content first to polish.' });
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.aiRewrite({
        subject,
        body: bodyHtml,
        instruction: 'Maximize response rate and polish cold email copy'
      });
      if (res.success) {
        if (res.subject) setSubject(res.subject);
        if (res.body_html) setBodyHtml(res.body_html);
        toast({ title: 'AI Copy Polished', description: 'Template rewritten for high conversion.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Polish Failed', description: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSpintax = async () => {
    if (!bodyHtml.trim()) {
      toast({ variant: 'destructive', title: 'No Content', description: 'Enter email body first to generate spintax.' });
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.aiSpintax(bodyHtml);
      if (res.success && res.spintax) {
        setBodyHtml(res.spintax);
        toast({ title: 'Spintax Generated', description: 'Added {option1|option2} variations.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Spintax Failed', description: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    const action = async () => {
      if (!name || !subject) {
        toast({
          variant: 'destructive',
          title: 'Missing Required Fields',
          description: 'Template title and email subject line are required.'
        });
        return;
      }

      try {
        if (editingTemplate) {
          await api.updateTemplate(editingTemplate.id, {
            name,
            subject,
            body_html: bodyHtml,
            body_plain: bodyPlain
          });
          toast({
            title: 'Template Updated',
            description: `"${name}" changes have been saved.`
          });
        } else {
          await api.createTemplate({
            name,
            subject,
            body_html: bodyHtml,
            body_plain: bodyPlain
          });
          toast({
            title: 'Template Saved',
            description: `"${name}" was added to your library.`
          });
        }
        setShowModal(false);
        loadTemplates();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error saving template',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('save template', action);
    } else {
      action();
    }
  };

  const handleDelete = (id: number, templateName: string) => {
    const action = async () => {
      if (!window.confirm(`Permanently delete template "${templateName}"?`)) return;
      try {
        await api.deleteTemplate(id);
        toast({
          title: 'Template Deleted',
          description: `"${templateName}" was removed.`
        });
        loadTemplates();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error deleting template',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('delete template', action);
    } else {
      action();
    }
  };

  const handleDuplicate = (t: Template) => {
    const action = async () => {
      try {
        await api.createTemplate({
          name: `${t.name} (Copy)`,
          subject: t.subject,
          body_html: t.body_html,
          body_plain: t.body_plain
        });
        toast({
          title: 'Template Duplicated',
          description: `Created copy of "${t.name}".`
        });
        loadTemplates();
      } catch (e: any) {
        toast({
          variant: 'destructive',
          title: 'Error duplicating template',
          description: e.message
        });
      }
    };

    if (requirePin) {
      requirePin('duplicate template', action);
    } else {
      action();
    }
  };



  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchName = t.name.toLowerCase().includes(q);
      const matchSub = t.subject.toLowerCase().includes(q);
      const matchBody = (t.body_plain || '').toLowerCase().includes(q);
      if (!matchName && !matchSub && !matchBody) return false;
    }
    return true;
  });

  return (
    <AppShell>
      <SEO
        title="Message Templates | Outreach Marketing Workspace"
        description="Manage and organize your reusable outreach message templates with live HTML preview and variable insertion."
      />

      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Message Templates
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and organize your reusable outreach content.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleImportStarters}
              className="h-10 px-4 text-xs font-semibold gap-2 border-border/60 hover:bg-muted"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              Load Starters
            </Button>
            <Button
              onClick={handleOpenNew}
              className="h-10 px-5 text-xs font-semibold gap-2 bg-[#635bff] hover:bg-[#493ee5] text-white shadow-sm"
            >
              <Plus className="h-4 w-4" />
              Create Template
            </Button>
          </div>
        </header>

        {/* Search & Category Filter Bar */}
        <div className="bg-card rounded-xl border border-border/60 p-3 flex flex-col md:flex-row gap-3 items-center justify-between shadow-2xs">
          <RecentSearchInput
            storageKey="templates_search_history"
            placeholder="Search templates by name or subject..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full h-10 pl-9 pr-4 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff] transition-all"
            containerClassName="relative w-full md:max-w-md"
            iconClassName="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          />

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
            {TEMPLATE_CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#635bff] text-white border border-[#635bff] shadow-2xs'
                      : 'bg-background border border-border/60 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Templates Grid */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs">
            <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#635bff]" />
            Loading template library...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-xs bg-card rounded-xl border border-border/60 space-y-3">
            <FileText className="h-8 w-8 mx-auto opacity-30 text-muted-foreground" />
            <p className="font-medium text-foreground">No message templates found.</p>
            <p className="text-muted-foreground">Create reusable outreach content with dynamic tags like {"{{first_name}}"}, {"{{store_name}}"}, and {"{{company_name}}"}.</p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleImportStarters}
                className="text-xs font-semibold gap-1.5 border-border/60"
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Load Starter Templates (Shopify, SaaS)
              </Button>
              <Button
                onClick={handleOpenNew}
                className="text-xs font-semibold bg-[#635bff] text-white hover:bg-[#493ee5]"
              >
                Create Custom Template
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredTemplates.map((t, index) => {
              // Assign color dot indicator based on index
              const dotColors = ['bg-[#635bff]', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];
              const dotColor = dotColors[index % dotColors.length];

              return (
                <div
                  key={t.id}
                  className="bg-card rounded-xl border border-border/60 p-5 flex flex-col hover:border-border transition-all duration-200 shadow-2xs group"
                >
                  {/* Card Header */}
                  <div className="flex justify-between items-start mb-3 gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${dotColor}`}></span>
                        <h3 className="font-heading text-sm sm:text-base font-bold text-foreground">
                          {t.name}
                        </h3>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-muted text-muted-foreground border border-border/40">
                        Cold Outreach
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-colors"
                        title="Edit Template"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(t)}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/40 transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id, t.name)}
                        className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Subject Box */}
                  <div className="mb-3">
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                      Subject
                    </label>
                    <div className="text-xs font-mono text-foreground bg-muted/30 rounded-lg p-2.5 border border-border/50 truncate">
                      {t.subject || 'No subject line'}
                    </div>
                  </div>

                  {/* Body Preview */}
                  <div className="mb-4 flex-1">
                    <label className="block text-[11px] font-bold text-muted-foreground mb-1 uppercase tracking-wider">
                      Preview
                    </label>
                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed bg-background p-2.5 rounded-lg border border-border/30">
                      {t.body_plain || t.body_html?.replace(/<[^>]+>/g, '') || 'No content preview available...'}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/40 mt-auto">
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      <Clock className="h-3.5 w-3.5" />
                      Updated {new Date(t.created_at).toLocaleDateString()}
                    </div>

                    <Button
                      onClick={() => handleOpenEdit(t)}
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 text-xs font-bold border-border/60 hover:border-[#635bff] hover:text-[#635bff]"
                    >
                      Use / Edit
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Template Composer Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] rounded-2xl border border-border/80 bg-card p-6 shadow-2xl flex flex-col overflow-hidden">
          <DialogHeader className="space-y-1 text-left pb-2 border-b border-border/60 shrink-0">
            <DialogTitle className="font-heading text-lg font-bold text-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>{editingTemplate ? 'Edit Template' : 'Create New Template'}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAiGenBox(!showAiGenBox)}
                  className="h-8 px-2.5 text-xs font-bold gap-1.5 text-[#635bff] border-[#635bff]/40 hover:bg-[#635bff]/10"
                >
                  <Wand2 className="h-3.5 w-3.5" />
                  <span>{showAiGenBox ? 'Close AI Prompt' : '✨ AI Generate'}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAiImprove}
                  disabled={aiLoading}
                  className="h-8 px-2 text-xs font-bold gap-1 text-[#635bff] hover:bg-[#635bff]/10"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{aiLoading ? '...' : 'Polish'}</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAiSpintax}
                  disabled={aiLoading}
                  className="h-8 px-2 text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Spintax</span>
                </Button>

                <VoiceToTextButton
                  size="sm"
                  variant="outline"
                  label="Voice"
                  onTranscript={(text) => {
                    setBodyHtml((prev) => (prev ? `${prev}\n<p>${text}</p>` : `<p>${text}</p>`));
                    setBodyPlain((prev) => (prev ? `${prev}\n${text}` : text));
                  }}
                />
              </div>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Design email layouts with dynamic personalization tags like {"{{first_name}}"} and {"{{company_name}}"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto pr-1 text-xs">
            {/* AI Generator Panel (Collapsible) */}
            {showAiGenBox && (
              <div className="p-3.5 rounded-xl border border-[#635bff]/40 bg-[#635bff]/5 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#635bff]" /> AI Email Template Generator
                  </span>
                  <select
                    value={aiStage}
                    onChange={(e) => setAiStage(e.target.value)}
                    className="text-[11px] bg-background border border-border/80 rounded-md px-2 py-0.5"
                  >
                    <option value="initial">Initial Cold Outreach</option>
                    <option value="followup_1">Follow-up #1 (Value Add)</option>
                    <option value="followup_2">Follow-up #2 (Breakup)</option>
                    <option value="networking">Networking / Partnership</option>
                  </select>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Describe your offer or goal (e.g. Pitch AI cold email infrastructure to Shopify store owners)..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAiGenerate(); } }}
                    className="h-9 text-xs bg-background"
                  />
                  <Button
                    type="button"
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="h-9 px-4 text-xs font-bold bg-[#635bff] hover:bg-[#493ee5] text-white shrink-0 gap-1.5"
                  >
                    {aiLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                    Generate
                  </Button>
                </div>
              </div>
            )}

            {/* Title & Subject */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-foreground">Template Name*</label>
                <Input
                  placeholder="e.g. SaaS Intro - Value Prop"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg h-9 border-border/80"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-foreground">Subject Line*</label>
                <Input
                  placeholder="e.g. Quick question regarding {{company_name}}"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="rounded-lg h-9 border-border/80"
                />
              </div>
            </div>

            {/* Variable Tags Quick-Insert Pills */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
                <Tag className="h-3 w-3" /> Insert Tag:
              </span>
              {['first_name', 'company_name', 'email', 'job_title', 'website', 'custom_1'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariable(tag)}
                  className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-[#635bff]/15 hover:text-[#635bff] text-[10px] font-mono border border-border/60 transition-colors"
                >
                  +{`{{${tag}}}`}
                </button>
              ))}
            </div>

            {/* HTML Editor & Live Preview */}
            <div className="space-y-1.5">
              <label className="font-bold text-foreground flex items-center gap-1.5">
                <Code className="h-4 w-4 text-[#635bff]" /> HTML Content &amp; Live Visual Preview
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-border/80 rounded-xl overflow-hidden bg-background">
                {/* Editor */}
                <div className="flex flex-col border-b md:border-b-0 md:border-r border-border/80">
                  <div className="bg-muted/40 px-3 py-1.5 border-b border-border/60 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                    HTML Source
                  </div>
                  <textarea
                    value={bodyHtml}
                    onChange={(e) => setBodyHtml(e.target.value)}
                    placeholder="Enter HTML body content..."
                    spellCheck={false}
                    className="w-full p-3 font-mono text-xs leading-relaxed resize-y h-52 focus:outline-none bg-background text-foreground"
                  />
                </div>

                {/* Live Preview */}
                <div className="flex flex-col">
                  <div className="bg-muted/40 px-3 py-1.5 border-b border-border/60 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                    <Eye className="h-3 w-3 text-[#635bff]" /> Live Preview Frame
                  </div>
                  <iframe
                    ref={previewRef}
                    title="Live Preview"
                    sandbox="allow-same-origin"
                    className="w-full h-52 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Collapsible Plain Text Fallback */}
            <div className="pt-1">
              {!showFallback && !bodyPlain ? (
                <button
                  type="button"
                  onClick={() => setShowFallback(true)}
                  className="text-xs text-muted-foreground hover:text-primary font-medium flex items-center gap-1.5 transition-colors py-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Plain-Text Fallback (Optional)
                </button>
              ) : (
                <div className="space-y-1.5 p-3 rounded-xl bg-muted/20 border border-border/70 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                      Plain-Text Fallback (Spam Guard Backup)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowFallback(false);
                        if (!bodyPlain) setBodyPlain('');
                      }}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Collapse
                    </button>
                  </div>
                  <textarea
                    value={bodyPlain}
                    onChange={(e) => setBodyPlain(e.target.value)}
                    placeholder="Enter plain text fallback version..."
                    className="w-full bg-background text-xs rounded-lg border border-border/80 p-2.5 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-[#635bff] leading-relaxed"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex gap-2 pt-3 border-t border-border/60 shrink-0">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              className="rounded-lg h-9 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-lg bg-[#635bff] hover:bg-[#493ee5] text-white h-9 px-5 text-xs font-bold gap-2"
            >
              <Save className="h-4 w-4" />
              <span>Save Template</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
