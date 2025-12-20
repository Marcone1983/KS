/**
 * Achievements UI Components
 * 
 * - AchievementNotification: Toast notification when achievement unlocks
 * - AchievementCard: Individual achievement display
 * - AchievementsPage: Full achievements list with categories
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Dimensions, Modal } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutUp
} from 'react-native-reanimated';
import { Achievement, RARITY_CONFIG } from '@/hooks/use-breeding-achievements';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Rarity gradient colors
const RARITY_GRADIENTS: Record<string, readonly [string, string]> = {
  bronze: ['#CD7F32', '#8B5A2B'] as const,
  silver: ['#C0C0C0', '#808080'] as const,
  gold: ['#FFD700', '#DAA520'] as const,
  platinum: ['#E5E4E2', '#A9A9A9'] as const,
};

interface AchievementNotificationProps {
  achievement: Achievement;
  onDismiss: () => void;
  autoDismissDelay?: number;
}

// Toast notification for newly unlocked achievement
export function AchievementNotification({ 
  achievement, 
  onDismiss,
  autoDismissDelay = 4000 
}: AchievementNotificationProps) {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  useEffect(() => {
    // Entrance animation
    scale.value = withSpring(1, { damping: 12 });
    opacity.value = withTiming(1, { duration: 300 });

    // Auto dismiss
    const timeout = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(onDismiss)();
      });
    }, autoDismissDelay);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.notificationContainer, animatedStyle]}>
      <Pressable onPress={onDismiss}>
        <LinearGradient
          colors={RARITY_GRADIENTS[achievement.rarity]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.notificationGradient}
        >
          <View style={styles.notificationContent}>
            <ThemedText style={styles.notificationIcon}>{achievement.icon}</ThemedText>
            <View style={styles.notificationText}>
              <ThemedText style={styles.notificationTitle}>Achievement Sbloccato!</ThemedText>
              <ThemedText style={styles.notificationName}>{achievement.name}</ThemedText>
              <ThemedText style={styles.notificationDesc}>{achievement.description}</ThemedText>
            </View>
            <View style={styles.notificationPoints}>
              <ThemedText style={styles.pointsValue}>+{RARITY_CONFIG[achievement.rarity].points}</ThemedText>
              <ThemedText style={styles.pointsLabel}>punti</ThemedText>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

interface AchievementCardProps {
  achievement: Achievement;
  onPress?: () => void;
}

// Individual achievement card
export function AchievementCard({ achievement, onPress }: AchievementCardProps) {
  const isUnlocked = !!achievement.unlockedAt;
  const progress = achievement.progress || 0;
  const maxProgress = achievement.maxProgress || 0;
  const progressPercent = maxProgress > 0 ? (progress / maxProgress) * 100 : 0;

  return (
    <Pressable 
      style={[styles.card, !isUnlocked && styles.cardLocked]}
      onPress={onPress}
    >
      {isUnlocked ? (
        <LinearGradient
          colors={RARITY_GRADIENTS[achievement.rarity]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardContent}>
            <ThemedText style={styles.cardIcon}>{achievement.icon}</ThemedText>
            <View style={styles.cardInfo}>
              <ThemedText style={styles.cardName}>{achievement.name}</ThemedText>
              <ThemedText style={styles.cardDesc}>{achievement.description}</ThemedText>
              {achievement.unlockedAt && (
                <ThemedText style={styles.cardDate}>
                  Sbloccato: {new Date(achievement.unlockedAt).toLocaleDateString('it-IT')}
                </ThemedText>
              )}
            </View>
            <View style={styles.cardPoints}>
              <ThemedText style={styles.cardPointsValue}>{RARITY_CONFIG[achievement.rarity].points}</ThemedText>
              <ThemedText style={styles.cardPointsLabel}>pt</ThemedText>
            </View>
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.cardContent}>
          <View style={styles.cardIconLocked}>
            <ThemedText style={styles.cardIconLockedText}>?</ThemedText>
          </View>
          <View style={styles.cardInfo}>
            <ThemedText style={styles.cardNameLocked}>{achievement.name}</ThemedText>
            <ThemedText style={styles.cardDescLocked}>{achievement.description}</ThemedText>
            {maxProgress > 0 && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
                </View>
                <ThemedText style={styles.progressText}>{progress}/{maxProgress}</ThemedText>
              </View>
            )}
          </View>
          <View style={[styles.rarityBadge, { backgroundColor: RARITY_CONFIG[achievement.rarity].color + '40' }]}>
            <ThemedText style={[styles.rarityText, { color: RARITY_CONFIG[achievement.rarity].color }]}>
              {achievement.rarity.toUpperCase()}
            </ThemedText>
          </View>
        </View>
      )}
    </Pressable>
  );
}

interface AchievementsPageProps {
  visible: boolean;
  onClose: () => void;
  achievements: Achievement[];
  totalPoints: number;
  getCategoryProgress: (category: Achievement['category']) => { unlocked: number; total: number };
}

// Full achievements page
export function AchievementsPage({ 
  visible, 
  onClose, 
  achievements,
  totalPoints,
  getCategoryProgress 
}: AchievementsPageProps) {
  const categories: Array<{ key: Achievement['category']; label: string; icon: string }> = [
    { key: 'breeding', label: 'Breeding', icon: '🌱' },
    { key: 'rarity', label: 'Rarità', icon: '💎' },
    { key: 'generation', label: 'Generazioni', icon: '🧬' },
    { key: 'stats', label: 'Statistiche', icon: '📊' },
    { key: 'collection', label: 'Collezione', icon: '📦' },
  ];

  const [selectedCategory, setSelectedCategory] = React.useState<Achievement['category'] | 'all'>('all');

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  // Sort: unlocked first, then by rarity
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    if (a.unlockedAt && !b.unlockedAt) return -1;
    if (!a.unlockedAt && b.unlockedAt) return 1;
    const rarityOrder = { platinum: 0, gold: 1, silver: 2, bronze: 3 };
    return rarityOrder[a.rarity] - rarityOrder[b.rarity];
  });

  const unlockedCount = achievements.filter(a => a.unlockedAt).length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.pageContainer}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <ThemedText style={styles.closeButtonText}>← Indietro</ThemedText>
          </Pressable>
          <ThemedText style={styles.pageTitle}>Achievements</ThemedText>
          <View style={styles.totalPoints}>
            <ThemedText style={styles.totalPointsValue}>{totalPoints}</ThemedText>
            <ThemedText style={styles.totalPointsLabel}>punti</ThemedText>
          </View>
        </View>

        {/* Progress Summary */}
        <View style={styles.progressSummary}>
          <ThemedText style={styles.progressSummaryText}>
            {unlockedCount} / {achievements.length} Sbloccati
          </ThemedText>
          <View style={styles.progressSummaryBar}>
            <View 
              style={[
                styles.progressSummaryFill, 
                { width: `${(unlockedCount / achievements.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* Category Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryTabs}
          contentContainerStyle={styles.categoryTabsContent}
        >
          <Pressable
            style={[styles.categoryTab, selectedCategory === 'all' && styles.categoryTabActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <ThemedText style={styles.categoryTabIcon}>🏆</ThemedText>
            <ThemedText style={[styles.categoryTabText, selectedCategory === 'all' && styles.categoryTabTextActive]}>
              Tutti
            </ThemedText>
          </Pressable>
          {categories.map(cat => {
            const progress = getCategoryProgress(cat.key);
            return (
              <Pressable
                key={cat.key}
                style={[styles.categoryTab, selectedCategory === cat.key && styles.categoryTabActive]}
                onPress={() => setSelectedCategory(cat.key)}
              >
                <ThemedText style={styles.categoryTabIcon}>{cat.icon}</ThemedText>
                <ThemedText style={[styles.categoryTabText, selectedCategory === cat.key && styles.categoryTabTextActive]}>
                  {cat.label}
                </ThemedText>
                <ThemedText style={styles.categoryTabProgress}>
                  {progress.unlocked}/{progress.total}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Achievements List */}
        <ScrollView 
          style={styles.achievementsList}
          contentContainerStyle={styles.achievementsListContent}
          showsVerticalScrollIndicator={false}
        >
          {sortedAchievements.map(achievement => (
            <AchievementCard key={achievement.id} achievement={achievement} />
          ))}
        </ScrollView>
      </LinearGradient>
    </Modal>
  );
}

// Notification container for multiple notifications
interface AchievementNotificationsContainerProps {
  notifications: Achievement[];
  onDismiss: (id: string) => void;
}

export function AchievementNotificationsContainer({ 
  notifications, 
  onDismiss 
}: AchievementNotificationsContainerProps) {
  if (notifications.length === 0) return null;

  return (
    <View style={styles.notificationsContainer}>
      {notifications.slice(0, 3).map((achievement, index) => (
        <Animated.View 
          key={achievement.id}
          entering={SlideInUp.delay(index * 200)}
          exiting={SlideOutUp}
        >
          <AchievementNotification
            achievement={achievement}
            onDismiss={() => onDismiss(achievement.id)}
            autoDismissDelay={4000 + index * 1000}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Notification styles
  notificationsContainer: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 1000,
    gap: 8,
  },
  notificationContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  notificationGradient: {
    padding: 16,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  notificationName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  notificationDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  notificationPoints: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  pointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  pointsLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },

  // Card styles
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  cardLocked: {
    opacity: 0.7,
  },
  cardGradient: {
    padding: 16,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardIcon: {
    fontSize: 36,
    marginRight: 12,
  },
  cardIconLocked: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardIconLockedText: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardNameLocked: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  cardDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  cardDescLocked: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  cardDate: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  cardPoints: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  cardPointsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardPointsLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  rarityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },

  // Page styles
  pageContainer: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#a7f3d0',
    fontSize: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  totalPoints: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  totalPointsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  totalPointsLabel: {
    fontSize: 10,
    color: '#a7f3d0',
  },
  progressSummary: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  progressSummaryText: {
    fontSize: 14,
    color: '#a7f3d0',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressSummaryBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressSummaryFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 4,
  },
  categoryTabs: {
    maxHeight: 80,
    marginBottom: 16,
  },
  categoryTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryTab: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 80,
  },
  categoryTabActive: {
    backgroundColor: '#22c55e',
  },
  categoryTabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryTabText: {
    fontSize: 12,
    color: '#a7f3d0',
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#fff',
  },
  categoryTabProgress: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  achievementsList: {
    flex: 1,
  },
  achievementsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});

export default AchievementsPage;
