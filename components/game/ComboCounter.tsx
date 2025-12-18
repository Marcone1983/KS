// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

// --- Constants ---
const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const BorderRadius = { sm: 8, md: 12, lg: 16 };
const Colors = { primaryGreen: '#2D7D46', gold: '#FFD700', darkBackground: '#1A1A2E' };
const COMBO_STORAGE_KEY = '@KannaSprout:comboState';
const COMBO_TIMEOUT = 3000; // 3 seconds

/**
 * Displays a combo counter that tracks consecutive pest eliminations and a score multiplier.
 * The counter is visible during a combo and disappears after a timeout.
 * The combo state is persisted in AsyncStorage.
 */
const ComboCounter = () => {
  const [comboCount, setComboCount] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [isVisible, setIsVisible] = useState(false);

  // --- State Persistence ---
  const loadState = useCallback(async () => {
    try {
      const savedState = await AsyncStorage.getItem(COMBO_STORAGE_KEY);
      if (savedState !== null) {
        const { count, multi } = JSON.parse(savedState);
        setComboCount(count);
        setMultiplier(multi);
        if (count > 0) {
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error('Failed to load combo state from AsyncStorage.', error);
    }
  }, []);

  const saveState = useCallback(async (count: number, multi: number) => {
    try {
      const state = JSON.stringify({ count, multi });
      await AsyncStorage.setItem(COMBO_STORAGE_KEY, state);
    } catch (error) {
      console.error('Failed to save combo state to AsyncStorage.', error);
    }
  }, []);

  // --- Effects ---
  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (comboCount > 0) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setComboCount(0);
        setMultiplier(1);
        setIsVisible(false);
        saveState(0, 1);
      }, COMBO_TIMEOUT);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [comboCount, saveState]);

  // --- Public API (for game logic) ---
  // This function would be called from the game logic when a pest is eliminated.
  const onPestEliminated = useCallback(() => {
    const newComboCount = comboCount + 1;
    let newMultiplier = multiplier;

    setComboCount(newComboCount);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (newComboCount > 0 && newComboCount % 5 === 0) {
      newMultiplier += 0.5;
      setMultiplier(newMultiplier);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }
    
    saveState(newComboCount, newMultiplier);
  }, [comboCount, multiplier, saveState]);

  // --- Render ---
  if (!isVisible) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <IconSymbol name="sword" size={24} color={Colors.gold} />
      <ThemedText style={styles.comboText}>COMBO x{comboCount}</ThemedText>
      <ThemedText style={styles.multiplierText}>x{multiplier.toFixed(1)}</ThemedText>
    </ThemedView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.lg,
    alignSelf: 'center',
    backgroundColor: 'rgba(26, 26, 46, 0.9)', // darkBackground with opacity
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.gold,
    elevation: 10, // Android shadow
    shadowColor: Colors.gold, // iOS shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 8,
  },
  comboText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: Spacing.sm,
  },
  multiplierText: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 22,
    marginLeft: Spacing.sm,
  },
});

export default ComboCounter;
