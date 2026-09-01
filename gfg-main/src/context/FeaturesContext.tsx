import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { buildDefaultFeatureFlagMap, normalizeFeatureFlagName } from '../lib/features';

interface FeatureFlagsContextValue {
  flags: Record<string, boolean>;
  isLoading: boolean;
  isEnabled: (flagName: string) => boolean;
  refresh: () => Promise<Record<string, boolean>>;
}

export const FeatureFlagsContext = createContext<FeatureFlagsContextValue | undefined>(undefined);

function readCachedFlags(): Record<string, boolean> {
  try {
    const cached = localStorage.getItem('feature_flags');
    if (!cached) {
      return buildDefaultFeatureFlagMap();
    }
    const parsed = JSON.parse(cached);
    return { ...buildDefaultFeatureFlagMap(), ...parsed };
  } catch {
    return buildDefaultFeatureFlagMap();
  }
}

export function FeaturesProvider({ children }: { children: React.ReactNode }) {
  const [flags, setFlags] = useState<Record<string, boolean>>(readCachedFlags);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    const defaults = buildDefaultFeatureFlagMap();

    if (!token) {
      setFlags(defaults);
      setIsLoading(false);
      localStorage.setItem('feature_flags', JSON.stringify(defaults));
      return defaults;
    }

    try {
      const response = await fetch('/api/features', {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load feature flags');
      }

      const payload = await response.json();
      const nextFlags = payload?.flags?.reduce((acc: Record<string, boolean>, flag: { name?: string; enabled?: boolean; default_enabled?: boolean }) => {
        const normalized = normalizeFeatureFlagName(flag?.name || '');
        if (!normalized) return acc;
        acc[normalized] = Boolean(flag?.enabled ?? flag?.default_enabled ?? false);
        return acc;
      }, { ...defaults }) || defaults;

      setFlags(nextFlags);
      localStorage.setItem('feature_flags', JSON.stringify(nextFlags));
      return nextFlags;
    } catch (error) {
      console.warn('Feature flags could not be loaded. Falling back to defaults.', error);
      const fallback = readCachedFlags();
      setFlags(fallback);
      localStorage.setItem('feature_flags', JSON.stringify(fallback));
      return fallback;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo<FeatureFlagsContextValue>(() => ({
    flags,
    isLoading,
    isEnabled: (flagName: string) => Boolean(flags[normalizeFeatureFlagName(flagName)]),
    refresh,
  }), [flags, isLoading, refresh]);

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export default FeaturesProvider;
