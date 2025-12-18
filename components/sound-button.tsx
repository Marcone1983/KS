/**
 * SoundButton - Pressable con feedback audio
 */

import React, { useCallback } from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSounds } from '@/hooks/use-sounds';

interface SoundButtonProps extends PressableProps {
  soundType?: 'light' | 'heavy' | 'back' | 'success' | 'error' | 'none';
  hapticType?: 'light' | 'medium' | 'heavy' | 'none';
}

export function SoundButton({
  soundType = 'light',
  hapticType = 'light',
  onPress,
  children,
  ...props
}: SoundButtonProps) {
  const { play } = useSounds();

  const handlePress = useCallback((event: any) => {
    // Play sound
    if (soundType !== 'none') {
      switch (soundType) {
        case 'light':
          play('ui_tap_light');
          break;
        case 'heavy':
          play('ui_tap_heavy');
          break;
        case 'back':
          play('ui_back');
          break;
        case 'success':
          play('ui_success');
          break;
        case 'error':
          play('ui_error');
          break;
      }
    }

    // Haptic feedback
    if (hapticType !== 'none') {
      switch (hapticType) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    }

    // Call original onPress
    onPress?.(event);
  }, [soundType, hapticType, onPress, play]);

  return (
    <Pressable onPress={handlePress} {...props}>
      {children}
    </Pressable>
  );
}

export default SoundButton;
