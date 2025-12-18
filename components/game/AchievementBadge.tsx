// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Animated, Easing } from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';

// Theme constants
const Colors = {
  primaryGreen: '#2D7D46',
  gold: '#FFD700',
  darkBackground: '#1A1A2E',
  white: '#FFFFFF',
};

const Spacing = {
  sm: 8,
  md: 16,
};

const BorderRadius = {
  md: 12,
  lg: 16,
};

export interface AchievementBadgeProps {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  unlocked: boolean;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ title, description, icon, unlocked }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (unlocked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.back(1.5),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [unlocked, scaleAnim, opacityAnim]);

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <ThemedView style={styles.badgeContainer}>
        <IconSymbol name={icon} size={64} color={Colors.gold} />
        <Animated.View style={[styles.textContainer, { opacity: opacityAnim }]}>
          <ThemedText type="title" style={styles.title}>{title}</ThemedText>
          <ThemedText style={styles.description}>{description}</ThemedText>
        </Animated.View>
      </ThemedView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  badgeContainer: {
    backgroundColor: Colors.darkBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    width: '90%',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 15,
    elevation: 10,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  textContainer: {
    marginTop: Spacing.sm,
    alignItems: 'center',
  },
  title: {
    color: Colors.gold,
    fontWeight: 'bold',
  },
  description: {
    color: Colors.white,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default AchievementBadge;
