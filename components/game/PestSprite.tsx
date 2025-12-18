// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';

// Placeholder for custom components as their implementation is not provided
const ThemedView = ({ children, style }) => <Animated.View style={style}>{children}</Animated.View>;
const IconSymbol = ({ name, style }) => <Animated.Text style={style}>{name.charAt(0).toUpperCase()}</Animated.Text>;

// --- Constants ---
const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
};

const Colors = {
  primaryGreen: '#2D7D46',
  gold: '#FFD700',
  darkBackground: '#1A1A2E',
};

// --- Types ---
export type PestType = 'aphid' | 'spider' | 'caterpillar';

interface PestSpriteProps {
  type: PestType;
  id: string; // Unique identifier for the pest instance
}

const PEST_CONFIG = {
  aphid: {
    icon: 'bug',
    color: Colors.primaryGreen,
    size: 30,
  },
  spider: {
    icon: 'spider',
    color: '#8B0000', // DarkRed for spiders
    size: 40,
  },
  caterpillar: {
    icon: 'leaf',
    color: '#6B8E23', // OliveDrab for caterpillars
    size: 35,
  },
};

const PestSprite: React.FC<PestSpriteProps> = ({ type }) => {
  const moveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Trigger haptic feedback on mount
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const randomDuration = Math.random() * 2000 + 1500; // 1.5s to 3.5s
    const randomDistance = Math.random() * 20 + 10; // 10 to 30 pixels

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(moveAnim, {
          toValue: randomDistance,
          duration: randomDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim, {
          toValue: 0,
          duration: randomDuration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(moveAnim, {
            toValue: -randomDistance,
            duration: randomDuration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        Animated.timing(moveAnim, {
            toValue: 0,
            duration: randomDuration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [moveAnim]);

  const config = PEST_CONFIG[type];

  return (
    <ThemedView style={[styles.container, { transform: [{ translateX: moveAnim }] }]}>
      <IconSymbol
        name={config.icon}
        style={[{ color: config.color, fontSize: config.size }]}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.sm,
  },
});

export default PestSprite;
