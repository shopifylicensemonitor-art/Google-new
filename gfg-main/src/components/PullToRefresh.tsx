import React, { useState, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<any>;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function PullToRefresh({ onRefresh, children, disabled = false, className = '' }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartRef = useRef<number>(0);
  const isPullingRef = useRef<boolean>(false);

  const PULL_THRESHOLD = 65;
  const MAX_PULL = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    if (window.scrollY <= 5) {
      touchStartRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current || disabled || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const dy = currentY - touchStartRef.current;

    if (dy > 0 && window.scrollY <= 5) {
      const distance = Math.min(Math.pow(dy, 0.82), MAX_PULL);
      if (distance >= PULL_THRESHOLD && pullDistance < PULL_THRESHOLD) {
        triggerHaptic.selection();
      }
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = async () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistance >= PULL_THRESHOLD && !isRefreshing) {
      triggerHaptic.impactMedium();
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD);
      try {
        await onRefresh();
        triggerHaptic.successNotification();
      } catch (err) {
        console.error('Pull to refresh failed:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative min-h-full ${className}`}
    >
      {/* Pull Indicator Banner */}
      {(pullDistance > 0 || isRefreshing) && (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out text-xs font-semibold text-muted-foreground select-none py-1"
          style={{
            height: `${isRefreshing ? PULL_THRESHOLD : pullDistance}px`,
            opacity: isRefreshing ? 1 : Math.min(pullDistance / PULL_THRESHOLD, 1),
          }}
        >
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-border shadow-md backdrop-blur-md">
            <RefreshCw
              className={`w-4 h-4 text-[#635bff] ${isRefreshing ? 'animate-spin' : ''}`}
              style={{
                transform: isRefreshing ? undefined : `rotate(${Math.min(pullDistance * 4, 360)}deg)`,
              }}
            />
            <span className="text-foreground">
              {isRefreshing
                ? 'Refreshing content...'
                : pullDistance >= PULL_THRESHOLD
                ? 'Release to refresh'
                : 'Pull down to refresh'}
            </span>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
