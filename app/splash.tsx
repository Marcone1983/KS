import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, ImageBackground, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState(0);
  
  // Animation values
  const sprayPosition = useRef(new Animated.Value(0)).current;
  const sprayOpacity = useRef(new Animated.Value(1)).current;
  const waterParticles = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress and spray animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 50);

    // Spray bottle animation - moves with progress
    Animated.loop(
      Animated.sequence([
        Animated.timing(waterParticles, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(waterParticles, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ])
    ).start();

    return () => clearInterval(interval);
  }, []);

  // Calculate spray position based on progress
  const sprayX = (progress / 100) * (SCREEN_WIDTH - 100);

  return (
    <ImageBackground
      source={require('@/assets/images/splash-background.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
            },
          ]}
        >
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </Animated.View>

        {/* Loading bar with spray bottle */}
        <View style={styles.loadingContainer}>
          {/* Progress bar background */}
          <View style={styles.progressBarBg}>
            {/* Progress bar fill */}
            <View style={[styles.progressBarFill, { width: `${progress}%` }]}>
              {/* Water effect shimmer */}
              <View style={styles.waterShimmer} />
            </View>
            
            {/* Percentage text */}
            <View style={styles.percentageContainer}>
              <ThemedText style={styles.percentageText}>{progress}%</ThemedText>
            </View>
          </View>

          {/* Spray bottle that moves with progress */}
          <Animated.View
            style={[
              styles.sprayBottle,
              {
                left: sprayX,
                transform: [
                  {
                    translateY: waterParticles.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -3],
                    }),
                  },
                ],
              },
            ]}
          >
            <ThemedText style={styles.sprayEmoji}>🔫</ThemedText>
            {/* Water spray particles */}
            <Animated.View
              style={[
                styles.waterSpray,
                {
                  opacity: waterParticles.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.3, 1, 0.3],
                  }),
                  transform: [
                    {
                      scaleX: waterParticles.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.8, 1.2],
                      }),
                    },
                  ],
                },
              ]}
            >
              <ThemedText style={styles.waterDrops}>💧💧💧</ThemedText>
            </Animated.View>
          </Animated.View>

          {/* Loading text */}
          <ThemedText style={styles.loadingText}>Caricamento in corso...</ThemedText>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  logo: {
    width: 320,
    height: 200,
  },
  loadingContainer: {
    width: '100%',
    paddingHorizontal: 32,
    position: 'absolute',
    bottom: 120,
  },
  progressBarBg: {
    height: 64,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 4,
    borderColor: 'rgba(74, 222, 128, 0.5)',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#22d3ee',
    borderRadius: 28,
    overflow: 'hidden',
  },
  waterShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  percentageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  percentageText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sprayBottle: {
    position: 'absolute',
    top: -50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sprayEmoji: {
    fontSize: 40,
    transform: [{ rotate: '-45deg' }],
  },
  waterSpray: {
    position: 'absolute',
    bottom: -10,
    left: 30,
  },
  waterDrops: {
    fontSize: 12,
  },
  loadingText: {
    color: '#a7f3d0',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 24,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
