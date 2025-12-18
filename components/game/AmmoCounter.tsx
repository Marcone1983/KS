// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

const AMMO_STORAGE_KEY = 'ammo_count';
const MAX_AMMO = 100;

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

const AmmoCounter = () => {
  const [ammo, setAmmo] = useState(MAX_AMMO);
  const scaleAnim = new Animated.Value(1);

  useEffect(() => {
    const loadAmmo = async () => {
      try {
        const storedAmmo = await AsyncStorage.getItem(AMMO_STORAGE_KEY);
        if (storedAmmo !== null) {
          setAmmo(JSON.parse(storedAmmo));
        }
      } catch (error) {
        console.error('Failed to load ammo from storage', error);
      }
    };
    loadAmmo();
  }, []);

  const saveAmmo = async (newAmmo: number) => {
    try {
      await AsyncStorage.setItem(AMMO_STORAGE_KEY, JSON.stringify(newAmmo));
    } catch (error) {
      console.error('Failed to save ammo to storage', error);
    }
  };

  const handleReload = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAmmo(MAX_AMMO);
    saveAmmo(MAX_AMMO);
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim]);

  const useAmmo = (amount: number) => {
    const newAmmo = Math.max(0, ammo - amount);
    setAmmo(newAmmo);
    saveAmmo(newAmmo);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <IconSymbol name="water-drop" size={24} color={theme.colors.gold} />
      <ThemedText style={styles.ammoText}>{ammo}</ThemedText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.darkBackground,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.gold,
  },
  ammoText: {
    color: theme.colors.gold,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: theme.spacing.sm,
  },
});

export default AmmoCounter;
