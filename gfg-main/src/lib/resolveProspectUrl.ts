import type { EmailEntry } from '@/hooks/useEmailList';
import { PUBLIC_PROVIDERS } from '@/lib/publicProviders';

/**
 * Resolve a prospect's website URL from an email entry's fields.
 * Falls back to the email domain when no explicit URL is available
 * and the domain is not a public email provider.
 */
export function resolveProspectUrl(entry: EmailEntry): string {
  const fields = entry.fields || {};
  let rawUrl = fields.store_url || fields.domain_url || fields.website || fields.domain || fields.store_name || '';

  if (rawUrl && !rawUrl.includes('.') && !rawUrl.startsWith('http')) {
    rawUrl = '';
  }

  if (!rawUrl) {
    const firstEmail = entry.email.split(',')[0].trim();
    const domain = firstEmail.split('@')[1]?.toLowerCase();
    if (domain && !PUBLIC_PROVIDERS.has(domain)) {
      rawUrl = domain;
    }
  }

  if (!rawUrl) return '';

  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}
