import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export type HapticPattern = 
  | 'tap'
  | 'doubleTap'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection'
  | 'impact_light'
  | 'impact_medium'
  | 'impact_heavy'
  | 'spray_start'
  | 'spray_hit'
  | 'pest_death'
  | 'coin_collect'
  | 'level_up'
  | 'achievement'
  | 'purchase'
  | 'craft_complete'
  | 'breed_complete'
  | 'button_press'
  | 'toggle'
  | 'slider_tick'
  | 'countdown'
  | 'explosion';

interface HapticConfig {
  enabled: boolean;
  intensity: 'low' | 'medium' | 'high';
}

const defaultConfig: HapticConfig = {
  enabled: true,
  intensity: 'medium',
};

export function useHaptics(config: Partial<HapticConfig> = {}) {
  const { enabled, intensity } = { ...defaultConfig, ...config };

  const getImpactStyle = useCallback(() => {
    switch (intensity) {
      case 'low': return Haptics.ImpactFeedbackStyle.Light;
      case 'high': return Haptics.ImpactFeedbackStyle.Heavy;
      default: return Haptics.ImpactFeedbackStyle.Medium;
    }
  }, [intensity]);

  const trigger = useCallback(async (pattern: HapticPattern) => {
    if (!enabled || Platform.OS === 'web') return;

    try {
      switch (pattern) {
        case 'tap':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case 'doubleTap':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 100);
          break;

        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;

        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;

        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;

        case 'selection':
          await Haptics.selectionAsync();
          break;

        case 'impact_light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case 'impact_medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;

        case 'impact_heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;

        case 'spray_start':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;

        case 'spray_hit':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case 'pest_death':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 80);
          break;

        case 'coin_collect':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTimeout(() => Haptics.selectionAsync(), 50);
          break;

        case 'level_up':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 400);
          break;

        case 'achievement':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 150);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 300);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 450);
          break;

        case 'purchase':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 150);
          break;

        case 'craft_complete':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
          setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 250);
          break;

        case 'breed_complete':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
          setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
          break;

        case 'button_press':
          await Haptics.impactAsync(getImpactStyle());
          break;

        case 'toggle':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case 'slider_tick':
          await Haptics.selectionAsync();
          break;

        case 'countdown':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;

        case 'explosion':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 50);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), 100);
          setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light), 150);
          break;

        default:
          await Haptics.impactAsync(getImpactStyle());
      }
    } catch (error) {
      console.warn('Haptic feedback failed:', error
);
    }
  }, [enabled, getImpactStyle]);

  // Convenience methods
  const tap = useCallback(() => trigger('tap'), [trigger]);
  const success = useCallback(() => trigger('success'), [trigger]);
  const error = useCallback(() => trigger('error'), [trigger]);
  const warning = useCallback(() => trigger('warning'), [trigger]);
  const selection = useCallback(() => trigger('selection'), [trigger]);

  return {
    trigger,
    tap,
    success,
    error,
    warning,
    selection,
    enabled,
  };
}

export default useHaptics;
