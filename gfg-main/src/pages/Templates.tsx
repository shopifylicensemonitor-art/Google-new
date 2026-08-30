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
  Wand2, Layers, Tag, Bold, Italic, Underline, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered, Link2, Unlink,
  Undo, Redo, Eraser, Columns, Monitor, UserCheck, Send
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { SendTestEmailModal } from '@/components/SendTestEmailModal';
import { SpamScoreMeter } from '@/components/SpamScoreMeter';

interface TemplatesProps {
  requirePin?: (label: string, action: () => void) => void;
}

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

// Sample persona simulator data
const SAMPLE_PERSONA = {
  first_name: 'Alex',
  last_name: 'Rivera',
  company_name: 'Starlight Apparel',
  store_name: 'Starlight Apparel',
  email: 'alex@starlightapparel.com',
  job_title: 'Head of Growth',
  website: 'starlightapparel.com',
  niche: 'Fashion & Apparel',
  my_name: 'Gabriel'
};

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

  // Editor View Mode: 'split' | 'visual' | 'code'
  const [editorMode, setEditorMode] = useState<'split' | 'visual' | 'code'>('split');
  const [simulateVariables, setSimulateVariables] = useState<boolean>(false);

  // AI Prompt Generation State
  const [showAiGenBox, setShowAiGenBox] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [aiStage, setAiStage] = useState<string>('initial');

  // Test Email Modal State
  const [testModalOpen, setTestModalOpen] = useState<boolean>(false);
  const [testTargetTemplate, setTestTargetTemplate] = useState<{
    id?: number;
    name?: string;
    subject?: string;
    body_html?: string;
    body_plain?: string;
  } | null>(null);

  const visualEditorRef = useRef<HTMLDivElement | null>(null);
  const isInternalVisualEdit = useRef<boolean>(false);

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

  // Sync bodyHtml to Visual Editor div when not actively typing in it
  useEffect(() => {
    if (visualEditorRef.current && !isInternalVisualEdit.current) {
      if (simulateVariables) {
        let simulated = bodyHtml || '';
        Object.entries(SAMPLE_PERSONA).forEach(([k, v]) => {
          const reg = new RegExp(`\\{\\{${k}\\}\\}`, 'gi');
          simulated = simulated.replace(reg, `<span style="background-color:rgba(99,91,255,0.15);color:#635bff;padding:1px 4px;border-radius:4px;font-weight:600;">${v}</span>`);
        });
        visualEditorRef.current.innerHTML = simulated;
      } else {
        visualEditorRef.current.innerHTML = bodyHtml || '';
      }
    }
  }, [bodyHtml, showModal, simulateVariables]);

  const handleVisualInput = () => {
    if (visualEditorRef.current) {
      isInternalVisualEdit.current = true;
      const html = visualEditorRef.current.innerHTML;
      setBodyHtml(html);
      // Generate clean plain text automatically
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;
      setBodyPlain(tempDiv.innerText || tempDiv.textContent || '');
      setTimeout(() => {
        isInternalVisualEdit.current = false;
      }, 50);
    }
  };

  // Rich Text Formatting Exec Commands
  const formatDoc = (cmd: string, val: string | undefined = undefined) => {
    if (!visualEditorRef.current) return;
    visualEditorRef.current.focus();
    document.execCommand(cmd, false, val);
    handleVisualInput();
  };

  const handleInsertLink = () => {
    const url = prompt('Enter destination URL (e.g. https://yourcompany.com/demo):', 'https://');
    if (url && url !== 'https://') {
      formatDoc('createLink', url);
    }
  };

  const handleInsertButton = () => {
    const text = prompt('Button CTA Text:', 'Book a 5-Min Call');
    const url = prompt('Button Destination URL:', 'https://calendly.com');
    if (text && url) {
      const buttonHtml = `&nbsp;<a href="${url}" style="display:inline-block;padding:10px 20px;background-color:#635bff;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;font-size:13px;margin:8px 0;" target="_blank">${text}</a>&nbsp;`;
      formatDoc('insertHTML', buttonHtml);
    }
  };

  const handleOpenNew = () => {
    setName('');
    setCategory('Cold Outreach');
    setSubject('');
    setBodyHtml('<p>Hi {{first_name}},</p>\n<p></p>');
    setBodyPlain('Hi {{first_name}},\n\n');
    setEditingTemplate(null);
    setShowAiGenBox(false);
    setEditorMode('split');
    setSimulateVariables(false);
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
    setEditorMode('split');
    setSimulateVariables(false);
    setShowModal(true);
  };

  const insertVariable = (tag: string) => {
    const varTag = `{{${tag}}}`;
    if (editorMode === 'code') {
      setBodyHtml(prev => `${prev || ''} ${varTag}`);
    } else {
      formatDoc('insertHTML', `&nbsp;<span style="background-color:rgba(99,91,255,0.12);color:#635bff;padding:1px 5px;border-radius:4px;font-family:monospace;font-size:12px;font-weight:600;">${varTag}</span>&nbsp;`);
    }
    setBodyPlain(prev => `${prev || ''} ${varTag}`);
    toast({ title: 'Variable Added', description: `Inserted ${varTag} into template.` });
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
        toast({ title: 'Template Polished', description: 'Subject and body updated with polished version.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Polish Failed', description: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSpintax = async () => {
    if (!bodyHtml.trim() && !subject.trim()) {
      toast({ variant: 'destructive', title: 'No Content', description: 'Enter a subject line or email body first.' });
      return;
    }
    setAiLoading(true);
    try {
      const res = await api.aiGenerateSpintax({
        text: `${subject}\n\n${bodyHtml}`,
        intensity: 'medium'
      });
      if (res.success && res.spintax) {
        const parts = res.spintax.split('\n\n');
        if (parts.length > 1) {
          setSubject(parts[0]);
          setBodyHtml(parts.slice(1).join('\n\n'));
        } else {
          setBodyHtml(res.spintax);
        }
        toast({ title: 'Spintax Generated', description: 'Spintax rotation tags successfully injected.' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Spintax Failed', description: err.message });
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ variant: 'destructive', title: 'Missing Title', description: 'Please enter a name for this template.' });
      return;
    }
    if (!subject.trim()) {
      toast({ variant: 'destructive', title: 'Missing Subject', description: 'Please enter a subject line.' });
      return;
    }

    const action = async () => {
      try {
        if (editingTemplate) {
          await api.updateTemplate(editingTemplate.id, {
            name: name.trim(),
            subject: subject.trim(),
            body_html: bodyHtml,
            body_plain: bodyPlain || bodyHtml.replace(/<[^>]+>/g, '')
          });
          toast({ title: 'Template Updated', description: `Saved changes to "${name}".` });
        } else {
          await api.createTemplate({
            name: name.trim(),
            subject: subject.trim(),
            body_html: bodyHtml,
            body_plain: bodyPlain || bodyHtml.replace(/<[^>]+>/g, '')
          });
          toast({ title: 'Template Created', description: `Added "${name}" to library.` });
        }
        setShowModal(false);
        loadTemplates();
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
      }
    };

    if (requirePin) {
      requirePin(editingTemplate ? 'update template' : 'create template', action);
    } else {
      action();
    }
  };

  const handleDelete = (id: number, templateName: string) => {
    const action = async () => {
      if (!window.confirm(`Delete template "${templateName}"?`)) return;
      try {
        await api.deleteTemplate(id);
        toast({ title: 'Template Deleted', description: `Removed "${templateName}".` });
        loadTemplates();
      } catch (err: any) {
        toast({ variant: 'destructive', title: 'Delete Failed', description: err.message });
      }
    };

    if (requirePin) {
      requirePin('delete template', action);
    } else {
      action();
    }
  };

  const handleDuplicate = async (t: Template) => {
    try {
      await api.createTemplate({
        name: `${t.name} (Copy)`,
        subject: t.subject,
        body_html: t.body_html,
        body_plain: t.body_plain
      });
      toast({ title: 'Template Duplicated', description: `Created a copy of "${t.name}".` });
      loadTemplates();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Duplicate Failed', description: err.message });
    }
  };
  const handleOpenTestModal = (t?: Template | null) => {
    if (t) {
      setTestTargetTemplate({
        id: t.id,
        name: t.name,
        subject: t.subject,
        body_html: t.body_html,
        body_plain: t.body_plain
      });
    } else {
      setTestTargetTemplate({
        id: editingTemplate?.id,
        name: name || 'Draft Template',
        subject: subject,
        body_html: bodyHtml,
        body_plain: bodyPlain
      });
    }
    setTestModalOpen(true);
  };
  // Filter templates
  const filteredTemplates = templates.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.subject && t.subject.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  return (
    <AppShell title="Email Template Library">
      <SEO
        title="Email Templates - Peak Xender"
        description="Craft, personalize, test, and save high-converting cold outreach sequences with dynamic tags and AI spintax."
      />

      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-[#635bff]" /> Message Templates
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Create and manage reusable sequence copy with real-time visual editing, formatting tools, and spintax variations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportStarters}
              className="text-xs font-semibold gap-1.5 border-border/60"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Starter Copy
            </Button>
            <Button
              size="sm"
              onClick={handleOpenNew}
              className="bg-[#635bff] hover:bg-[#493ee5] text-white text-xs font-bold gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" /> New Template
            </Button>
          </div>
        </div>

        {/* Top KPI / Metrics Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border border-border/70 p-3.5 rounded-xl shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Templates Library</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-heading text-foreground">{templates.length}</span>
              <span className="text-[11px] text-[#635bff] font-semibold">Active Ready</span>
            </div>
          </div>

          <div className="bg-card border border-border/70 p-3.5 rounded-xl shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Dynamic Personalization</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">8+</span>
              <span className="text-[11px] text-muted-foreground">Tags Supported</span>
            </div>
          </div>

          <div className="bg-card border border-border/70 p-3.5 rounded-xl shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Spintax Variations</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">Multi-Option</span>
              <span className="text-[11px] text-muted-foreground">Spam Defense</span>
            </div>
          </div>

          <div className="bg-card border border-border/70 p-3.5 rounded-xl shadow-2xs">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Deliverability Preview</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl sm:text-2xl font-bold font-heading text-[#635bff]">1-Click</span>
              <span className="text-[11px] text-muted-foreground">Live Inbox Test</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-card p-4 rounded-xl border border-border/60 shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5" />
              <Input
                placeholder="Search templates by title or subject line..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-background border-border/60"
              />
            </div>

            <div className="text-xs text-muted-foreground font-mono">
              Showing <strong>{filteredTemplates.length}</strong> of {templates.length} templates
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {TEMPLATE_CATEGORIES.map(cat => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg font-medium transition-all whitespace-nowrap ${
                    active
                      ? 'bg-[#635bff] text-white font-bold shadow-2xs'
                      : 'bg-muted/40 text-muted-foreground hover:text-foreground hover:bg-muted'
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

                      <div className="flex items-center gap-1.5">
                        <Button
                          onClick={() => handleOpenTestModal(t)}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-bold border-border/60 hover:border-[#635bff] hover:text-[#635bff] gap-1"
                          title="Send a live test email to verify formatting and deliverability"
                        >
                          <Send className="h-3 w-3 text-[#635bff]" /> Test Send
                        </Button>
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
                </div>
              );
            })}
          </div>
        )}

        {/* Edit / Create Template Modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="sm:max-w-[900px] max-h-[92vh] flex flex-col p-6">
            <DialogHeader className="shrink-0 border-b border-border/60 pb-3">
              <DialogTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-lg font-bold">
                <span className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#635bff]" />
                  {editingTemplate ? 'Edit Template' : 'Create Email Template'}
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAiGenBox(!showAiGenBox)}
                    className="h-8 px-2.5 text-xs font-bold gap-1 border-[#635bff]/40 text-[#635bff] hover:bg-[#635bff]/10"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    <span>AI Generate</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAiImprove}
                    disabled={aiLoading}
                    className="h-8 px-2 text-xs font-bold gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Polish</span>
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

            <div className="space-y-4 py-4 overflow-y-auto pr-1 text-xs flex-1">
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
                    className="rounded-lg h-9 border-border/80 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-foreground">Subject Line*</label>
                  <Input
                    placeholder="e.g. Quick question regarding {{company_name}}"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="rounded-lg h-9 border-border/80 text-xs"
                  />
                </div>
              </div>

              {/* Variable Tags Quick-Insert Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-bold text-muted-foreground mr-1 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Quick Variables:
                </span>
                {['first_name', 'company_name', 'store_name', 'email', 'niche', 'job_title', 'website', 'my_name'].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertVariable(tag)}
                    className="px-2 py-0.5 rounded-md bg-muted/60 hover:bg-[#635bff]/15 hover:text-[#635bff] text-[10px] font-mono border border-border/60 transition-colors cursor-pointer"
                  >
                    +{`{{${tag}}}`}
                  </button>
                ))}
              </div>

              {/* Rich Visual Editor & Live Preview Container */}
              <div className="space-y-2 border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
                {/* Editor Header Bar: View Modes & Formatting Controls */}
                <div className="bg-muted/40 px-3 py-2 border-b border-border/60 flex flex-wrap items-center justify-between gap-2">
                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 bg-background p-0.5 rounded-lg border border-border/60">
                    <button
                      type="button"
                      onClick={() => setEditorMode('split')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                        editorMode === 'split' ? 'bg-[#635bff] text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Columns className="h-3 w-3" /> Split View
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('visual')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                        editorMode === 'visual' ? 'bg-[#635bff] text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Eye className="h-3 w-3" /> Live Visual Editor
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditorMode('code')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                        editorMode === 'code' ? 'bg-[#635bff] text-white shadow-2xs' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Code className="h-3 w-3" /> HTML Source
                    </button>
                  </div>

                  {/* Simulator Toggle */}
                  <button
                    type="button"
                    onClick={() => setSimulateVariables(!simulateVariables)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border flex items-center gap-1.5 transition-all ${
                      simulateVariables
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <UserCheck className="h-3 w-3" />
                    {simulateVariables ? 'Previewing as Lead (Alex)' : 'Simulate Variables'}
                  </button>
                </div>

                {/* Rich Formatting Toolbar (Visible in Visual & Split modes) */}
                {editorMode !== 'code' && (
                  <div className="px-3 py-1.5 bg-background/60 border-b border-border/40 flex flex-wrap items-center gap-1 text-xs">
                    <button
                      type="button"
                      onClick={() => formatDoc('bold')}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground font-bold"
                      title="Bold (Ctrl+B)"
                    >
                      <Bold className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('italic')}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground italic"
                      title="Italic (Ctrl+I)"
                    >
                      <Italic className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('underline')}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground underline"
                      title="Underline (Ctrl+U)"
                    >
                      <Underline className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('strikeThrough')}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Strikethrough"
                    >
                      <Strikethrough className="h-3.5 w-3.5" />
                    </button>

                    <div className="h-4 w-px bg-border/60 mx-1" />

                    <button
                      type="button"
                      onClick={() => formatDoc('formatBlock', '<h1>')}
                      className="px-1.5 py-1 rounded hover:bg-muted text-[10px] font-bold text-muted-foreground hover:text-foreground"
                      title="Heading 1"
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('formatBlock', '<h2>')}
                      className="px-1.5 py-1 rounded hover:bg-muted text-[10px] font-bold text-muted-foreground hover:text-foreground"
                      title="Heading 2"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('formatBlock', '<p>')}
                      className="px-1.5 py-1 rounded hover:bg-muted text-[10px] font-bold text-muted-foreground hover:text-foreground"
                      title="Paragraph"
                    >
                      P
                    </button>

                    <div className="h-4 w-px bg-border/60 mx-1" />

                    <button
                      type="button"
                      onClick={() => formatDoc('insertUnorderedList')}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Bullet List"
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('insertOrderedList')}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Numbered List"
                    >
                      <ListOrdered className="h-3.5 w-3.5" />
                    </button>

                    <div className="h-4 w-px bg-border/60 mx-1" />

                    <button
                      type="button"
                      onClick={handleInsertLink}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Insert Hyperlink"
                    >
                      <Link2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleInsertButton}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#635bff]/10 text-[#635bff] hover:bg-[#635bff]/20"
                      title="Insert Styled CTA Button"
                    >
                      + Button CTA
                    </button>

                    <div className="h-4 w-px bg-border/60 mx-1" />

                    <button
                      type="button"
                      onClick={() => formatDoc('removeFormat')}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Clear Formatting"
                    >
                      <Eraser className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('undo')}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Undo"
                    >
                      <Undo className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => formatDoc('redo')}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Redo"
                    >
                      <Redo className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* Editor Content Area */}
                <div className={`grid ${editorMode === 'split' ? 'grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/80' : 'grid-cols-1'}`}>
                  {/* HTML Source Panel */}
                  {(editorMode === 'split' || editorMode === 'code') && (
                    <div className="flex flex-col bg-background">
                      {editorMode === 'split' && (
                        <div className="bg-muted/30 px-3 py-1 border-b border-border/40 text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                          <span>HTML Source</span>
                          <span className="font-mono text-[9px] lowercase">editable</span>
                        </div>
                      )}
                      <textarea
                        value={bodyHtml}
                        onChange={(e) => setBodyHtml(e.target.value)}
                        placeholder="Enter HTML body content..."
                        spellCheck={false}
                        className="w-full p-3.5 font-mono text-xs leading-relaxed resize-y h-64 focus:outline-none bg-background text-foreground"
                      />
                    </div>
                  )}

                  {/* Live Visual WYSIWYG Editor & Preview Panel */}
                  {(editorMode === 'split' || editorMode === 'visual') && (
                    <div className="flex flex-col bg-white text-slate-900">
                      {editorMode === 'split' && (
                        <div className="bg-slate-100 px-3 py-1 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3 text-[#635bff]" /> Live Visual Editor (Type &amp; Format)
                          </span>
                          <span className="font-mono text-[9px] text-[#635bff] font-bold">interactive</span>
                        </div>
                      )}
                      <div
                        ref={visualEditorRef}
                        contentEditable={!simulateVariables}
                        onInput={handleVisualInput}
                        onBlur={handleVisualInput}
                        spellCheck={true}
                        className="w-full p-4 text-sm leading-relaxed h-64 overflow-y-auto focus:outline-none bg-white text-slate-900 border-none font-sans"
                        style={{ minHeight: '16rem' }}
                      />
                    </div>
                  )}
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

              {/* Real-Time Deliverability & Spam Keyword Analysis */}
              <SpamScoreMeter subject={subject} body={bodyHtml || bodyPlain} className="mt-2" />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-3 border-t border-border/60 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenTestModal()}
                className="rounded-lg h-9 text-xs font-bold gap-1.5 border-[#635bff]/40 text-[#635bff] hover:bg-[#635bff]/10 w-full sm:w-auto"
                title="Send a test email with the current draft content"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send Test Email</span>
              </Button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deliverability Test Email Modal */}
        <SendTestEmailModal
          isOpen={testModalOpen}
          onClose={() => setTestModalOpen(false)}
          type="template"
          templateId={testTargetTemplate?.id}
          templateName={testTargetTemplate?.name}
          subject={testTargetTemplate?.subject || ''}
          bodyHtml={testTargetTemplate?.body_html || ''}
          bodyPlain={testTargetTemplate?.body_plain || ''}
        />
      </div>
    </AppShell>
  );
}
