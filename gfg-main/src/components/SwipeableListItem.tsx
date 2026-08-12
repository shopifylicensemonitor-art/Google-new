import React, { useState, useRef } from 'react';
import { Trash2, Archive, Check } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface SwipeableListItemProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftLabel?: string;
  leftIcon?: React.ReactNode;
  rightLabel?: string;
  rightIcon?: React.ReactNode;
  className?: string;
}

export function SwipeableListItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftLabel = 'Archive',
  leftIcon = <Archive className="w-4 h-4" />,
  rightLabel = 'Delete',
  rightIcon = <Trash2 className="w-4 h-4" />,
  className = '',
}: SwipeableListItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isHorizontalRef = useRef<boolean | null>(null);

  const SWIPE_THRESHOLD = 80;

  const thresholdReachedRef = useRef<boolean>(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isHorizontalRef.current = null;
    thresholdReachedRef.current = false;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const dx = e.touches[0].clientX - touchStartRef.current;
    const dy = e.touches[0].clientY - touchStartYRef.current;

    // Determine lock direction on initial movement
    if (isHorizontalRef.current === null) {
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
        isHorizontalRef.current = true;
      } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 5) {
        isHorizontalRef.current = false;
      }
    }

    if (isHorizontalRef.current === true) {
      // Prevent default vertical scroll when swiping horizontally
      if (e.cancelable) e.preventDefault();

      // Trigger selection haptic once when crossing threshold
      if (Math.abs(dx) >= SWIPE_THRESHOLD && !thresholdReachedRef.current) {
        thresholdReachedRef.current = true;
        triggerHaptic.selection();
      } else if (Math.abs(dx) < SWIPE_THRESHOLD && thresholdReachedRef.current) {
        thresholdReachedRef.current = false;
      }

      // Resistance dampening
      if ((dx > 0 && !onSwipeRight) || (dx < 0 && !onSwipeLeft)) {
        setOffsetX(dx * 0.2);
      } else {
        const clamped = Math.min(Math.max(dx, -140), 140);
        setOffsetX(clamped);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (offsetX <= -SWIPE_THRESHOLD && onSwipeLeft) {
      triggerHaptic.impactMedium();
      onSwipeLeft();
    } else if (offsetX >= SWIPE_THRESHOLD && onSwipeRight) {
      triggerHaptic.impactMedium();
      onSwipeRight();
    }
    setOffsetX(0);
    isHorizontalRef.current = null;
    thresholdReachedRef.current = false;
  };

  return (
    <div className={`relative overflow-hidden rounded-xl group ${className}`}>
      {/* Background Action Panels Revealed on Swipe */}
      <div className="absolute inset-0 flex justify-between items-center px-4 rounded-xl text-white select-none pointer-events-auto">
        {/* Left Action (Revealed when swiping right) */}
        <div
          onClick={() => {
            if (onSwipeRight) {
              onSwipeRight();
              setOffsetX(0);
            }
          }}
          className={`flex items-center gap-2 h-full px-4 rounded-l-xl bg-indigo-600 text-white font-bold text-xs transition-opacity cursor-pointer ${
            offsetX > 20 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {leftIcon}
          <span>{leftLabel}</span>
        </div>

        {/* Right Action (Revealed when swiping left) */}
        <div
          onClick={() => {
            if (onSwipeLeft) {
              onSwipeLeft();
              setOffsetX(0);
            }
          }}
          className={`flex items-center gap-2 h-full px-4 rounded-r-xl bg-rose-600 text-white font-bold text-xs ml-auto transition-opacity cursor-pointer ${
            offsetX < -20 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span>{rightLabel}</span>
          {rightIcon}
        </div>
      </div>

      {/* Foreground List Item Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative z-10 bg-card rounded-xl border border-border/60 shadow-2xs"
      >
        {children}
      </div>
    </div>
  );
}
