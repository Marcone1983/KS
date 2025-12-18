// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

// --- Theme Constants ---
const themeColors = {
  primaryGreen: '#2D7D46',
  gold: '#FFD700',
  error: '#B00020',
  darkBackground: '#1A1A2E',
  text: '#FFFFFF',
};

const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const BorderRadius = { sm: 8, md: 12, lg: 16 };

// --- Type Definitions ---
export type NotificationType = 'success' | 'warning' | 'error';

export interface NotificationBannerProps {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
  onDismiss: (id: string) => void;
}

const NOTIFICATION_STORAGE_KEY = '@KannaSprout_Notifications';

// --- Component ---
const NotificationBanner: React.FC<NotificationBannerProps> = ({ id, message, type, duration = 4000, onDismiss }) => {
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const showBanner = () => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    };

    const hideBanner = () => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onDismiss(id);
        removeNotificationFromStorage(id);
      });
    };

    const triggerHapticFeedback = () => {
      switch (type) {
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    };

    const saveNotificationToStorage = async () => {
      try {
        const existingNotifications = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
        const notifications = existingNotifications ? JSON.parse(existingNotifications) : [];
        notifications.push({ id, message, type, timestamp: new Date() });
        await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
      } catch (e) {
        console.error("Failed to save notification.", e);
      }
    };

    showBanner();
    triggerHapticFeedback();
    saveNotificationToStorage();

    const timer = setTimeout(hideBanner, duration);

    return () => clearTimeout(timer);
  }, [id, duration, fadeAnim, onDismiss, type, message]);

  const removeNotificationFromStorage = async (notificationId: string) => {
    try {
      const existingNotifications = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      if (existingNotifications) {
        let notifications = JSON.parse(existingNotifications);
        notifications = notifications.filter((n: any) => n.id !== notificationId);
        await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
      }
    } catch (e) {
      console.error("Failed to remove notification.", e);
    }
  };

  const handleDismiss = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss(id);
      removeNotificationFromStorage(id);
    });
  };

  const bannerConfig = {
    success: {
      backgroundColor: themeColors.primaryGreen,
      icon: 'check-circle' as const,
    },
    warning: {
      backgroundColor: themeColors.gold,
      icon: 'alert-triangle' as const,
    },
    error: {
      backgroundColor: themeColors.error,
      icon: 'alert-circle' as const,
    },
  };

  const { backgroundColor, icon } = bannerConfig[type];

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim, backgroundColor }]}>
      <ThemedView style={styles.contentContainer}>
        <IconSymbol name={icon} size={24} color={themeColors.text} style={styles.icon} />
        <ThemedText style={styles.message}>{message}</ThemedText>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
          <IconSymbol name="x" size={20} color={themeColors.text} />
        </TouchableOpacity>
      </ThemedView>
    </Animated.View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Spacing.xl,
    left: Spacing.md,
    right: Spacing.md,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  icon: {
    marginRight: Spacing.sm,
  },
  message: {
    flex: 1,
    color: themeColors.text,
    fontSize: 16,
  },
  closeButton: {
    marginLeft: Spacing.sm,
    padding: Spacing.xs,
  },
});

export default NotificationBanner;
