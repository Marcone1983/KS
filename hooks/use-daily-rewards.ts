import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyReward {
  day: number;
  type: 'coins' | 'gems' | 'item' | 'xp' | 'skill_points' | 'chest';
  amount: number;
  itemId?: string;
  claimed: boolean;
  special: boolean;
}

export interface DailyRewardsState {
  currentStreak: number;
  longestStreak: number;
  lastClaimDate: string | null;
  totalDaysClaimed: number;
  rewards: DailyReward[];
  canClaimToday: boolean;
}

const DAILY_REWARDS_CYCLE: Omit<DailyReward, 'claimed'>[] = [
  { day: 1, type: 'coins', amount: 100, special: false },
  { day: 2, type: 'xp', amount: 200, special: false },
  { day: 3, type: 'coins', amount: 200, special: false },
  { day: 4, type: 'item', amount: 1, itemId: 'health_potion', special: false },
  { day: 5, type: 'gems', amount: 10, special: false },
  { day: 6, type: 'coins', amount: 300, special: false },
  { day: 7, type: 'chest', amount: 1, itemId: 'rare_chest', special: true },
  { day: 8, type: 'xp', amount: 400, special: false },
  { day: 9, type: 'coins', amount: 400, special: false },
  { day: 10, type: 'skill_points', amount: 2, special: false },
  { day: 11, type: 'item', amount: 1, itemId: 'super_spray', special: false },
  { day: 12, type: 'coins', amount: 500, special: false },
  { day: 13, type: 'gems', amount: 25, special: false },
  { day: 14, type: 'chest', amount: 1, itemId: 'epic_chest', special: true },
  { day: 15, type: 'xp', amount: 600, special: false },
  { day: 16, type: 'coins', amount: 600, special: false },
  { day: 17, type: 'item', amount: 1, itemId: 'shield_barrier', special: false },
  { day: 18, type: 'skill_points', amount: 3, special: false },
  { day: 19, type: 'coins', amount: 700, special: false },
  { day: 20, type: 'gems', amount: 40, special: false },
  { day: 21, type: 'chest', amount: 1, itemId: 'legendary_chest', special: true },
  { day: 22, type: 'xp', amount: 800, special: false },
  { day: 23, type: 'coins', amount: 800, special: false },
  { day: 24, type: 'item', amount: 1, itemId: 'invincibility_potion', special: false },
  { day: 25, type: 'skill_points', amount: 5, special: false },
  { day: 26, type: 'coins', amount: 1000, special: false },
  { day: 27, type: 'gems', amount: 50, special: false },
  { day: 28, type: 'chest', amount: 1, itemId: 'mythic_chest', special: true },
  { day: 29, type: 'xp', amount: 1000, special: false },
  { day: 30, type: 'coins', amount: 2000, special: true },
];

const STORAGE_KEY = 'dailyRewards';

export function useDailyRewards() {
  const [state, setState] = useState<DailyRewardsState>({
    currentStreak: 0,
    longestStreak: 0,
    lastClaimDate: null,
    totalDaysClaimed: 0,
    rewards: DAILY_REWARDS_CYCLE.map(r => ({ ...r, claimed: false })),
    canClaimToday: true,
  });

  useEffect(() => {
    loadDailyRewards();
  }, []);

  const loadDailyRewards = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Check if streak is broken
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        
        if (parsed.lastClaimDate && parsed.lastClaimDate !== today && parsed.lastClaimDate !== yesterday) {
          // Streak broken - reset
          parsed.currentStreak = 0;
          parsed.rewards = DAILY_REWARDS_CYCLE.map(r => ({ ...r, claimed: false }));
        }
        
        // Check if can claim today
        parsed.canClaimToday = parsed.lastClaimDate !== today;
        
        setState(parsed);
      }
    } catch (error) {
      console.error('Failed to load daily rewards:', error);
    }
  };

  const saveDailyRewards = async (newState: DailyRewardsState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error('Failed to save daily rewards:', error);
    }
  };

  const claimReward = useCallback((): DailyReward | null => {
    if (!state.canClaimToday) return null;

    const today = new Date().toDateString();
    const currentDay = (state.currentStreak % 30) + 1;
    const reward = state.rewards.find(r => r.day === currentDay);
    
    if (!reward || reward.claimed) return null;

    setState(prev => {
      const newStreak = prev.currentStreak + 1;
      const newRewards = prev.rewards.map(r => 
        r.day === currentDay ? { ...r, claimed: true } : r
      );
      
      // Reset rewards if completed cycle
      if (currentDay === 30) {
        newRewards.forEach(r => r.claimed = false);
      }

      const newState = {
        ...prev,
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        lastClaimDate: today,
        totalDaysClaimed: prev.totalDaysClaimed + 1,
        rewards: newRewards,
        canClaimToday: false,
      };

      saveDailyRewards(newState);
      return newState;
    });

    return reward;
  }, [state]);

  const getCurrentReward = useCallback((): DailyReward | null => {
    const currentDay = (state.currentStreak % 30) + 1;
    return state.rewards.find(r => r.day === currentDay) || null;
  }, [state]);

  const getUpcomingRewards = useCallback((count: number = 7): DailyReward[] => {
    const currentDay = (state.currentStreak % 30) + 1;
    const upcoming: DailyReward[] = [];
    
    for (let i = 0; i < count; i++) {
      const day = ((currentDay + i - 1) % 30) + 1;
      const reward = state.rewards.find(r => r.day === day);
      if (reward) upcoming.push(reward);
    }
    
    return upcoming;
  }, [state]);

  const getStreakBonus = useCallback((): number => {
    // Bonus multiplier based on streak
    if (state.currentStreak >= 30) return 2.0;
    if (state.currentStreak >= 21) return 1.75;
    if (state.currentStreak >= 14) return 1.5;
    if (state.currentStreak >= 7) return 1.25;
    return 1.0;
  }, [state.currentStreak]);

  const getTimeUntilNextClaim = useCallback((): number => {
    if (state.canClaimToday) return 0;
    
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    return tomorrow.getTime() - now.getTime();
  }, [state.canClaimToday]);

  const formatTimeRemaining = useCallback((ms: number): string => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    state,
    claimReward,
    getCurrentReward,
    getUpcomingRewards,
    getStreakBonus,
    getTimeUntilNextClaim,
    formatTimeRemaining,
    DAILY_REWARDS_CYCLE,
  };
}

export default useDailyRewards;
