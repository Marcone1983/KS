import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withRepeat, withTiming } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDailyRewards, DailyReward } from '@/hooks/use-daily-rewards';
import { useSounds } from '@/hooks/use-sounds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 16) / 3;

const REWARD_ICONS: Record<string, string> = {
  coins: '🪙',
  gems: '💎',
  xp: '⭐',
  skill_points: '🔮',
  item: '📦',
  chest: '🎁',
};

const REWARD_COLORS: Record<string, string> = {
  coins: '#fbbf24',
  gems: '#a855f7',
  xp: '#22c55e',
  skill_points: '#6366f1',
  item: '#3b82f6',
  chest: '#ef4444',
};

function RewardCard({ reward, isCurrent, isPast, onClaim }: { reward: DailyReward; isCurrent: boolean; isPast: boolean; onClaim?: () => void }) {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);
  
  useEffect(() => {
    if (isCurrent && !reward.claimed) {
      glow.value = withRepeat(withTiming(1, { duration: 1000 }), -1, true);
      scale.value = withRepeat(withSequence(
        withTiming(1.05, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ), -1, true);
    }
  }, [isCurrent, reward.claimed]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value * 0.5,
  }));
  
  const handlePress = () => {
    if (isCurrent && !reward.claimed && onClaim) {
      scale.value = withSequence(
        withSpring(0.9),
        withSpring(1.2),
        withSpring(1)
      );
      onClaim();
    }
  };
  
  const isClaimable = isCurrent && !reward.claimed;
  const icon = REWARD_ICONS[reward.type] || '🎁';
  const color = REWARD_COLORS[reward.type] || '#fff';
  
  return (
    <Animated.View style={[animatedStyle]}>
      <Pressable
        onPress={handlePress}
        disabled={!isClaimable}
        style={[
          styles.rewardCard,
          reward.special && styles.rewardCardSpecial,
          isPast && styles.rewardCardPast,
          reward.claimed && styles.rewardCardClaimed,
          isClaimable && styles.rewardCardClaimable,
          { borderColor: reward.special ? '#fbbf24' : color },
        ]}
      >
        <ThemedText style={styles.dayText}>Giorno {reward.day}</ThemedText>
        <ThemedText style={styles.rewardIcon}>{icon}</ThemedText>
        <ThemedText style={[styles.rewardAmount, { color }]}>
          {reward.type === 'item' || reward.type === 'chest' ? 'x1' : `+${reward.amount}`}
        </ThemedText>
        {reward.claimed && (
          <View style={styles.claimedOverlay}>
            <ThemedText style={styles.claimedText}>✓</ThemedText>
          </View>
        )}
        {isClaimable && (
          <View style={styles.claimBadge}>
            <ThemedText style={styles.claimBadgeText}>RISCUOTI</ThemedText>
          </View>
        )}
        {reward.special && (
          <View style={styles.specialBadge}>
            <ThemedText style={styles.specialBadgeText}>★</ThemedText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function CountdownTimer({ timeRemaining }: { timeRemaining: number }) {
  const [time, setTime] = useState(timeRemaining);
  
  useEffect(() => {
    setTime(timeRemaining);
    const interval = setInterval(() => {
      setTime(prev => Math.max(0, prev - 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining]);
  
  const hours = Math.floor(time / 3600000);
  const minutes = Math.floor((time % 3600000) / 60000);
  const seconds = Math.floor((time % 60000) / 1000);
  
  return (
    <View style={styles.countdown}>
      <ThemedText style={styles.countdownLabel}>Prossima ricompensa tra:</ThemedText>
      <View style={styles.countdownDigits}>
        <View style={styles.digitBox}>
          <ThemedText style={styles.digitText}>{hours.toString().padStart(2, '0')}</ThemedText>
          <ThemedText style={styles.digitLabel}>ORE</ThemedText>
        </View>
        <ThemedText style={styles.digitSeparator}>:</ThemedText>
        <View style={styles.digitBox}>
          <ThemedText style={styles.digitText}>{minutes.toString().padStart(2, '0')}</ThemedText>
          <ThemedText style={styles.digitLabel}>MIN</ThemedText>
        </View>
        <ThemedText style={styles.digitSeparator}>:</ThemedText>
        <View style={styles.digitBox}>
          <ThemedText style={styles.digitText}>{seconds.toString().padStart(2, '0')}</ThemedText>
          <ThemedText style={styles.digitLabel}>SEC</ThemedText>
        </View>
      </View>
    </View>
  );
}

export default function DailyRewardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  const { 
    state, 
    claimReward, 
    getCurrentReward, 
    getUpcomingRewards, 
    getStreakBonus,
    getTimeUntilNextClaim,
  } = useDailyRewards();
  
  const [showClaimAnimation, setShowClaimAnimation] = useState(false);
  const [claimedReward, setClaimedReward] = useState<DailyReward | null>(null);
  
  const currentReward = getCurrentReward();
  const timeUntilNext = getTimeUntilNextClaim();
  const streakBonus = getStreakBonus();
  
  const handleClaim = useCallback(() => {
    const reward = claimReward();
    if (reward) {
      setClaimedReward(reward);
      setShowClaimAnimation(true);
      play('shop_buy_rare' as any);
      setTimeout(() => setShowClaimAnimation(false), 2000);
    }
  }, [claimReward, play]);
  
  const currentDay = (state.currentStreak % 30) + 1;
  
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>←</ThemedText>
        </Pressable>
        <ThemedText style={styles.title}>Ricompense Giornaliere</ThemedText>
        <View style={styles.placeholder} />
      </View>
      
      {/* Streak Info */}
      <View style={styles.streakContainer}>
        <View style={styles.streakInfo}>
          <ThemedText style={styles.streakLabel}>Streak Attuale</ThemedText>
          <ThemedText style={styles.streakValue}>🔥 {state.currentStreak} giorni</ThemedText>
        </View>
        <View style={styles.streakInfo}>
          <ThemedText style={styles.streakLabel}>Record</ThemedText>
          <ThemedText style={styles.streakValue}>🏆 {state.longestStreak} giorni</ThemedText>
        </View>
        <View style={styles.streakInfo}>
          <ThemedText style={styles.streakLabel}>Bonus</ThemedText>
          <ThemedText style={[styles.streakValue, { color: '#22c55e' }]}>x{streakBonus.toFixed(2)}</ThemedText>
        </View>
      </View>
      
      {/* Countdown or Claim Button */}
      {state.canClaimToday ? (
        <View style={styles.claimSection}>
          <ThemedText style={styles.claimTitle}>🎁 Ricompensa disponibile!</ThemedText>
          {currentReward && (
            <View style={styles.currentRewardPreview}>
              <ThemedText style={styles.previewIcon}>{REWARD_ICONS[currentReward.type]}</ThemedText>
              <ThemedText style={styles.previewText}>
                {currentReward.type === 'item' || currentReward.type === 'chest' 
                  ? 'x1' 
                  : `+${currentReward.amount}`}
              </ThemedText>
            </View>
          )}
          <Pressable onPress={handleClaim} style={styles.claimButton}>
            <ThemedText style={styles.claimButtonText}>RISCUOTI ORA</ThemedText>
          </Pressable>
        </View>
      ) : (
        <CountdownTimer timeRemaining={timeUntilNext} />
      )}
      
      {/* Rewards Calendar */}
      <ScrollView 
        style={styles.calendarContainer}
        contentContainerStyle={[styles.calendarContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <ThemedText style={styles.calendarTitle}>Calendario Ricompense</ThemedText>
        <View style={styles.rewardsGrid}>
          {state.rewards.map((reward, index) => {
            const isPast = reward.day < currentDay;
            const isCurrent = reward.day === currentDay;
            return (
              <RewardCard
                key={reward.day}
                reward={reward}
                isCurrent={isCurrent}
                isPast={isPast}
                onClaim={isCurrent ? handleClaim : undefined}
              />
            );
          })}
        </View>
        
        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <ThemedText style={styles.legendText}>Riscosso</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#fbbf24' }]} />
            <ThemedText style={styles.legendText}>Speciale</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#6b7280' }]} />
            <ThemedText style={styles.legendText}>Futuro</ThemedText>
          </View>
        </View>
      </ScrollView>
      
      {/* Claim Animation Overlay */}
      {showClaimAnimation && claimedReward && (
        <View style={styles.claimOverlay}>
          <Animated.View style={styles.claimAnimationContent}>
            <ThemedText style={styles.claimAnimationIcon}>
              {REWARD_ICONS[claimedReward.type]}
            </ThemedText>
            <ThemedText style={styles.claimAnimationText}>
              +{claimedReward.amount}
            </ThemedText>
            <ThemedText style={styles.claimAnimationLabel}>
              Ricompensa riscossa!
            </ThemedText>
          </Animated.View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 44 },
  streakContainer: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16, borderRadius: 12 },
  streakInfo: { alignItems: 'center' },
  streakLabel: { fontSize: 12, color: '#a1a1aa' },
  streakValue: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  claimSection: { alignItems: 'center', padding: 24, margin: 16, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 16, borderWidth: 2, borderColor: '#22c55e' },
  claimTitle: { fontSize: 20, fontWeight: 'bold', color: '#22c55e', marginBottom: 12 },
  currentRewardPreview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  previewIcon: { fontSize: 40 },
  previewText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  claimButton: { backgroundColor: '#22c55e', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  claimButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  countdown: { alignItems: 'center', padding: 20, margin: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16 },
  countdownLabel: { fontSize: 14, color: '#a1a1aa', marginBottom: 12 },
  countdownDigits: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  digitBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8 },
  digitText: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  digitLabel: { fontSize: 10, color: '#a1a1aa', marginTop: 4 },
  digitSeparator: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  calendarContainer: { flex: 1 },
  calendarContent: { padding: 16 },
  calendarTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  rewardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rewardCard: { width: CARD_WIDTH, aspectRatio: 0.9, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 2, position: 'relative' },
  rewardCardSpecial: { backgroundColor: 'rgba(251,191,36,0.1)' },
  rewardCardPast: { opacity: 0.5 },
  rewardCardClaimed: { backgroundColor: 'rgba(34,197,94,0.1)' },
  rewardCardClaimable: { backgroundColor: 'rgba(34,197,94,0.2)', shadowColor: '#22c55e', shadowOffset: { width: 0, height: 0 }, shadowRadius: 10, elevation: 5 },
  dayText: { fontSize: 10, color: '#a1a1aa', position: 'absolute', top: 6 },
  rewardIcon: { fontSize: 28, marginTop: 8 },
  rewardAmount: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  claimedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(34,197,94,0.3)', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  claimedText: { fontSize: 32, color: '#22c55e' },
  claimBadge: { position: 'absolute', bottom: 4, backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  claimBadgeText: { fontSize: 8, fontWeight: 'bold', color: '#fff' },
  specialBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fbbf24', width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  specialBadgeText: { fontSize: 12, color: '#000' },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 12, color: '#a1a1aa' },
  claimOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  claimAnimationContent: { alignItems: 'center' },
  claimAnimationIcon: { fontSize: 80 },
  claimAnimationText: { fontSize: 48, fontWeight: 'bold', color: '#fbbf24', marginTop: 16 },
  claimAnimationLabel: { fontSize: 20, color: '#fff', marginTop: 8 },
});
