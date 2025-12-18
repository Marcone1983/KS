import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const theme = {
  colors: {
    primaryGreen: '#2D7D46',
    gold: '#FFD700',
    darkBackground: '#1A1A2E',
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

interface ParticleProps {
  delay: number;
  startX: number;
}

const Particle: React.FC<ParticleProps> = ({ delay, startX }) => {
  const translateY = new Animated.Value(0);
  const translateX = new Animated.Value(startX);
  const opacity = new Animated.Value(1);
  const scale = new Animated.Value(1);

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 800,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateX, {
        toValue: startX + (Math.random() - 0.5) * 100,
        duration: 800,
        delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 800,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.2,
        duration: 800,
        delay,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, startX]);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          transform: [
            { translateY },
            { translateX },
            { scale },
          ],
          opacity,
        },
      ]}
    />
  );
};

interface SprayEffectProps {
  onSpray?: () => void;
}

const SprayEffect: React.FC<SprayEffectProps> = ({ onSpray }) => {
  const [isSpraying, setIsSpraying] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; delay: number; startX: number }>>([]);

  const handleSpray = async () => {
    if (isSpraying) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSpraying(true);
    
    // Create particles
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: Date.now() + i,
      delay: i * 30,
      startX: (Math.random() - 0.5) * 60,
    }));
    setParticles(newParticles);
    
    // Save spray time
    try {
      await AsyncStorage.setItem('lastSprayed', new Date().toISOString());
    } catch (error) {
      console.error('Failed to save spray time', error);
    }
    
    onSpray?.();
    
    setTimeout(() => {
      setIsSpraying(false);
      setParticles([]);
    }, 1000);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.particleContainer}>
        {particles.map((p) => (
          <Particle key={p.id} delay={p.delay} startX={p.startX} />
        ))}
      </View>
      
      <Pressable
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          isSpraying && styles.buttonActive,
        ]}
        onPress={handleSpray}
        disabled={isSpraying}
      >
        <ThemedText style={styles.buttonText}>
          {isSpraying ? '💨' : '🔫'}
        </ThemedText>
        <ThemedText style={styles.buttonLabel}>SPRAY</ThemedText>
      </Pressable>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: theme.spacing.xl,
    backgroundColor: 'transparent',
  },
  particleContainer: {
    position: 'absolute',
    bottom: 100,
    left: '50%',
    width: 100,
    height: 200,
    marginLeft: -50,
  },
  particle: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primaryGreen,
  },
  button: {
    backgroundColor: theme.colors.gold,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    shadowColor: theme.colors.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ scale: 0.95 }],
    opacity: 0.9,
  },
  buttonActive: {
    backgroundColor: theme.colors.primaryGreen,
  },
  buttonText: {
    fontSize: 32,
  },
  buttonLabel: {
    color: theme.colors.darkBackground,
    fontWeight: 'bold',
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
});

export default SprayEffect;
