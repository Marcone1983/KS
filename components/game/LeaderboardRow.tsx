// @ts-nocheck
import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Theme constants based on requirements
const theme = {
  colors: {
    primaryGreen: '#2D7D46',
    gold: '#FFD700',
    darkBackground: '#1A1A2E',
    white: '#FFFFFF',
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

export interface LeaderboardRowProps {
  rank: number;
  name: string;
  score: number;
  isCurrentUser?: boolean;
}

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ rank, name, score, isCurrentUser = false }) => {

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Potentially navigate to user profile or show more details
  };

  const isTopThree = rank <= 3;

  const getRankIcon = () => {
    if (rank === 1) return 'crown';
    if (rank === 2) return 'medal';
    if (rank === 3) return 'trophy';
    return null;
  };

  const rankIcon = getRankIcon();

  return (
    <Pressable onPress={handlePress}>
      <ThemedView style={[styles.container, isCurrentUser && styles.currentUserContainer, isTopThree && styles.topThreeContainer]}>
        <ThemedView style={styles.rankContainer}>
          {rankIcon ? (
            <IconSymbol name={rankIcon} size={24} color={theme.colors.gold} />
          ) : (
            <ThemedText style={styles.rankText}>{rank}</ThemedText>
          )}
        </ThemedView>
        <ThemedView style={styles.nameContainer}>
          <ThemedText style={styles.nameText} numberOfLines={1}>{name}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.scoreContainer}>
          <ThemedText style={styles.scoreText}>{score.toLocaleString()}</ThemedText>
        </ThemedView>
      </ThemedView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.darkBackground,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primaryGreen,
  },
  currentUserContainer: {
    backgroundColor: '#3E4E88', // A slightly different background for the current user
    borderColor: theme.colors.gold,
  },
  topThreeContainer: {
    borderColor: theme.colors.gold,
    borderWidth: 2,
  },
  rankContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  nameContainer: {
    flex: 4,
    paddingHorizontal: theme.spacing.md,
  },
  nameText: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: '600',
  },
  scoreContainer: {
    flex: 2,
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.gold,
  },
});

export default LeaderboardRow;
