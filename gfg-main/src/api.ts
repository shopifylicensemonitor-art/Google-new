/**
 * api.ts — Type-safe API client for Peak Xender server connection.
 *
 * Automatically handles dev vs prod baseUrl selection, sets the security PIN
 * headers from sessionStorage, and processes JSON responses.
 */

const getApiBaseUrl = () => {
  // Explicit override always wins.
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  // Otherwise call the API same-origin. In dev, Vite proxies /api to the
  // backend on port 3000 (see vite.config.ts), which avoids CORS and works
  // on hosted preview domains where port 3000 is not reachable.
  return '';
};

export const BASE_URL = getApiBaseUrl();

// ---------------------------------------------------------------------------
// TypeScript Interfaces
// ---------------------------------------------------------------------------

export interface Account {
  id: number;
  email: string;
  status: 'active' | 'paused';
  daily_sent: number;
  daily_limit?: number;
  last_reset: string | null;
  display_name: string;
  type: 'oauth' | 'smtp';
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_secure: number | null;
  warmup_enabled?: boolean | number;
  warmup_daily_target?: number;
  created_at: string;
}

export interface Domain {
  id: number;
  domain: string;
  status: 'pending' | 'verified' | 'partial' | 'failed';
  spf_record: string;
  dkim_selector: string;
  dkim_public_key: string;
  dkim_record: string;
  dkim_host: string;
  dmarc_record: string;
  dmarc_host: string;
  spf_host: string;
  custom_tracking_domain: string | null;
  tracking_host: string;
  tracking_target: string;
  tracking_status: 'pending' | 'verified';
  mx_verified: number;
  created_at: string;
}

export interface Contact {
  id: number;
  list_name: string;
  email: string;
  fields?: Record<string, string>;
  created_at: string;
  status?: 'pending' | 'queued' | 'sending' | 'sent' | 'failed';
  campaign_name?: string;
  sent_at?: string;
  error?: string;
}

export interface ContactListInfo {
  list_name: string;
  count: number;
}

export interface CampaignStep {
  id?: number;
  campaign_id?: number;
  step_number: number;
  subject: string;
  body_html: string;
  body_plain: string;
  delay_seconds: number;
  trigger_event?: string;
}

export interface CampaignRecipient {
  recipient_email: string;
  status: 'active' | 'replied' | 'unsubscribed' | 'completed';
  current_step: number;
  last_sent_at: string | null;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  body_plain: string;
  contact_list: string;
  delay_seconds: number;
  start_time: string;
  end_time: string;
  status: 'draft' | 'sending' | 'paused' | 'completed';
  total_contacts: number;
  sent_count: number;
  failed_count: number;
  content_variations: string | null;
  content_mode: 'single' | 'rotation';
  ignore_window?: number;
  timezone?: string;
  account_ids?: string | number[];
  target_limit?: number;
  target_range_start?: number;
  target_range_end?: number;
  exclude_previously_contacted?: number | boolean;
  custom_filters?: string | { field: string; operator: string; value: string }[];
  format_type?: 'html' | 'plain';
  timing_mode?: 'smart' | 'fixed' | 'stealth' | 'burst' | 'custom';
  min_delay?: number;
  max_delay?: number;
  cooldown_enabled?: number | boolean;
  cooldown_batch_size?: number;
  cooldown_duration_minutes?: number;
  created_at: string;
  queue_stats?: {
    pending?: number;
    sent?: number;
    failed?: number;
    sending?: number;
  };
  total_opens?: number;
  total_clicks?: number;
  steps?: CampaignStep[];
}

export interface QueueItem {
  id: number;
  campaign_id: number;
  recipient_email: string;
  account_id: number | null;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  scheduled_at: string;
  sent_at: string | null;
  error: string | null;
}

export interface QueueStats {
  total: number;
  pending: number;
  sent: number;
  failed: number;
  sending: number;
}

export interface LogItem {
  id: number;
  campaign_id: number | null;
  account_id: number | null;
  recipient_email: string | null;
  status: string;
  message: string;
  created_at: string;
  queue_id?: number | null;
  sender_email?: string;
  campaign_name?: string;
  final_subject?: string;
  final_body?: string;
  error_message?: string;
}

export interface Template {
  id: number;
  name: string;
  subject: string;
  body_html: string;
  body_plain: string;
  created_at: string;
}

export interface AIConfig {
  configured: boolean;
  provider?: string;
  baseUrl?: string;
  model?: string;
  maskedApiKey?: string;
  apiKey?: string;
  isActive?: boolean;
}

export interface AIProviderConfig {
  id?: number;
  provider: string;
  baseUrl: string;
  model: string;
  isActive: boolean;
  hasKey: boolean;
  maskedApiKey: string;
  apiKey: string;
  updatedAt?: string;
}

export interface AIConfigsResponse {
  success: boolean;
  configs: AIProviderConfig[];
  activeProvider: string | null;
  activeConfig: AIProviderConfig | null;
}

export interface AIRules {
  knowledge?: string;
  initial?: string;
  followup_1?: string;
  followup_2?: string;
  objection?: string;
}

export interface InboxMessage {
  id: number;
  account_id: number | null;
  account_email: string | null;
  sender_email: string;
  recipient_email: string;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  sentiment: 'hot_lead' | 'unsubscribe' | 'question' | 'neutral' | 'sent';
  is_read: number;
  is_starred?: number;
  starred_at?: string | null;
  status?: string;
  message_id?: string | null;
  thread_id?: string | null;
  created_at: string;
  contact_list?: string;
  contact_fields?: Record<string, string>;
  store_url?: string;
  store_name?: string;
}

export interface InboxCounts {
  all: number;
  unread: number;
  primary: number;
  interested: number;
  questions: number;
  opted_out: number;
  starred: number;
  by_account: {
    account_id: number;
    account_email: string;
    display_name: string;
    account_status: string;
    count: number;
    unread_count: number;
  }[];
}

// ---------------------------------------------------------------------------
// Base Fetch Wrapper
// ---------------------------------------------------------------------------

import { navigateToRoute } from './lib/router';

/** Clear expired token and redirect to login page */
function handleAuthError() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
  // Only redirect if not already on login or landing page
  const path = window.location.pathname;
  if (path !== '/login' && path !== '/') {
    navigateToRoute('/login', { replace: true });
  }
}

let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        throw new Error('Refresh failed');
      }
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
        return data.token;
      }
      return null;
    } catch {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  
  // Set default headers
  const headers = new Headers(options.headers || {});
  
  // Add JSON content type if sending body
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Inject JWT Bearer token from localStorage if present
  const token = localStorage.getItem('auth_token');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Inject PIN fallback header from sessionStorage if present (used in local/dev)
  const pin = sessionStorage.getItem('access_pin');
  if (pin && !headers.has('X-Access-Pin')) {
    headers.set('X-Access-Pin', pin);
  }

  let res = await fetch(url, { ...options, headers });

  // Handle 401: attempt silent refresh if we haven't already refreshed for this call
  if (res.status === 401 && endpoint !== '/api/auth/signin' && endpoint !== '/api/auth/refresh') {
    const newToken = await attemptTokenRefresh();
    if (newToken) {
      headers.set('Authorization', `Bearer ${newToken}`);
      res = await fetch(url, { ...options, headers });
    }
  }

  // Global 401 handler: token expired or invalid → clear & redirect
  if (res.status === 401) {
    handleAuthError();
    let errMsg = 'Session expired. Please log in again.';
    try {
      const errBody = await res.json();
      if (errBody.message || errBody.error) {
        errMsg = errBody.message || errBody.error;
      }
    } catch {
      // Ignore parsing error
    }
    throw new Error(errMsg);
  }
  
  if (!res.ok) {
    let errMsg = `API Error: ${res.statusText} (${res.status})`;
    try {
      const errBody = await res.json();
      if (errBody.message || errBody.error) {
        errMsg = errBody.message || errBody.error;
      }
    } catch {
      // Ignore parsing error
    }
    throw new Error(errMsg);
  }

  // Handle empty or redirect responses if needed
  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// API Methods
// ---------------------------------------------------------------------------

export const api = {
  // Auth
  verifyPin: async (pin: string): Promise<boolean> => {
    try {
      const res = await fetch(`${BASE_URL}/api/auth/pin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      if (data?.token) localStorage.setItem('auth_token', data.token);
      return true;
    } catch {
      return false;
    }
  },

  // Accounts
  getDashboardData: (days: number = 7) => apiFetch<{
    stats: {
      today_sent: number;
      active_accounts: number;
      pending: number;
      active_campaigns: number;
      failed: number;
    };
    campaigns: Campaign[];
    queue: {
      id: number;
      recipient_email: string;
      campaign_name: string | null;
      account_email: string | null;
      status: string;
    }[];
    chartData: { date: string; sent: number; failed: number }[];
  }>(`/api/dashboard?days=${days}`),
  getAccounts: () => apiFetch<Account[]>('/api/accounts'),
  getAuthUrl: () => apiFetch<{ url: string }>('/api/accounts/auth-url', { method: 'POST' }),
  deleteAccount: (id: number) => apiFetch<{ success: boolean }>(`/api/accounts/${id}`, { method: 'DELETE' }),
  testAccount: (id: number, to: string) => apiFetch<{ success: boolean; message: string }>(`/api/accounts/${id}/test`, {
    method: 'POST',
    body: JSON.stringify({ to })
  }),
  resetAccount: (id: number, resetCode?: string) => apiFetch<{ success: boolean; message?: string }>(`/api/accounts/${id}/reset`, {
    method: 'POST',
    body: JSON.stringify({ reset_code: resetCode })
  }),
  pauseAccount: (id: number) => apiFetch<{ success: boolean }>(`/api/accounts/${id}/pause`, { method: 'POST' }),
  resumeAccount: (id: number) => apiFetch<{ success: boolean }>(`/api/accounts/${id}/resume`, { method: 'POST' }),
  updateAccountLimit: (id: number, dailyLimit: number) => apiFetch<{ success: boolean; daily_limit?: number; message?: string }>(`/api/accounts/${id}/daily-limit`, {
    method: 'PUT',
    body: JSON.stringify({ daily_limit: dailyLimit })
  }),
  updateAccount: (id: number, data: { display_name?: string; daily_limit?: number }) => apiFetch<{ success: boolean; message?: string }>(`/api/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  updateDisplayName: (id: number, displayName: string) => apiFetch<{ success: boolean }>(`/api/accounts/${id}/display-name`, {
    method: 'PUT',
    body: JSON.stringify({ display_name: displayName })
  }),
  getResetCodeStatus: () => apiFetch<{ configured: boolean }>('/api/auth/reset-code'),
  setResetCode: (resetCode: string) => apiFetch<{ success: boolean; message?: string }>('/api/auth/reset-code', {
    method: 'POST',
    body: JSON.stringify({ reset_code: resetCode })
  }),
  checkDnsHealth: (id: number) => apiFetch<{
    success: boolean;
    domain: string;
    score: number;
    spf: { valid: boolean; record: string | null };
    dkim: { valid: boolean; selector: string | null; record: string | null };
    dmarc: { valid: boolean; record: string | null };
    mx: { valid: boolean; records: string[] };
    issues: string[];
    status: 'healthy' | 'warning' | 'critical';
    checked_at: string;
  }>(`/api/accounts/${id}/dns-check`),
  toggleWarmup: (id: number, dailyTarget?: number) => apiFetch<{
    success: boolean;
    warmup_enabled: boolean;
    warmup_daily_target: number;
    message: string;
  }>(`/api/accounts/${id}/warmup-toggle`, {
    method: 'POST',
    body: JSON.stringify({ daily_target: dailyTarget || 40 })
  }),
  getWarmupStatus: (id: number) => apiFetch<{
    account_id: number;
    email: string;
    warmup_enabled: boolean;
    daily_target: number;
    warmup_sent_today: number;
    peer_replies_received: number;
    inbox_save_rate: number;
    reputation_score: number;
    status_label: string;
  }>(`/api/accounts/${id}/warmup-status`),
  connectSmtp: (data: {
    email: string;
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_pass: string;
    smtp_secure: boolean;
    display_name?: string;
  }) => apiFetch<{ success: boolean; message: string }>('/api/accounts/smtp', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  sendDirectEmail: (data: {
    account_id?: number | null;
    to: string;
    subject?: string;
    html_body?: string;
    text_body?: string;
  }) => apiFetch<{ success: boolean; message: string }>('/api/accounts/send-direct', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Campaigns
  getCampaigns: () => apiFetch<Campaign[]>('/api/campaigns'),
  /** Create campaign from CSV data (emails, subjects, HTML template) and return campaign ID */
  createCampaignFromCsv: (data: {
    name: string;
    subjects: string[];
    recipients: { email: string; [key: string]: string }[];
    html_template: string;
    account_id?: number | null;
    delay_seconds?: number;
    start_time?: string;
    end_time?: string;
  }) => apiFetch<{ success: boolean; campaign_id: number; message: string }>('/api/campaigns/create-from-csv', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getCampaign: (id: number) => apiFetch<Campaign>(`/api/campaigns/${id}`),
  createCampaign: (data: Partial<Campaign>) => apiFetch<{ success: boolean; id: number }>('/api/campaigns', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateCampaign: (id: number, data: Partial<Campaign>) => apiFetch<{ success: boolean }>(`/api/campaigns/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteCampaign: (id: number) => apiFetch<{ success: boolean; message?: string }>(`/api/campaigns/${id}`, {
    method: 'DELETE'
  }),
  duplicateCampaign: (id: number) => apiFetch<{ success: boolean; campaign_id: number; message: string }>(`/api/campaigns/${id}/duplicate`, {
    method: 'POST'
  }),
  launchCampaign: (id: number, options?: { account_ids?: number[]; custom_filters?: any[]; target_limit?: number; target_range_start?: number; target_range_end?: number; exclude_previously_contacted?: boolean | number; recipients?: any[]; contacts?: any[] }) => apiFetch<{ success: boolean; message: string; processing_started?: boolean; processing_error?: string; recipients_count?: number; accounts_count?: number }>(`/api/campaigns/${id}/launch`, {
    method: 'POST',
    body: options ? JSON.stringify(options) : undefined
  }),
  retryProcessing: (id: number) => apiFetch<{ success: boolean; processing_started?: boolean; processing_error?: string }>(`/api/campaigns/${id}/retry-processing`, { method: 'POST' }),
  retryAll: (id: number, opts?: { max_iterations?: number; max_seconds?: number }) => apiFetch<{ success: boolean; processed_count?: number; remaining_pending?: number; iterations?: number; processing_error?: string }>(`/api/campaigns/${id}/retry-all`, { method: 'POST', body: JSON.stringify(opts || {}) }),
  pauseCampaign: (id: number) => apiFetch<{ success: boolean }>(`/api/campaigns/${id}/pause`, { method: 'POST' }),
  resumeCampaign: (id: number) => apiFetch<{ success: boolean }>(`/api/campaigns/${id}/resume`, { method: 'POST' }),
  previewCampaign: (id: number, count?: number, step?: number) => apiFetch<{
    subject: string;
    body_html: string;
    recipient_email: string;
    sender_email: string | null;
  }[]>(`/api/campaigns/${id}/preview?${count ? `count=${count}&` : ''}${step ? `step=${step}` : ''}`),
  getCampaignRecipients: (id: number) => apiFetch<CampaignRecipient[]>(`/api/campaigns/${id}/recipients`),
  updateCampaignRecipientStatus: (id: number, email: string, status: string) => apiFetch<{ success: boolean }>(`/api/campaigns/${id}/recipients/status`, {
    method: 'POST',
    body: JSON.stringify({ email, status })
  }),

  // Contacts
  getContactLists: () => apiFetch<ContactListInfo[]>('/api/contacts/lists'),
  getContactHistory: (email: string) => apiFetch<{
    sends: (QueueItem & { campaign_name?: string })[];
    logs: LogItem[];
    replies: { id: number; sender_email: string; recipient_email: string; subject: string; body_text: string; sentiment: string; created_at: string }[];
  }>(`/api/contacts/history/${encodeURIComponent(email)}`),
  getContacts: (listName: string, limit?: number, offset?: number) => {
    const params = [];
    if (limit !== undefined) params.push(`limit=${limit}`);
    if (offset !== undefined) params.push(`offset=${offset}`);
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return apiFetch<Contact[]>(`/api/contacts/${encodeURIComponent(listName)}${query}`);
  },
  uploadContacts: (listName: string, file: File) => {
    const formData = new FormData();
    formData.append('list_name', listName);
    formData.append('file', file);
    return apiFetch<{ success: boolean; added: number; skipped: number; total: number }>('/api/contacts/upload', {
      method: 'POST',
      body: formData
    });
  },
  importBulkContacts: (listName: string, contacts: { email: string; fields?: Record<string, string> }[]) => {
    return apiFetch<{ success: boolean; added: number; skipped: number; total: number }>('/api/contacts/import-bulk', {
      method: 'POST',
      body: JSON.stringify({ list_name: listName, contacts })
    });
  },
  addContact: (listName: string, email: string) => apiFetch<{ success: boolean; id: number }>('/api/contacts', {
    method: 'POST',
    body: JSON.stringify({ list_name: listName, email })
  }),
  deleteContactList: (listName: string) => apiFetch<{ success: boolean; deleted: number }>(`/api/contacts/${encodeURIComponent(listName)}`, {
    method: 'DELETE'
  }),
  deleteContact: (listName: string, id: number) => apiFetch<{ success: boolean }>(`/api/contacts/${encodeURIComponent(listName)}/${id}`, {
    method: 'DELETE'
  }),
  syncContacts: () => apiFetch<{ success: boolean; syncedCampaigns: number; newlyQueuedContacts: number }>('/api/contacts/sync', {
    method: 'POST'
  }),

  // Queue & Logs
  getQueueItems: (campaignId: number, status?: string) => {
    const query = status ? `?status=${status}` : '';
    return apiFetch<QueueItem[]>(`/api/queue/${campaignId}${query}`);
  },
  getQueueStats: (campaignId: number) => apiFetch<QueueStats>(`/api/queue/${campaignId}/stats`),
  getRecentLogs: async (limit?: number): Promise<LogItem[]> => {
    try {
      const query = limit ? `?limit=${limit}` : '';
      return await apiFetch<LogItem[]>(`/api/queue/logs/recent${query}`);
    } catch {
      return [];
    }
  },

  // Templates
  getTemplates: () => apiFetch<Template[]>('/api/templates'),
  getTemplate: (id: number) => apiFetch<Template>(`/api/templates/${id}`),
  createTemplate: (data: Partial<Template>) => apiFetch<{ success: boolean; id: number }>('/api/templates', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateTemplate: (id: number, data: Partial<Template>) => apiFetch<{ success: boolean }>(`/api/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteTemplate: (id: number) => apiFetch<{ success: boolean }>(`/api/templates/${id}`, { method: 'DELETE' }),

  // Device/IP state persistence
  getDeviceState: (deviceId: string) => apiFetch<{
    emailText?: string;
    subject?: string;
    body?: string;
    userName?: string;
    cc?: string;
    bcc?: string;
    myInboxTo?: string;
    ccRoutingMode?: 'reroute' | 'normal';
    enableRandomization?: boolean;
    bccBatchSize?: number;
    bccBatchOpenCount?: number;
    autoScroll?: boolean;
    goalInput?: string;
    alarmIntervalStep?: string;
    csvMappings?: Record<string, string>;
    uploadedFileName?: string;
    parsedCSV?: any;
    activeVariables?: string[];
  } | null>(`/api/contacts/state/retrieve?device_id=${encodeURIComponent(deviceId)}`),
  
  saveDeviceState: (deviceId: string, stateData: any) => apiFetch<{ success: boolean }>('/api/contacts/state/save', {
    method: 'POST',
    body: JSON.stringify({ device_id: deviceId, state_data: stateData })
  }),

  // Auth
  getLoginUrl: () => apiFetch<{ url: string }>('/api/auth/google-url'),
  getCurrentUser: () => apiFetch<{ id: number; email: string; name: string; role: string; picture?: string }>('/api/auth/me'),
  updateProfile: (name: string, picture?: string) => apiFetch<{ success: boolean; message: string }>('/api/auth/profile', {
    method: 'POST',
    body: JSON.stringify({ name, picture: picture || '' }),
  }),
  changePassword: (data: { currentPassword?: string; newPassword: string }) => apiFetch<{ success: boolean; message: string }>('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getSettings: () => apiFetch<{
    ADMIN_EMAIL: string;
    TRACKING_BASE_URL: string;
    SCHEDULER_BATCH_SIZE: string;
    DAILY_LIMIT_DEFAULT: string;
    SCHEDULER_ENABLED: string;
  }>('/api/auth/settings'),
  updateSettings: (settings: {
    ADMIN_EMAIL?: string;
    TRACKING_BASE_URL?: string;
    SCHEDULER_BATCH_SIZE?: string;
    DAILY_LIMIT_DEFAULT?: string;
  }) => apiFetch<{ success: boolean; message: string }>('/api/auth/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),
  logout: () => {
    localStorage.removeItem('auth_token');
    sessionStorage.removeItem('access_pin');
    return Promise.resolve({ success: true });
  },

  // AI Integration
  getAIConfig: () => apiFetch<AIConfig>('/api/ai/config'),
  getAIConfigs: () => apiFetch<AIConfigsResponse>('/api/ai/configs'),
  saveAIConfig: (data: { provider: string; apiKey?: string; baseUrl?: string; model?: string; setActive?: boolean }) => apiFetch<{ success: boolean; message: string; provider: string; model: string; isActive?: boolean }>('/api/ai/config', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  setActiveAIProvider: (provider: string) => apiFetch<{ success: boolean; message: string; provider: string }>('/api/ai/active', {
    method: 'POST',
    body: JSON.stringify({ provider })
  }),
  deleteAIConfig: (provider: string) => apiFetch<{ success: boolean; message: string }>(`/api/ai/config/${encodeURIComponent(provider)}`, {
    method: 'DELETE'
  }),
  testAIConnection: (data?: { provider?: string; apiKey?: string; baseUrl?: string; model?: string }) => apiFetch<{ success: boolean; response?: string; error?: string }>('/api/ai/test', {
    method: 'POST',
    body: JSON.stringify(data || {})
  }),
  validateAllAIKeys: () => apiFetch<{ success: boolean; results: Record<string, { valid: boolean; status: string; latencyMs?: number; model?: string; message?: string; error?: string }> }>('/api/ai/validate-all', {
    method: 'POST'
  }),
  getAIRules: () => apiFetch<AIRules>('/api/ai/rules'),
  saveAIRules: (rules: AIRules) => apiFetch<{ success: boolean; message: string }>('/api/ai/rules', {
    method: 'POST',
    body: JSON.stringify({ rules })
  }),
  aiGenerate: (data: { prompt: string; stage?: string; contactFields?: Record<string, string> }) => apiFetch<{ success: boolean; subject: string; body_html: string }>('/api/ai/generate', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  aiRewrite: (data: { subject?: string; body: string; instruction?: string }) => apiFetch<{ success: boolean; subject: string; body_html: string }>('/api/ai/rewrite', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  aiSpintax: (text: string) => apiFetch<{ success: boolean; spintax: string }>('/api/ai/spintax', {
    method: 'POST',
    body: JSON.stringify({ text })
  }),
  aiSubjects: (body: string, count?: number) => apiFetch<{ success: boolean; subjects: string[] }>('/api/ai/subjects', {
    method: 'POST',
    body: JSON.stringify({ body, count })
  }),
  aiReplyDraft: (data: { incomingSubject?: string; incomingBody: string; senderEmail: string; contactFields?: Record<string, string> }) => apiFetch<{ success: boolean; replyDraft: string }>('/api/ai/reply-draft', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  aiChat: (messages: { role: 'user' | 'assistant' | 'system'; content: string }[], systemInstruction?: string, currentPage?: string) => apiFetch<{ success: boolean; reply: string; clientAction?: { action: string; page?: string } }>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ messages, systemInstruction, currentPage })
  }),
  aiSearchGrounding: (query: string, topic?: string) => apiFetch<{ success: boolean; text: string; sources: { title?: string; uri?: string }[] }>('/api/ai/search-grounding', {
    method: 'POST',
    body: JSON.stringify({ query, topic })
  }),
  aiTTS: (text: string, voice?: string) => apiFetch<{ success: boolean; audioBase64: string }>('/api/ai/tts', {
    method: 'POST',
    body: JSON.stringify({ text, voice })
  }),

  // Inbox & Two-Way Receiving
  getInboxCounts: () => apiFetch<InboxCounts>('/api/inbox/counts'),
  getInboxMessages: (params?: { limit?: number; account_id?: number | string; sentiment?: string; starred?: boolean; read?: 'unread' | 'read' | 'all'; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.account_id && params.account_id !== 'all') query.set('account_id', String(params.account_id));
    if (params?.sentiment && params.sentiment !== 'all') query.set('sentiment', params.sentiment);
    if (params?.starred) query.set('starred', '1');
    if (params?.read && params.read !== 'all') query.set('read', params.read);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString();
    return apiFetch<InboxMessage[]>(`/api/inbox${qs ? `?${qs}` : ''}`);
  },
  syncInbox: () => apiFetch<{ success: boolean; message: string; newMessages?: number; syncedAccounts?: number }>('/api/inbox/sync', { method: 'POST' }),
  markInboxRead: (id: number) => apiFetch<{ success: boolean }>(`/api/inbox/${id}/read`, { method: 'POST' }),
  starInboxMessage: (id: number) => apiFetch<{ success: boolean; is_starred: number }>(`/api/inbox/${id}/star`, { method: 'POST' }),
  deleteInboxMessage: (id: number) => apiFetch<{ success: boolean; message: string }>(`/api/inbox/${id}`, { method: 'DELETE' }),
  bulkInboxAction: (ids: number[], action: 'mark_read' | 'mark_unread' | 'star' | 'unstar' | 'delete') => apiFetch<{ success: boolean; count: number; action: string }>('/api/inbox/bulk', {
    method: 'POST',
    body: JSON.stringify({ ids, action })
  }),
  getInboxThread: (id: number) => apiFetch<{ thread: InboxMessage[]; outbound_history: any[]; contact_email: string }>(`/api/inbox/thread/${id}`),
  replyToInboxMessage: (id: number, replyBody: string, replySubject?: string) => apiFetch<{ success: boolean; message: string }>(`/api/inbox/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ replyBody, replySubject })
  }),

  // Custom Sender Domains & EMSP DNS Management
  getDomains: () => apiFetch<{ domains: Domain[] }>('/api/domains'),
  createDomain: (data: { domain: string; custom_tracking_domain?: string; dkim_selector?: string }) => apiFetch<{
    success: boolean;
    domain_id: number;
    domain: string;
    status: string;
    dns_instructions: any;
  }>('/api/domains', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  verifyDomain: (id: number) => apiFetch<{
    success: boolean;
    domain: string;
    status: string;
    is_fully_verified: boolean;
    verification: {
      spf: { valid: boolean; record: string | null; message: string };
      dkim: { valid: boolean; record: string | null; message: string };
      dmarc: { valid: boolean; record: string | null; message: string };
      mx: { valid: boolean; records: string[]; message: string };
      tracking: { valid: boolean; target: string | null; message: string };
    };
  }>(`/api/domains/${id}/verify`, { method: 'POST' }),
  updateTrackingDomain: (id: number, customTrackingDomain: string) => apiFetch<{ success: boolean; custom_tracking_domain: string }>(`/api/domains/${id}/tracking`, {
    method: 'PUT',
    body: JSON.stringify({ custom_tracking_domain: customTrackingDomain })
  }),
  deleteDomain: (id: number) => apiFetch<{ success: boolean; message: string }>(`/api/domains/${id}`, { method: 'DELETE' }),

  // Master Suppression & Do-Not-Contact List
  getSuppressionList: (q?: string, type?: string) => apiFetch<{ items: { id: number; type: string; value: string; reason: string; created_at: string }[] }>(`/api/suppression${q || type ? `?${q ? `q=${encodeURIComponent(q)}&` : ''}${type ? `type=${type}` : ''}` : ''}`),
  getSuppressionStats: () => apiFetch<{ total: number; emails: number; domains: number }>('/api/suppression/stats'),
  addSuppression: (data: { value: string; type?: 'email' | 'domain'; reason?: string }) => apiFetch<{ success: boolean; message: string }>('/api/suppression', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  bulkAddSuppression: (data: { entries: string[] | string; defaultReason?: string }) => apiFetch<{ success: boolean; message: string; addedCount: number; skippedCount: number }>('/api/suppression/bulk', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  deleteSuppression: (id: number) => apiFetch<{ success: boolean; message: string }>(`/api/suppression/${id}`, {
    method: 'DELETE'
  }),

  // Background Dispatch Worker Controls
  getWorkerStatus: () => apiFetch<{
    active: boolean;
    interval: string;
    lastTickAt: string | null;
    activeCampaigns: number;
    pendingQueue: number;
    mode: string;
  }>('/api/queue/worker/status'),
  triggerWorker: () => apiFetch<{ success: boolean; message: string }>('/api/queue/worker/trigger', {
    method: 'POST'
  }),

  // Persistent In-App Notifications
  getNotifications: (limit = 20) => apiFetch<{
    items: { id: number; user_id: number; type: string; title: string; message: string; is_read: number; created_at: string }[];
    unread_count: number;
  }>(`/api/notifications?limit=${limit}`),
  markNotificationRead: (id: number) => apiFetch<{ success: boolean; message: string }>(`/api/notifications/${id}/read`, { method: 'POST' }),
  markAllNotificationsRead: () => apiFetch<{ success: boolean; message: string }>('/api/notifications/read-all', { method: 'POST' }),
  deleteNotification: (id: number) => apiFetch<{ success: boolean; message: string }>(`/api/notifications/${id}`, { method: 'DELETE' }),
  clearAllNotifications: () => apiFetch<{ success: boolean; message: string }>('/api/notifications/clear-all', { method: 'DELETE' }),
};
