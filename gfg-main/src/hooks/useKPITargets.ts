import { useState, useCallback } from 'react';

export interface KPITargets {
  dailyGoal: number;          // Target emails sent per day (e.g. 250)
  targetOpenRate: number;     // Target open rate % (e.g. 45.0)
  targetClickRate: number;    // Target click rate % (e.g. 8.0)
  targetReplyRate: number;    // Target reply rate % (e.g. 5.0)
  maxBounceRate: number;      // Maximum acceptable bounce rate % (e.g. 3.0)
  minDelaySeconds: number;    // Minimum delay between sends in seconds (e.g. 30)
  maxDelaySeconds: number;    // Maximum delay between sends in seconds (e.g. 90)
}

export const DEFAULT_KPI_TARGETS: KPITargets = {
  dailyGoal: 250,
  targetOpenRate: 45.0,
  targetClickRate: 8.0,
  targetReplyRate: 5.0,
  maxBounceRate: 3.0,
  minDelaySeconds: 30,
  maxDelaySeconds: 90,
};

const STORAGE_KEY = 'peakx_kpi_targets';

export function useKPITargets() {
  const [targets, setTargetsState] = useState<KPITargets>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_KPI_TARGETS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load KPI targets from localStorage', e);
    }
    return DEFAULT_KPI_TARGETS;
  });

  const updateTargets = useCallback((newTargets: Partial<KPITargets>) => {
    setTargetsState(prev => {
      const updated = { ...prev, ...newTargets };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save KPI targets to localStorage', e);
      }
      return updated;
    });
  }, []);

  const resetTargets = useCallback(() => {
    setTargetsState(DEFAULT_KPI_TARGETS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to reset KPI targets', e);
    }
  }, []);

  return {
    targets,
    updateTargets,
    resetTargets,
  };
}
