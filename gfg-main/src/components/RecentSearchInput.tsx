import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, X } from 'lucide-react';

interface RecentSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  containerClassName?: string;
  storageKey: string;
  iconClassName?: string;
}

export function RecentSearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  containerClassName = "relative",
  storageKey,
  iconClassName = "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60"
}: RecentSearchInputProps) {
  const [history, setHistory] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to parse search history:", e);
    }
  }, [storageKey]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveSearch = (searchVal: string) => {
    const trimmed = searchVal.trim();
    if (!trimmed) return;
    setHistory(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const newHistory = [trimmed, ...filtered].slice(0, 8); // Keep top 8
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // Auto-save search query after user stops typing for 1.5s
  useEffect(() => {
    if (!value.trim()) return;
    const timeout = setTimeout(() => {
      saveSearch(value);
    }, 1500);
    return () => clearTimeout(timeout);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      saveSearch(value);
      setIsOpen(false);
    }
  };

  const removeHistoryItem = (e: React.MouseEvent, itemToRemove: string) => {
    e.stopPropagation();
    setHistory(prev => {
      const newHistory = prev.filter(item => item !== itemToRemove);
      localStorage.setItem(storageKey, JSON.stringify(newHistory));
      return newHistory;
    });
  };

  return (
    <div className={containerClassName} ref={containerRef}>
      <Search className={iconClassName} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className={className}
      />

      {isOpen && history.length > 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-card border border-border/60 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-2 border-b border-border/40 bg-muted/30 text-[10px] uppercase font-bold text-muted-foreground flex justify-between items-center">
            <span>Recent Searches</span>
            <button 
              onClick={(e) => {
                e.preventDefault();
                setHistory([]);
                localStorage.removeItem(storageKey);
              }}
              className="hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {history.map((item, i) => (
              <li 
                key={i}
                className="px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/50 cursor-pointer transition-colors group"
                onClick={() => {
                  onChange(item);
                  setIsOpen(false);
                  saveSearch(item);
                }}
              >
                <div className="flex items-center gap-2 text-foreground truncate">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="truncate">{item}</span>
                </div>
                <button
                  onClick={(e) => removeHistoryItem(e, item)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-rose-500 transition-all focus:opacity-100"
                  aria-label="Remove recent search"
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
