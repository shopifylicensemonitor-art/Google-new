import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/hooks/use-toast';

export interface ShortcutItem {
  keyCombo: string;
  description: string;
  category: 'Navigation' | 'Actions' | 'View';
}

export const SHORTCUTS_LIST: ShortcutItem[] = [
  { keyCombo: 'Alt + D  or  g d', description: 'Navigate to Analytics Dashboard', category: 'Navigation' },
  { keyCombo: 'Alt + C  or  g c', description: 'Navigate to Campaigns Scheduler', category: 'Navigation' },
  { keyCombo: 'Alt + I  or  g i', description: 'Navigate to Unified Inbox', category: 'Navigation' },
  { keyCombo: 'Alt + S  or  g s', description: 'Navigate to Direct Send', category: 'Navigation' },
  { keyCombo: 'Alt + T  or  g t', description: 'Navigate to Email Templates', category: 'Navigation' },
  { keyCombo: 'Alt + L  or  g l', description: 'Navigate to Prospects & Leads', category: 'Navigation' },
  { keyCombo: 'Alt + A  or  g a', description: 'Navigate to Mailbox Accounts & Warmup', category: 'Navigation' },
  { keyCombo: 'Alt + M', description: 'Toggle Light / Dark Mode', category: 'Actions' },
  { keyCombo: 'Shift + ?  or  Alt + H', description: 'Show Keyboard Shortcuts Cheat Sheet', category: 'View' },
];

export function useHotkeys() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggleTheme, theme } = useTheme();
  const [shortcutsOpen, setShortcutsOpen] = useState<boolean>(false);
  const [pendingG, setPendingG] = useState<boolean>(false);

  // Helper to detect if user is typing in form control
  const isEditingText = (e: KeyboardEvent): boolean => {
    const target = e.target as HTMLElement | null;
    if (!target) return false;
    const tagName = target.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') return true;
    if (target.isContentEditable) return true;
    return false;
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // If user is inside an input/textarea, allow standard typing unless Ctrl/Alt combo is used
    const inInput = isEditingText(e);

    // Toggle Keyboard Shortcuts Help Modal: Shift + ? or Alt + H
    if ((e.key === '?' && !inInput) || (e.altKey && (e.key === 'h' || e.key === 'H'))) {
      e.preventDefault();
      setShortcutsOpen(prev => !prev);
      return;
    }

    // Toggle Theme: Alt + M
    if (e.altKey && (e.key === 'm' || e.key === 'M')) {
      e.preventDefault();
      toggleTheme();
      toast({
        title: theme === 'dark' ? '☀️ Switched to Light Theme' : '🌙 Switched to Dark Theme',
        description: 'Theme preference saved in localStorage.'
      });
      return;
    }

    // Alt Modifier Navigation
    if (e.altKey) {
      const key = e.key.toLowerCase();
      let targetPath: string | null = null;
      let targetName: string | null = null;

      switch (key) {
        case 'd':
          targetPath = '/dashboard';
          targetName = 'Analytics Dashboard';
          break;
        case 'c':
          targetPath = '/campaigns';
          targetName = 'Campaigns';
          break;
        case 'i':
          targetPath = '/inbox';
          targetName = 'Inbox';
          break;
        case 's':
          targetPath = '/send';
          targetName = 'Direct Send';
          break;
        case 't':
          targetPath = '/templates';
          targetName = 'Templates';
          break;
        case 'l':
          targetPath = '/contacts';
          targetName = 'Prospects';
          break;
        case 'a':
          targetPath = '/accounts';
          targetName = 'Mailbox Accounts';
          break;
        default:
          break;
      }

      if (targetPath) {
        e.preventDefault();
        if (location.pathname !== targetPath) {
          navigate(targetPath);
          toast({
            title: `Navigated to ${targetName}`,
            description: `Shortcut triggered via Alt + ${key.toUpperCase()}`
          });
        }
        return;
      }
    }

    // Sequence Hotkeys: 'g' then 'd'/'c'/'i' etc (when not in input)
    if (!inInput) {
      const key = e.key.toLowerCase();

      if (key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setPendingG(true);
        // Timeout after 1.2s
        setTimeout(() => setPendingG(false), 1200);
        return;
      }

      if (pendingG) {
        setPendingG(false);
        let targetPath: string | null = null;
        let targetName: string | null = null;

        switch (key) {
          case 'd':
            targetPath = '/dashboard';
            targetName = 'Analytics Dashboard';
            break;
          case 'c':
            targetPath = '/campaigns';
            targetName = 'Campaigns';
            break;
          case 'i':
            targetPath = '/inbox';
            targetName = 'Inbox';
            break;
          case 's':
            targetPath = '/send';
            targetName = 'Direct Send';
            break;
          case 't':
            targetPath = '/templates';
            targetName = 'Templates';
            break;
          case 'l':
            targetPath = '/contacts';
            targetName = 'Prospects';
            break;
          case 'a':
            targetPath = '/accounts';
            targetName = 'Mailbox Accounts';
            break;
          default:
            break;
        }

        if (targetPath) {
          e.preventDefault();
          if (location.pathname !== targetPath) {
            navigate(targetPath);
            toast({
              title: `Navigated to ${targetName}`,
              description: `Shortcut triggered via g + ${key}`
            });
          }
        }
      }
    }
  }, [pendingG, location.pathname, navigate, toggleTheme, theme]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcutsOpen,
    setShortcutsOpen,
    toggleShortcuts: () => setShortcutsOpen(prev => !prev),
  };
}
