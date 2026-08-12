import React, { useState, useEffect, useRef } from 'react';
import { api, type Template } from '../api';
import { AppShell } from '@/components/AppShell';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, Trash2, Edit, Copy, Eye, Sparkles, FileText, Search, 
  MoreVertical, Check, RefreshCw, X, Save, Clock, ArrowUpRight, Code
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

interface TemplatesProps {
  requirePin?: (label: string, action: () => void) => void;
}

const defaultHtml = `<h2 style="color:#151c27;font-family:sans-serif;margin-top:0;">Hi {{first_name}},</h2>
<p style="color:#464555;font-family:sans-serif;line-height:1.6;">I noticed that your team at <strong>{{company_name}}</strong> is scaling rapidly. Often, fast-growing teams struggle with maintaining clean outreach data.</p>
<p style="color:#464555;font-family:sans-serif;line-height:1.6;">We built a platform specifically to solve deliverability and automated follow-ups without manual overhead.</p>
<div style="margin:24px 0;">
  <a href="https://example.com" style="display:inline-block;padding:12px 24px;background-color:#635bff;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-family:sans-serif;">Book 15-Min Demo</a>
</div>
<p style="color:#777587;font-size:12px;font-family:sans-serif;">Best regards,<br/>Alex Miller</p>`;

const defaultPlain = `Hi {{first_name}},\n\nI noticed that your team at {{company_name}} is scaling rapidly. Often, fast-growing teams struggle with maintaining clean outreach data.\n\nWe built a platform specifically to solve deliverability and automated follow-ups without manual overhead.\n\nBest regards,\nAlex Miller`;

// Mock initial category tags and stats for enhanced visual representation
const TEMPLATE_CATEGORIES = ['All Templates', 'Cold Outreach', 'Follow-up', 'Networking', 'Welcome Series'];

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
  const [aiLoading, setAiLoading] = useState<boolean>(false);

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
    setSubject('Quick question regarding {{company_name}}\'s tech stack');
    setBodyHtml(defaultHtml);
    setBodyPlain(defaultPlain);
    setEditingTemplate(null);
    setShowModal(true);
  };

  const handleOpenEdit = (t: Template) => {
    setName(t.name);
    setCategory('Cold Outreach');
    setSubject(t.subject);
    setBodyHtml(t.body_html || '');
    setBodyPlain(t.body_plain || '');
    setEditingTemplate(t);
    setShowModal(true);
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

  const handleAiImprove = async () => {
    if (!bodyHtml && !subject) return;
    try {
      setAiLoading(true);
      toast({
        title: 'Generating AI Optimizations...',
        description: 'Polishing subject line and persuasive call to action.'
      });
      const res = await api.aiRewrite({
        subject,
        body: bodyHtml || bodyPlain,
        instruction: 'Make this cold outreach email concise, punchy, and highly converting with a clear call to action.'
      });
      if (res.success) {
        if (res.subject) setSubject(res.subject);
        if (res.body_html) setBodyHtml(res.body_html);
        toast({
          title: 'AI Polish Complete!',
          description: 'Subject line and body updated.'
        });
      }
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'AI Generator Error',
        description: e.message || 'Could not connect to AI service.'
      });
    } finally {
      setAiLoading(false);
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

          <Button
            onClick={handleOpenNew}
            className="h-10 px-5 text-xs font-semibold gap-2 bg-[#635bff] hover:bg-[#493ee5] text-white shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </header>

        {/* Search & Category Filter Bar */}
        <div className="bg-card rounded-xl border border-border/60 p-3 flex flex-col md:flex-row gap-3 items-center justify-between shadow-2xs">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search templates by name or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-4 rounded-lg border border-border/60 bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#635bff] transition-all"
            />
          </div>

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
            <p className="text-muted-foreground">Create reusable outreach content with dynamic tags like {"{{first_name}}"} and {"{{company_name}}"}.</p>
            <Button
              onClick={handleOpenNew}
              className="mt-2 text-xs font-semibold bg-[#635bff] text-white hover:bg-[#493ee5]"
            >
              Create First Template
            </Button>
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
            <DialogTitle className="font-heading text-lg font-bold text-foreground flex items-center justify-between">
              <span>{editingTemplate ? 'Edit Template' : 'Create New Template'}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAiImprove}
                disabled={aiLoading}
                className="h-8 px-2.5 text-xs font-bold gap-1.5 text-[#635bff] hover:bg-[#635bff]/10"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{aiLoading ? 'Polishing...' : 'AI Polish'}</span>
              </Button>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Design email layouts with dynamic tag variables like {"{{first_name}}"} and {"{{company_name}}"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto pr-1 text-xs">
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

            {/* Plain Text Fallback */}
            <div className="space-y-1">
              <label className="font-bold text-foreground">
                Plain-Text Fallback (Spam Guard Backup)
              </label>
              <textarea
                value={bodyPlain}
                onChange={(e) => setBodyPlain(e.target.value)}
                placeholder="Enter plain text fallback version..."
                className="w-full bg-background text-xs rounded-xl border border-border/80 p-3 min-h-[70px] focus:outline-none focus:ring-1 focus:ring-[#635bff] leading-relaxed"
              />
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
