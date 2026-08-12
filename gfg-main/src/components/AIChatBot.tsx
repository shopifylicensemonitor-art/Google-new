import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, Send, X, Sparkles, Volume2, VolumeX, Search, RotateCcw, Loader2, User, Globe, ArrowRight, ExternalLink } from 'lucide-react';
import { api } from '@/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { title?: string; uri?: string }[];
  clientAction?: { action: string; page?: string };
  timestamp: string;
}

const STORAGE_KEY = 'peak_xender_ai_chat_history';

const COMMAND_ITEMS = [
  { trigger: '/overview', label: '📊 App Overview', desc: 'System status & key outreach metrics', prompt: 'Give me an overview of my application status and metrics' },
  { trigger: '/campaigns', label: '🚀 Active Campaigns', desc: 'List email campaigns & stats', prompt: 'List all my active campaigns and their performance' },
  { trigger: '/inbox', label: '🔥 Hot Leads & Replies', desc: 'Check unread replies & sentiments', prompt: 'Show me hot leads from inbox replies' },
  { trigger: '/accounts', label: '🛡️ Deliverability & Warmup', desc: 'View sending limits & warmup state', prompt: 'Check my sending accounts and deliverability health' },
  { trigger: '/prospects', label: '👥 Prospect Lists', desc: 'View contact lists & counts', prompt: 'Show my prospect contact lists and recipient counts' },
  { trigger: '/templates', label: '📝 Templates', desc: 'View or generate email copy templates', prompt: 'List my email templates' },
  { trigger: '/clear', label: '🧹 Clear Chat', desc: 'Reset conversation history', isClear: true },
];

const MENTION_ITEMS = [
  { trigger: '@campaigns', label: '@campaigns', desc: 'Include campaign context' },
  { trigger: '@prospects', label: '@prospects', desc: 'Include prospect contacts context' },
  { trigger: '@inbox', label: '@inbox', desc: 'Include inbox & lead context' },
  { trigger: '@accounts', label: '@accounts', desc: 'Include sending account health' },
  { trigger: '@templates', label: '@templates', desc: 'Include template context' },
];

export function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Load chat history from localStorage on initial render
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore parse errors
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content: 'Hello! I am your **Peak Xender AI Assistant** powered by Gemini. I can help you create campaigns, search inbox replies, check email deliverability, list prospects, or perform live web research across the app!\n\n💡 *Tip: Type `/` for commands or `@` to reference app data.*',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [showTriggerMenu, setShowTriggerMenu] = useState<'slash' | 'at' | null>(null);
  const [menuFilter, setMenuFilter] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save chat history to localStorage whenever messages state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore quota errors
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle Input typing and detect @ or /
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (val.startsWith('/')) {
      setShowTriggerMenu('slash');
      setMenuFilter(val.slice(1).toLowerCase());
    } else if (val.includes('@')) {
      const atMatch = val.match(/@(\w*)$/);
      if (atMatch) {
        setShowTriggerMenu('at');
        setMenuFilter(atMatch[1].toLowerCase());
      } else {
        setShowTriggerMenu(null);
      }
    } else {
      setShowTriggerMenu(null);
    }
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInput('');
    setIsLoading(true);

    try {
      if (useSearchGrounding) {
        // Use Google Search Grounding route
        const res = await api.aiSearchGrounding(userMsg.content);
        if (res.success) {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: res.text,
            sources: res.sources,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages(prev => [...prev, aiMsg]);
        }
      } else {
        // Multi-turn Chatbot with Function Calling and Page Context
        const chatHistory = [...messages, userMsg].map(m => ({
          role: m.role,
          content: m.content
        }));

        const res = await api.aiChat(chatHistory, undefined, location.pathname);
        if (res.success) {
          const aiMsg: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: res.reply,
            clientAction: res.clientAction,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          };
          setMessages(prev => [...prev, aiMsg]);

          // Handle automatic client actions like navigation
          if (res.clientAction?.action === 'navigate' && res.clientAction.page) {
            navigate(res.clientAction.page);
          }
        }
      }
    } catch (err: any) {
      let rawMsg = err.message || 'Failed to get response from Gemini AI.';
      if (rawMsg.includes('PERMISSION_DENIED') || rawMsg.includes('403')) {
        rawMsg = 'AI service permissions updated. Retrying standard assistant connection...';
      }
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I encountered a temporary issue connecting to the AI model. Please try asking your question again or use one of the quick action buttons below.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeechTTS = async (msgId: string, text: string) => {
    if (isPlayingAudio === msgId) {
      setIsPlayingAudio(null);
      return;
    }

    try {
      setIsPlayingAudio(msgId);
      const res = await api.aiTTS(text.replace(/[*#_`]/g, ''));
      if (res.success && res.audioBase64) {
        const audio = new Audio(`data:audio/wav;base64,${res.audioBase64}`);
        audio.onended = () => setIsPlayingAudio(null);
        audio.onerror = () => setIsPlayingAudio(null);
        await audio.play();
      } else {
        setIsPlayingAudio(null);
      }
    } catch {
      setIsPlayingAudio(null);
    }
  };

  const clearChat = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore quota errors
    }
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        content: 'Chat history cleared. How can I assist you with your email outreach today?\n\n💡 *Tip: Type `/` for commands or `@` to reference app data.*',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }
    ]);
  };

  const selectTriggerCommand = (item: typeof COMMAND_ITEMS[0]) => {
    setShowTriggerMenu(null);
    if (item.isClear) {
      clearChat();
      setInput('');
      return;
    }
    if (item.prompt) {
      handleSend(item.prompt);
      setInput('');
    }
  };

  const selectTriggerMention = (item: typeof MENTION_ITEMS[0]) => {
    setShowTriggerMenu(null);
    setInput(prev => {
      const updated = prev.replace(/@\w*$/, `${item.trigger} `);
      return updated;
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <>
      {/* Floating Widget Toggle Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-[90] flex items-center gap-2.5 p-3 sm:px-4 sm:py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 group border border-indigo-400/30"
          title="Open Gemini AI Assistant"
        >
          <div className="relative">
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse shrink-0" />
          </div>
          <span className="hidden sm:inline font-semibold text-sm tracking-wide">Gemini AI Assistant</span>
          <span className="hidden sm:flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-end p-2 sm:p-6 bg-slate-950/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card text-card-foreground border border-border shadow-2xl rounded-2xl w-full max-w-lg h-[88vh] sm:h-[650px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-4 border-b border-border bg-gradient-to-r from-indigo-950/80 to-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    Peak Xender AI
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-1.5 py-0.5 rounded-md font-medium">
                      Gemini 2.5
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground">Multi-turn email strategy assistant</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={clearChat}
                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                  title="Clear conversation"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-3 py-2 bg-muted/30 border-b border-border/50 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
              <span className="text-muted-foreground font-medium shrink-0 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Actions:
              </span>
              <button
                onClick={() => handleSend('Give me an overview of my application status and metrics')}
                className="shrink-0 px-2.5 py-1 bg-background hover:bg-muted border border-border/60 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                📊 App Overview
              </button>
              <button
                onClick={() => handleSend('List all my active campaigns and their performance')}
                className="shrink-0 px-2.5 py-1 bg-background hover:bg-muted border border-border/60 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                🚀 Active Campaigns
              </button>
              <button
                onClick={() => handleSend('Show me hot leads from inbox replies')}
                className="shrink-0 px-2.5 py-1 bg-background hover:bg-muted border border-border/60 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                🔥 Hot Leads
              </button>
              <button
                onClick={() => handleSend('Check my sending accounts and deliverability health')}
                className="shrink-0 px-2.5 py-1 bg-background hover:bg-muted border border-border/60 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                🛡️ Warmup Health
              </button>
              <button
                onClick={() => handleSend('Generate 3 high-converting cold email subject lines for B2B SaaS')}
                className="shrink-0 px-2.5 py-1 bg-background hover:bg-muted border border-border/60 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                A/B Subject Lines
              </button>
            </div>

            {/* Mode Switch Bar: Search Grounding Toggle */}
            <div className="px-4 py-2 bg-indigo-950/20 border-b border-indigo-500/10 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Globe className={`w-3.5 h-3.5 ${useSearchGrounding ? 'text-indigo-400' : ''}`} />
                Search Grounding (Live Web Data)
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useSearchGrounding}
                  onChange={(e) => setUseSearchGrounding(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Chat Thread Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {m.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed space-y-2 shadow-sm ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-muted/80 text-foreground border border-border/60 rounded-bl-none'
                  }`}>
                    <div className="whitespace-pre-wrap">{m.content}</div>

                    {/* Sources grounding badges */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/40 text-[11px] space-y-1">
                        <span className="font-semibold text-indigo-400 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Live Web Sources:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {m.sources.map((s, idx) => (
                            <a
                              key={idx}
                              href={s.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-background/80 hover:bg-background text-indigo-300 border border-indigo-500/20 truncate max-w-[200px]"
                            >
                              <Globe className="w-2.5 h-2.5 shrink-0" />
                              <span className="truncate">{s.title || s.uri}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer bar for assistant messages */}
                    {m.role === 'assistant' && (
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                        <span>{m.timestamp}</span>
                        <button
                          onClick={() => handleSpeechTTS(m.id, m.content)}
                          className="flex items-center gap-1 hover:text-indigo-400 transition-colors p-1 rounded"
                          title="Listen with Gemini Voice"
                        >
                          {isPlayingAudio === m.id ? (
                            <VolumeX className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                          <span>{isPlayingAudio === m.id ? 'Stop' : 'Listen'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {m.role === 'user' && (
                    <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-muted/80 text-foreground border border-border/60 rounded-2xl rounded-bl-none p-3.5 text-xs text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
                    Gemini AI is analyzing and writing...
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Autocomplete Trigger Menu Popup for / Commands & @ Mentions */}
            {showTriggerMenu && (
              <div className="mx-3 -mb-1 bg-card border border-border/80 shadow-xl rounded-xl p-1.5 space-y-1 animate-in slide-in-from-bottom-2 duration-150 z-50">
                <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider flex items-center justify-between border-b border-border/40">
                  <span>{showTriggerMenu === 'slash' ? 'Commands (/)' : 'App Context Tags (@)'}</span>
                  <span className="text-[9px] font-normal">Click or press Enter</span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {showTriggerMenu === 'slash' && (
                    COMMAND_ITEMS.filter(item => item.trigger.toLowerCase().includes(menuFilter) || item.label.toLowerCase().includes(menuFilter)).map(item => (
                      <button
                        key={item.trigger}
                        type="button"
                        onClick={() => selectTriggerCommand(item)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-indigo-600/10 hover:text-indigo-400 transition-colors group"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-indigo-400">{item.label}</span>
                          <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                        </div>
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground group-hover:bg-indigo-500/20 group-hover:text-indigo-300">
                          {item.trigger}
                        </span>
                      </button>
                    ))
                  )}

                  {showTriggerMenu === 'at' && (
                    MENTION_ITEMS.filter(item => item.trigger.toLowerCase().includes(menuFilter) || item.label.toLowerCase().includes(menuFilter)).map(item => (
                      <button
                        key={item.trigger}
                        type="button"
                        onClick={() => selectTriggerMention(item)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs hover:bg-indigo-600/10 hover:text-indigo-400 transition-colors group"
                      >
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground group-hover:text-indigo-400">{item.label}</span>
                          <span className="text-[10px] text-muted-foreground">{item.desc}</span>
                        </div>
                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground group-hover:bg-indigo-500/20 group-hover:text-indigo-300">
                          {item.trigger}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Input Form Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowTriggerMenu(null);
                handleSend();
              }}
              className="p-3 border-t border-border bg-card flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setShowTriggerMenu(null);
                }}
                placeholder={useSearchGrounding ? "Search web & personal insights..." : "Ask Gemini AI... (type / or @)"}
                disabled={isLoading}
                className="flex-1 bg-muted/60 border border-input rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-50 transition-colors shadow-md flex items-center justify-center"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
