// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

// Mock imports per l'ambiente di sviluppo isolato
// Negli ambienti di produzione, questi verrebbero da percorsi reali come '@/components/themed-text'
const ThemedText = ({ style, children }) => <Animated.Text style={style}>{children}</Animated.Text>;
const ThemedView = ({ style, children }) => <Animated.View style={style}>{children}</Animated.View>;
const IconSymbol = ({ name, style }) => <Animated.Text style={style}>{name === 'star' ? '⭐' : ''}</Animated.Text>;

// Valori del tema come specificato
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

const SCORE_STORAGE_KEY = '@KannaSprout:score';

/**
 * Hook personalizzato per gestire la logica del punteggio, inclusa la persistenza e l'aggiornamento.
 */
const useScore = () => {
  const [score, setScore] = useState(0);

  useEffect(() => {
    const loadScore = async () => {
      try {
        const storedScore = await AsyncStorage.getItem(SCORE_STORAGE_KEY);
        if (storedScore !== null) {
          setScore(parseInt(storedScore, 10));
        }
      } catch (error) {
        console.error('Failed to load score from storage', error);
      }
    };
    loadScore();
  }, []);

  const updateScore = async (newScore: number) => {
    try {
      await AsyncStorage.setItem(SCORE_STORAGE_KEY, newScore.toString());
      setScore(newScore);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to save score to storage', error);
    }
  };

  return { score, updateScore };
};

/**
 * Componente che visualizza il punteggio con un'animazione quando aumenta.
 */
const ScoreDisplay = () => {
  const { score } = useScore();
  const animatedScore = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Anima il numero del punteggio che sale
    Animated.timing(animatedScore, {
      toValue: score,
      duration: 500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // .interpolate() non è supportato con il driver nativo per la proprietà 'color'
    }).start();

    // Animazione di "pop" per feedback visivo
    scaleValue.setValue(1);
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 1.2,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 250,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

  }, [score]);

  const scoreText = animatedScore.interpolate({
    inputRange: [0, score],
    outputRange: ['0', `${score}`],
    extrapolate: 'clamp',
  });

  return (
    <ThemedView style={styles.container}>
      <IconSymbol name="star" style={styles.icon} />
      <ThemedText style={[styles.scoreText, { transform: [{ scale: scaleValue }] }]}>
        {score}
      </ThemedText>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkBackground,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 2,
    borderColor: theme.colors.primaryGreen,
  },
  icon: {
    fontSize: 24,
    color: theme.colors.gold,
    marginRight: theme.spacing.sm,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.gold,
    minWidth: 50, // Assicura che il layout non salti durante l'animazione
    textAlign: 'center',
  },
});

export default ScoreDisplay;
