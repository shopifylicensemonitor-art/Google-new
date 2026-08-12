/**
 * Peak Xender Consolidated Helper Utilities
 * Centralized helpers for template interpolation, CSV parsing, domain extraction, and UI formatters.
 */

/**
 * Interpolates email template text replacing single brace {var} or legacy double brace {{var}} placeholders.
 */
export function interpolateTemplate(
  template: string,
  data: {
    email?: string;
    fields?: Record<string, any>;
    name?: string;
    store_name?: string;
    brand?: string;
    niche?: string;
    pain_point?: string;
    [key: string]: any;
  },
  fallbackBrand: string = 'YourBrand'
): string {
  if (!template) return '';

  const email = data.email || '';
  const emailParts = email.split('@');
  const localPart = emailParts[0] || '';
  const domainPart = emailParts[1] || '';

  // Extract store name from domain part (e.g. "acme.com" => "Acme")
  const rawDomainName = domainPart.split('.')[0] || '';
  const computedStoreName = rawDomainName ? rawDomainName.charAt(0).toUpperCase() + rawDomainName.slice(1) : 'Store';

  // Extract first name from local part (e.g. "john.doe" => "John")
  const rawLocalName = localPart.split('.')[0] || localPart.split('_')[0] || localPart;
  const computedFirstName = rawLocalName ? rawLocalName.charAt(0).toUpperCase() + rawLocalName.slice(1) : 'Friend';

  const fields = data.fields || {};

  const resolveVar = (key: string): string => {
    const normKey = key.trim().toLowerCase().replace(/\s+/g, '_');

    // Built-in mapped variables
    if (normKey === 'email') return email;
    if (normKey === 'name' || normKey === 'first_name' || normKey === 'firstname') {
      return data.name || fields.first_name || fields.name || computedFirstName;
    }
    if (normKey === 'store' || normKey === 'store_name' || normKey === 'storename') {
      return data.store_name || fields.store_name || fields.store || computedStoreName;
    }
    if (normKey === 'brand') {
      return data.brand || fields.brand || fallbackBrand;
    }
    if (normKey === 'niche') {
      return data.niche || fields.niche || 'ecommerce';
    }
    if (normKey === 'pain_point' || normKey === 'painpoint') {
      return data.pain_point || fields.pain_point || 'customer acquisition';
    }
    if (normKey === 'sname') {
      return fields.sname || computedStoreName;
    }
    if (normKey === 'date') {
      return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Direct object keys lookup
    if (data[key] !== undefined && data[key] !== null) return String(data[key]);
    if (data[normKey] !== undefined && data[normKey] !== null) return String(data[normKey]);

    // Fields map lookup
    if (fields[key] !== undefined && fields[key] !== null) return String(fields[key]);
    if (fields[normKey] !== undefined && fields[normKey] !== null) return String(fields[normKey]);

    // Case-insensitive search inside fields
    const foundKey = Object.keys(fields).find(k => k.trim().toLowerCase().replace(/\s+/g, '_') === normKey);
    if (foundKey && fields[foundKey] !== undefined && fields[foundKey] !== null) {
      return String(fields[foundKey]);
    }

    return '';
  };

  // Replace double brace {{var}} first, then single brace {var}
  return template
    .replace(/\{\{([^{}]+)\}\}/g, (_, key) => resolveVar(key))
    .replace(/\{([a-zA-Z0-9_\-\s]+)\}/g, (_, key) => resolveVar(key));
}

/**
 * Extracts available single brace variable tags from list headers or field keys.
 */
export function extractDynamicTokens(headersOrFields: string[]): { tag: string; raw: string }[] {
  if (!headersOrFields || headersOrFields.length === 0) {
    return [
      { tag: '{first_name}', raw: 'first_name' },
      { tag: '{store_name}', raw: 'store_name' },
      { tag: '{niche}', raw: 'niche' },
      { tag: '{pain_point}', raw: 'pain_point' },
      { tag: '{brand}', raw: 'brand' }
    ];
  }

  const ignored = new Set(['email', 'skip', 'id', 'created_at', 'status', 'updated_at']);
  const tags: { tag: string; raw: string }[] = [];

  headersOrFields.forEach(header => {
    const raw = header.trim();
    const cleanKey = raw.toLowerCase().replace(/\s+/g, '_');
    if (!ignored.has(cleanKey) && !tags.some(t => t.tag === `{${cleanKey}}`)) {
      tags.push({ tag: `{${cleanKey}}`, raw });
    }
  });

  if (!tags.some(t => t.tag === '{brand}')) {
    tags.push({ tag: '{brand}', raw: 'brand' });
  }

  return tags;
}

/**
 * Cleanly extracts domain from email address.
 */
export function getDomainFromEmail(email: string): string {
  if (!email || !email.includes('@')) return '';
  return email.split('@')[1].toLowerCase().trim();
}

/**
 * Gets a clean display name from email or provided name.
 */
export function getDisplayNameFromEmail(email: string, explicitName?: string): string {
  if (explicitName && explicitName.trim() !== '') return explicitName.trim();
  if (!email || !email.includes('@')) return 'Contact';
  const local = email.split('@')[0];
  const namePart = local.split('.')[0].split('_')[0].split('+')[0];
  return namePart.charAt(0).toUpperCase() + namePart.slice(1);
}

/**
 * Sanitizes header name for single-brace templates.
 */
export function cleanHeaderName(header: string): string {
  return header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

/**
 * Calculates delivery queue health percentage.
 */
export function calculateQueueHealth(sent: number, failed: number): number {
  const total = sent + failed;
  if (total <= 0) return 100;
  return Math.round((sent / total) * 100);
}

/**
 * Formats ISO date string to user-friendly local date.
 */
export function formatDateDisplay(dateStr?: string | Date): string {
  if (!dateStr) return 'N/A';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
