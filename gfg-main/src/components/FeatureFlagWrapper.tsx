import type { ComponentType, ReactNode } from 'react';

import { useFeatureFlags } from '../hooks/useFeatureFlags';

interface FeatureFlagWrapperProps {
  flagName: string | string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function FeatureFlagWrapper({ flagName, fallback = null, children }: FeatureFlagWrapperProps) {
  const { isEnabled } = useFeatureFlags();
  const flags = Array.isArray(flagName) ? flagName : [flagName];
  const isAllowed = flags.some((flag) => isEnabled(flag));

  return isAllowed ? <>{children}</> : <>{fallback}</>;
}

export function withFeatureFlag<P extends object>(flagName: string | string[], fallback?: ReactNode) {
  return function FeatureGate(Component: ComponentType<P>) {
    return function WrappedComponent(props: P) {
      const { isEnabled } = useFeatureFlags();
      const flags = Array.isArray(flagName) ? flagName : [flagName];

      if (!flags.some((flag) => isEnabled(flag))) {
        return fallback ? <>{fallback}</> : null;
      }

      return <Component {...props} />;
    };
  };
}

export default FeatureFlagWrapper;
