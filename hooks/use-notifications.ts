/**
 * Hook per gestione notifiche push locali
 * Supporta notifiche pianificate, reminder, e notifiche di gioco
 */

import { useCallback, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationSettings {
  enabled: boolean;
  dailyReminder: boolean;
  dailyReminderTime: string; // HH:MM format
  plantReminders: boolean;
  challengeReminders: boolean;
  socialNotifications: boolean;
}

interface ScheduledNotification {
  id: string;
  type: 'daily_reminder' | 'plant_water' | 'plant_feed' | 'challenge' | 'event';
  title: string;
  body: string;
  scheduledTime: Date;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  dailyReminder: true,
  dailyReminderTime: '09:00',
  plantReminders: true,
  challengeReminders: true,
  socialNotifications: true,
};

const STORAGE_KEY = 'notification_settings';

export function useNotifications() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [hasPermission, setHasPermission] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  // Request permissions and get token
  const checkPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    setHasPermission(finalStatus === 'granted');

    if (finalStatus === 'granted') {
      // Get push token for remote notifications (if needed in future)
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'kurstaki-strike', // Replace with actual project ID
        });
        setExpoPushToken(token.data);
      } catch (error) {
        console.log('Push token not available:', error);
      }
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22c55e',
      });

      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250],
        lightColor: '#3b82f6',
      });

      await Notifications.setNotificationChannelAsync('challenges', {
        name: 'Challenges',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#f59e0b',
      });
    }
  };

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // Reschedule notifications based on new settings
      await rescheduleAllNotifications(newSettings);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const updateSetting = useCallback(async <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    await saveSettings(newSettings);
  }, [settings]);

  // Schedule a local notification
  const scheduleNotification = useCallback(async (
    title: string,
    body: string,
    trigger: Notifications.NotificationTriggerInput,
    data?: Record<string, unknown>
  ): Promise<string> => {
    if (!settings.enabled || !hasPermission) {
      return '';
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        badge: 1,
      },
      trigger,
    });

    return id;
  }, [settings.enabled, hasPermission]);

  // Schedule daily reminder
  const scheduleDailyReminder = useCallback(async () => {
    if (!settings.dailyReminder || !settings.enabled) return;

    // Cancel existing daily reminders
    await cancelNotificationsByType('daily_reminder');

    const [hours, minutes] = settings.dailyReminderTime.split(':').map(Number);

    await scheduleNotification(
      '🌱 Buongiorno, Giardiniere!',
      'Le tue piante ti aspettano! Controlla il tuo garden e completa le sfide giornaliere.',
      {
        type: 'calendar',
        hour: hours,
        minute: minutes,
        repeats: true,
      } as Notifications.CalendarTriggerInput,
      { type: 'daily_reminder' }
    );
  }, [settings, scheduleNotification]);

  // Schedule plant water reminder
  const schedulePlantWaterReminder = useCallback(async (
    plantName: string,
    hoursUntilDry: number
  ) => {
    if (!settings.plantReminders || !settings.enabled) return;

    const triggerDate = new Date();
    triggerDate.setHours(triggerDate.getHours() + hoursUntilDry);

    await scheduleNotification(
      '💧 La tua pianta ha sete!',
      `${plantName} ha bisogno di acqua. Innaffiala prima che si secchi!`,
      {
        type: 'date',
        date: triggerDate,
      } as Notifications.DateTriggerInput,
      { type: 'plant_water', plantName }
    );
  }, [settings, scheduleNotification]);

  // Schedule plant feed reminder
  const schedulePlantFeedReminder = useCallback(async (
    plantName: string,
    hoursUntilHungry: number
  ) => {
    if (!settings.plantReminders || !settings.enabled) return;

    const triggerDate = new Date();
    triggerDate.setHours(triggerDate.getHours() + hoursUntilHungry);

    await scheduleNotification(
      '🧪 Nutrienti in esaurimento!',
      `${plantName} ha bisogno di nutrienti per crescere bene.`,
      {
        type: 'date',
        date: triggerDate,
      } as Notifications.DateTriggerInput,
      { type: 'plant_feed', plantName }
    );
  }, [settings, scheduleNotification]);

  // Schedule challenge reminder
  const scheduleChallengeReminder = useCallback(async (
    challengeName: string,
    hoursRemaining: number
  ) => {
    if (!settings.challengeReminders || !settings.enabled) return;

    const triggerDate = new Date();
    triggerDate.setHours(triggerDate.getHours() + Math.max(1, hoursRemaining - 2));

    await scheduleNotification(
      '⚔️ Sfida in scadenza!',
      `La sfida "${challengeName}" sta per scadere. Completala per ottenere le ricompense!`,
      {
        type: 'date',
        date: triggerDate,
      } as Notifications.DateTriggerInput,
      { type: 'challenge', challengeName }
    );
  }, [settings, scheduleNotification]);

  // Send instant notification
  const sendInstantNotification = useCallback(async (
    title: string,
    body: string,
    data?: Record<string, unknown>
  ) => {
    if (!settings.enabled || !hasPermission) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
      },
      trigger: null, // Instant
    });
  }, [settings.enabled, hasPermission]);

  // Cancel notifications by type
  const cancelNotificationsByType = useCallback(async (type: string) => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    
    for (const notification of scheduled) {
      if (notification.content.data?.type === type) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
  }, []);

  // Cancel all notifications
  const cancelAllNotifications = useCallback(async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }, []);

  // Reschedule all notifications based on settings
  const rescheduleAllNotifications = useCallback(async (newSettings: NotificationSettings) => {
    await cancelAllNotifications();
    
    if (!newSettings.enabled) return;

    if (newSettings.dailyReminder) {
      const [hours, minutes] = newSettings.dailyReminderTime.split(':').map(Number);
      await scheduleNotification(
        '🌱 Buongiorno, Giardiniere!',
        'Le tue piante ti aspettano! Controlla il tuo garden e completa le sfide giornaliere.',
        {
          type: 'calendar',
          hour: hours,
          minute: minutes,
          repeats: true,
        } as Notifications.CalendarTriggerInput,
        { type: 'daily_reminder' }
      );
    }
  }, [cancelAllNotifications, scheduleNotification]);

  // Get all scheduled notifications
  const getScheduledNotifications = useCallback(async () => {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    return scheduled;
  }, []);

  // Notification templates for common game events
  const notifyAchievementUnlocked = useCallback(async (achievementName: string) => {
    await sendInstantNotification(
      '🏆 Achievement Sbloccato!',
      `Hai sbloccato "${achievementName}"! Controlla i tuoi badge.`,
      { type: 'achievement', achievementName }
    );
  }, [sendInstantNotification]);

  const notifyLevelUp = useCallback(async (newLevel: number) => {
    await sendInstantNotification(
      '⭐ Level Up!',
      `Congratulazioni! Sei salito al livello ${newLevel}!`,
      { type: 'level_up', level: newLevel }
    );
  }, [sendInstantNotification]);

  const notifyNewChallenge = useCallback(async (challengeName: string) => {
    if (!settings.challengeReminders) return;
    
    await sendInstantNotification(
      '🎯 Nuova Sfida Disponibile!',
      `"${challengeName}" è ora disponibile. Completala per ottenere ricompense!`,
      { type: 'new_challenge', challengeName }
    );
  }, [settings.challengeReminders, sendInstantNotification]);

  const notifyGardenVisit = useCallback(async (visitorName: string) => {
    if (!settings.socialNotifications) return;
    
    await sendInstantNotification(
      '👀 Visita al Garden!',
      `${visitorName} ha visitato il tuo garden!`,
      { type: 'garden_visit', visitorName }
    );
  }, [settings.socialNotifications, sendInstantNotification]);

  return {
    settings,
    hasPermission,
    expoPushToken,
    updateSetting,
    saveSettings,
    scheduleNotification,
    scheduleDailyReminder,
    schedulePlantWaterReminder,
    schedulePlantFeedReminder,
    scheduleChallengeReminder,
    sendInstantNotification,
    cancelNotificationsByType,
    cancelAllNotifications,
    getScheduledNotifications,
    notifyAchievementUnlocked,
    notifyLevelUp,
    notifyNewChallenge,
    notifyGardenVisit,
    checkPermissions,
  };
}
