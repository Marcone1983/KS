import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Valori del tema (assunti come definiti in un file di costanti)
const theme = {
  colors: {
    primaryGreen: '#2D7D46',
    gold: '#FFD700',
    darkBackground: '#1A1A2E',
    text: '#FFFFFF',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
};

// Mock dei componenti importati per la dimostrazione
const ThemedView = ({ style, children }: { style?: any; children?: React.ReactNode }) => <Animated.View style={style}>{children}</Animated.View>;
const ThemedText = ({ style, children }: { style?: any; children?: React.ReactNode }) => <Animated.Text style={style}>{children}</Animated.Text>;

interface WaveIndicatorProps {
  currentWave: number;
}

const WaveIndicator: React.FC<WaveIndicatorProps> = ({ currentWave }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-50);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  useEffect(() => {
    if (currentWave > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Animazione di entrata e uscita
      translateY.value = withSequence(
        // Entrata
        withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }),
        // Pausa
        withTiming(0, { duration: 2000 }),
        // Uscita
        withTiming(50, { duration: 500, easing: Easing.in(Easing.cubic) })
      );

      opacity.value = withSequence(
        // Entrata
        withTiming(1, { duration: 500 }),
        // Pausa
        withTiming(1, { duration: 2000 }),
        // Uscita
        withTiming(0, { duration: 500 })
      );
    }
  }, [currentWave, opacity, translateY]);

  if (currentWave === 0) {
    return null;
  }

  return (
    <ThemedView style={[styles.container, animatedStyle]}>
      <ThemedText style={styles.waveText}>WAVE</ThemedText>
      <ThemedText style={styles.waveNumber}>{currentWave}</ThemedText>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: theme.spacing.xl,
    alignSelf: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.8)', // darkBackground con opacità
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: theme.colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 10,
    elevation: 10,
  },
  waveText: {
    color: theme.colors.primaryGreen,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  waveNumber: {
    color: theme.colors.gold,
    fontSize: 32,
    fontWeight: '900',
  },
});

export default WaveIndicator;
