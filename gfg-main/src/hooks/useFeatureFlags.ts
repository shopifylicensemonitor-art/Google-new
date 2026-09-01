import { useContext } from 'react';
import { FeatureFlagsContext } from '../context/FeaturesContext';

export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext);

  if (!context) {
    return {
      flags: {},
      isLoading: false,
      isEnabled: () => false,
      refresh: async () => ({}),
    };
  }

  return context;
}
