// @ts-nocheck
import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

// --- Constants ---
const STORAGE_KEY = '@dailyRewardLastClaimed';
const REWARD_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const theme = {
  colors: {
    primaryGreen: '#2D7D46',
    gold: '#FFD700',
    darkBackground: '#1A1A2E',
    lightText: '#FFFFFF',
    disabled: '#555',
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

// --- Component ---
const DailyReward = () => {
  const [lastClaimed, setLastClaimed] = useState<number | null>(null);
  const [isClaimable, setIsClaimable] = useState(false);
  const [countdown, setCountdown] = useState('');

  const calculateTimeLeft = useCallback(() => {
    if (!lastClaimed) return null;

    const now = Date.now();
    const nextClaimTime = lastClaimed + REWARD_COOLDOWN;
    const timeLeft = nextClaimTime - now;

    if (timeLeft <= 0) {
      setIsClaimable(true);
      setCountdown('');
      return null;
    }

    setIsClaimable(false);
    const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, [lastClaimed]);

  useEffect(() => {
    const loadLastClaimedDate = async () => {
      try {
        const storedDate = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedDate) {
          setLastClaimed(parseInt(storedDate, 10));
        } else {
          setIsClaimable(true); // First time user can claim immediately
        }
      } catch (error) {
        console.error('Failed to load last claimed date:', error);
      }
    };

    loadLastClaimedDate();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const timeLeftString = calculateTimeLeft();
      if (timeLeftString) {
        setCountdown(timeLeftString);
      } else {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  const handleClaimReward = async () => {
    if (!isClaimable) return;

    try {
      const now = Date.now();
      await AsyncStorage.setItem(STORAGE_KEY, String(now));
      setLastClaimed(now);
      setIsClaimable(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Here you would typically add the reward to the user's inventory
    } catch (error) {
      console.error('Failed to save claim date:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <IconSymbol name="gift" size={64} color={theme.colors.gold} />
      <ThemedText style={styles.title}>Daily Reward</ThemedText>
      <ThemedText style={styles.subtitle}>
        {isClaimable ? 'Your daily reward is ready!' : 'Come back later for your next reward.'}
      </ThemedText>

      <TouchableOpacity
        style={[styles.button, isClaimable ? styles.buttonActive : styles.buttonDisabled]}
        onPress={handleClaimReward}
        disabled={!isClaimable}
      >
        <ThemedText style={styles.buttonText}>
          {isClaimable ? 'Claim Now' : 'Claimed'}
        </ThemedText>
      </TouchableOpacity>

      {!isClaimable && lastClaimed && (
        <ThemedText style={styles.countdownText}>
          Next reward in: {countdown}
        </ThemedText>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.darkBackground,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    margin: theme.spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.lightText,
    marginTop: theme.spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.lightText,
    opacity: 0.8,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  buttonActive: {
    backgroundColor: theme.colors.primaryGreen,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabled,
  },
  buttonText: {
    color: theme.colors.lightText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  countdownText: {
    marginTop: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.gold,
    fontWeight: '600',
  },
});

export default DailyReward;
