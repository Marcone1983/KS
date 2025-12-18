// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Valori di design dal tema
const Spacing = {
  sm: 8,
  md: 16,
};

const BorderRadius = {
  md: 12,
};

const ThemeColors = {
  primaryGreen: '#2D7D46',
  gold: '#FFD700',
  red: '#DC2626', // Un rosso standard per la salute bassa
  darkBackground: '#1A1A2E',
  lightGray: '#4A4A6A', // Un grigio per lo sfondo della barra
};

// Assumendo che questi componenti esistano come specificato
// Se non esistono, questi sarebbero wrapper attorno a View e Text di React Native
const ThemedView = ({ style, children }) => <Animated.View style={style}>{children}</Animated.View>;

interface HealthBarProps {
  /**
   * La salute attuale della pianta, un valore da 0 a 100.
   */
  health: number;
  /**
   * Altezza della barra della salute. Default a 20.
   */
  height?: number;
}

const HealthBar: React.FC<HealthBarProps> = ({ health, height = 20 }) => {
  const healthValue = useSharedValue(health);
  const prevHealthRef = useRef(health);

  // Anima il valore della salute quando la prop cambia
  useEffect(() => {
    healthValue.value = withTiming(health, { duration: 500 });

    // Logica per il feedback haptic
    const prevHealth = prevHealthRef.current;
    if ((prevHealth > 70 && health <= 70) || (prevHealth > 30 && health <= 30)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    prevHealthRef.current = health;
  }, [health, healthValue]);

  const animatedBarStyle = useAnimatedStyle(() => {
    const clampedHealth = Math.max(0, Math.min(100, healthValue.value));

    const barColor = interpolateColor(
      clampedHealth,
      [0, 30, 70, 100],
      [ThemeColors.red, ThemeColors.red, ThemeColors.gold, ThemeColors.primaryGreen]
    );

    return {
      width: `${clampedHealth}%`,
      backgroundColor: barColor,
    };
  });

  return (
    <ThemedView style={[styles.container, { height, borderRadius: height / 2 }]}>
      <Animated.View style={[styles.bar, { borderRadius: height / 2 }, animatedBarStyle]} />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: ThemeColors.lightGray,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
  },
});

export default HealthBar;
