import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

export const triggerHaptic = {
  // Light impact for subtle button presses & taps
  impactLight: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    }
  },

  // Medium impact for standard button actions & menu triggers
  impactMedium: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }
  },

  // Heavy impact for major actions or deletions
  impactHeavy: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(40);
      }
    }
  },

  // Selection change feedback for swipe steps or list selection
  selection: async () => {
    try {
      await Haptics.selectionStart();
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(5);
      }
    }
  },

  // Notification haptic on campaign completion or send success
  successNotification: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([30, 50, 30]);
      }
    }
  },

  // Notification haptic on warnings or errors
  errorNotification: async () => {
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  },
};
