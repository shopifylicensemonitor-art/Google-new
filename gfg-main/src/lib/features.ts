export const FEATURE_FLAG_DEFAULTS = {
  'new-three-pane-layout': false,
  'keyboard-shortcuts': false,
  'automation-rules': false,
  'workspace-management': false,
  'shared-inbox': false,
  delegation: false,
  'advanced-filters': false,
} as const;

export type FeatureFlagName = keyof typeof FEATURE_FLAG_DEFAULTS;
export type FeatureFlagMap = Record<FeatureFlagName, boolean>;

export function normalizeFeatureFlagName(name: string | undefined | null): string {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, '-');
}

export function buildDefaultFeatureFlagMap(): FeatureFlagMap {
  return Object.fromEntries(
    Object.entries(FEATURE_FLAG_DEFAULTS).map(([key, value]) => [normalizeFeatureFlagName(key), Boolean(value)])
  ) as FeatureFlagMap;
}

export function normalizeFeatureFlags(flags: Array<{ name?: string; enabled?: boolean; default_enabled?: boolean }> = []) {
  const defaults = buildDefaultFeatureFlagMap();
  return flags.reduce((acc, flag) => {
    const name = normalizeFeatureFlagName(flag?.name || '');
    if (!name) return acc;
    acc[name] = Boolean(flag?.enabled ?? flag?.default_enabled ?? defaults[name] ?? false);
    return acc;
  }, { ...defaults });
}

export function isFeatureEnabled(featureFlags: Record<string, unknown> | null | undefined, flagName: string): boolean {
  const normalized = normalizeFeatureFlagName(flagName);
  if (!normalized || !featureFlags) return false;
  return Boolean(featureFlags[normalized]);
}

export function getFeatureFlagValue(featureFlags: Record<string, unknown> | null | undefined, flagName: string, fallback = false): boolean {
  return isFeatureEnabled(featureFlags, flagName) || fallback;
}
