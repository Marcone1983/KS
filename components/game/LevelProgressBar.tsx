// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock components as they are not defined in the project context
const ThemedText = ({ children, style, ...props }) => <View {...props}><p style={style}>{children}</p></View>;
const ThemedView = ({ children, style, ...props }) => <div style={style} {...props}>{children}</div>;

// --- Theme Constants ---
const Colors = {
  primaryGreen: '#2D7D46',
  gold: '#FFD700',
  darkBackground: '#1A1A2E',
  lightText: '#FFFFFF',
};

const Spacing = {
  sm: 8,
  md: 16,
};

const BorderRadius = {
  md: 12,
};

// --- Interfaces ---
interface LevelProgressBarProps {
  currentXp: number;
  xpToNextLevel: number;
  currentLevel: number;
}

const LevelProgressBar: React.FC<LevelProgressBarProps> = ({ currentXp, xpToNextLevel, currentLevel }) => {
  const [level, setLevel] = useState(currentLevel);
  const [xp, setXp] = useState(currentXp);
  const [nextLevelXp, setNextLevelXp] = useState(xpToNextLevel);

  const progressPercentage = Math.min((xp / nextLevelXp) * 100, 100);

  useEffect(() => {
    const checkLevelUp = async () => {
      if (xp >= nextLevelXp) {
        const newLevel = level + 1;
        const remainingXp = xp - nextLevelXp;
        const newNextLevelXp = Math.floor(nextLevelXp * 1.5); // Example logic

        setLevel(newLevel);
        setXp(remainingXp);
        setNextLevelXp(newNextLevelXp);

        await AsyncStorage.setItem('user_level', newLevel.toString());
        await AsyncStorage.setItem('user_xp', remainingXp.toString());

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    };

    checkLevelUp();
  }, [xp, nextLevelXp, level]);


  return (
    <ThemedView style={styles.container}>
      <View style={styles.levelInfoContainer}>
        <ThemedText style={styles.levelText}>Lvl {level}</ThemedText>
        <ThemedText style={styles.xpText}>{`${xp} / ${nextLevelXp} XP`}</ThemedText>
      </View>
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
      </View>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    backgroundColor: Colors.darkBackground,
    borderRadius: BorderRadius.md,
  },
  levelInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  levelText: {
    color: Colors.gold,
    fontWeight: 'bold',
    fontSize: 16,
  },
  xpText: {
    color: Colors.lightText,
    fontSize: 14,
  },
  progressBarBackground: {
    height: 12,
    backgroundColor: '#444',
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.md,
  },
});

export default LevelProgressBar;
