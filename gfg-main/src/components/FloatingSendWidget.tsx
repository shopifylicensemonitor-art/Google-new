import React, { useState, useEffect, useRef } from 'react';
import { Send, Zap, GripVertical, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const STORAGE_KEY = 'peak_send_widget_pos';

export function FloatingSendWidget() {
  const [counts, setCounts] = useState<{ total: number; pending: number }>({ total: 0, pending: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Position state with localStorage persistence
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
          const clampedX = Math.min(Math.max(10, parsed.x), window.innerWidth - 180);
          const clampedY = Math.min(Math.max(10, parsed.y), window.innerHeight - 60);
          return { x: clampedX, y: clampedY };
        }
      }
    } catch {
      // Ignore parse errors
    }
    // Default position: top right area near header
    return {
      x: typeof window !== 'undefined' ? Math.max(10, window.innerWidth - 200) : 20,
      y: 75,
    };
  });

  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Ensure position stays within viewport on resize
  useEffect(() => {
    const handleResize = () => {
      setPos(prev => ({
        x: Math.min(Math.max(10, prev.x), window.innerWidth - 180),
        y: Math.min(Math.max(10, prev.y), window.innerHeight - 60),
      }));
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen for email count updates from Index / GeneratedEmails
  useEffect(() => {
    const handleCountUpdate = (e: CustomEvent<{ total: number; pending: number }>) => {
      if (e.detail) {
        setCounts({
          total: e.detail.total || 0,
          pending: e.detail.pending || 0,
        });
      }
    };

    window.addEventListener('peak_email_count_update' as any, handleCountUpdate);
    return () => window.removeEventListener('peak_email_count_update' as any, handleCountUpdate);
  }, []);

  // Pointer drag event handlers (Mouse + Touch)
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    hasMoved.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    initialPos.current = { ...pos };
    if (e.currentTarget.setPointerCapture) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // Fallback for pointer capture
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved.current = true;
    }
    const newX = Math.min(Math.max(10, initialPos.current.x + dx), window.innerWidth - 180);
    const newY = Math.min(Math.max(10, initialPos.current.y + dy), window.innerHeight - 60);
    setPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
    } catch {
      // Ignore quota errors
    }
    if (!hasMoved.current) {
      // Trigger direct send action
      triggerDirectSend();
    }
  };

  const triggerDirectSend = () => {
    window.dispatchEvent(new CustomEvent('peak_trigger_direct_send'));
  };

  return (
    <div
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      className="fixed z-[95] touch-none select-none animate-in fade-in duration-300"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="group relative flex items-center gap-2 px-3 py-2 bg-slate-900/90 dark:bg-card/90 text-white dark:text-foreground border border-emerald-500/40 dark:border-emerald-500/30 rounded-full shadow-2xl backdrop-blur-md hover:border-emerald-400 hover:shadow-emerald-500/20 transition-all duration-200 cursor-grab active:cursor-grabbing"
        title="Send Current List (Drag to move anywhere)"
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0" />
        
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shrink-0">
            <Send className="w-3.5 h-3.5 animate-pulse" />
          </div>

          <div className="flex flex-col -space-y-0.5 pr-1">
            <span className="text-[11px] font-bold tracking-tight text-white dark:text-foreground flex items-center gap-1">
              Send Current
              <ArrowUpRight className="w-3 h-3 text-emerald-400 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
            </span>
            <span className="text-[9px] font-semibold text-emerald-400 uppercase tracking-wider">
              {counts.pending > 0 ? `${counts.pending} Pending` : counts.total > 0 ? 'All Sent' : 'Ready'}
            </span>
          </div>

          {counts.pending > 0 && (
            <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-extrabold text-slate-950 shadow-sm animate-pulse">
              {counts.pending}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
