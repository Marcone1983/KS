import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PrestigeState {
  prestigeLevel: number;
  prestigePoints: number;
  totalPrestigePointsEarned: number;
  permanentBonuses: PermanentBonus[];
  currentRunStats: RunStats;
  bestRunStats: RunStats;
  prestigeMultiplier: number;
  unlockedPrestigePerks: string[];
}

export interface PermanentBonus {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  effect: { type: string; value: number };
  purchased: boolean;
}

export interface RunStats {
  totalScore: number;
  pestsKilled: number;
  bossesDefeated: number;
  coinsEarned: number;
  playTime: number;
  maxCombo: number;
  levelsCompleted: number;
}

export interface PrestigePerk {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  requirement: number; // prestige level required
  effect: { type: string; value: number; percentage: boolean };
}

const PRESTIGE_PERKS: PrestigePerk[] = [
  { id: 'start_coins', name: 'Eredita', description: 'Inizia con 500 monete', icon: '🪙', cost: 1, requirement: 1, effect: { type: 'start_coins', value: 500, percentage: false } },
  { id: 'xp_boost', name: 'Esperienza Accelerata', description: '+25% XP permanente', icon: '📚', cost: 2, requirement: 1, effect: { type: 'xp_bonus', value: 25, percentage: true } },
  { id: 'coin_boost', name: 'Mida Touch', description: '+25% monete permanente', icon: '💰', cost: 2, requirement: 2, effect: { type: 'coin_bonus', value: 25, percentage: true } },
  { id: 'damage_boost', name: 'Forza Ancestrale', description: '+10% danno permanente', icon: '⚔️', cost: 3, requirement: 2, effect: { type: 'damage', value: 10, percentage: true } },
  { id: 'health_boost', name: 'Costituzione Divina', description: '+20 HP permanenti', icon: '❤️', cost: 3, requirement: 3, effect: { type: 'health', value: 20, percentage: false } },
  { id: 'crit_boost', name: 'Occhio del Falco', description: '+5% crit chance permanente', icon: '🎯', cost: 4, requirement: 3, effect: { type: 'crit_chance', value: 5, percentage: true } },
  { id: 'start_level', name: 'Veterano', description: 'Inizia al livello 5', icon: '🏅', cost: 5, requirement: 4, effect: { type: 'start_level', value: 5, percentage: false } },
  { id: 'double_prestige', name: 'Maestro del Prestige', description: '+50% punti prestige', icon: '👑', cost: 10, requirement: 5, effect: { type: 'prestige_bonus', value: 50, percentage: true } },
  { id: 'auto_collect', name: 'Magnete Cosmico', description: 'Raccolta automatica monete', icon: '🧲', cost: 8, requirement: 5, effect: { type: 'auto_collect', value: 1, percentage: false } },
  { id: 'ultimate_power', name: 'Potere Supremo', description: '+100% a tutti i bonus', icon: '✨', cost: 20, requirement: 10, effect: { type: 'all_bonus', value: 100, percentage: true } },
];

const DEFAULT_RUN_STATS: RunStats = {
  totalScore: 0,
  pestsKilled: 0,
  bossesDefeated: 0,
  coinsEarned: 0,
  playTime: 0,
  maxCombo: 0,
  levelsCompleted: 0,
};

const STORAGE_KEY = 'prestigeSystem';

export function usePrestige() {
  const [state, setState] = useState<PrestigeState>({
    prestigeLevel: 0,
    prestigePoints: 0,
    totalPrestigePointsEarned: 0,
    permanentBonuses: [],
    currentRunStats: { ...DEFAULT_RUN_STATS },
    bestRunStats: { ...DEFAULT_RUN_STATS },
    prestigeMultiplier: 1,
    unlockedPrestigePerks: [],
  });

  useEffect(() => {
    loadPrestigeData();
  }, []);

  const loadPrestigeData = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setState(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load prestige data:', error);
    }
  };

  const savePrestigeData = async (newState: PrestigeState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error('Failed to save prestige data:', error);
    }
  };

  const calculatePrestigePoints = useCallback((stats: RunStats): number => {
    // Formula: base points from score + bonuses from achievements
    let points = Math.floor(stats.totalScore / 10000);
    points += stats.bossesDefeated * 5;
    points += Math.floor(stats.pestsKilled / 100);
    points += stats.levelsCompleted * 2;
    
    // Apply prestige multiplier
    points = Math.floor(points * state.prestigeMultiplier);
    
    // Check for double prestige perk
    if (state.unlockedPrestigePerks.includes('double_prestige')) {
      points = Math.floor(points * 1.5);
    }
    
    return Math.max(1, points);
  }, [state.prestigeMultiplier, state.unlockedPrestigePerks]);

  const canPrestige = useCallback((): boolean => {
    // Minimum requirements to prestige
    return state.currentRunStats.levelsCompleted >= 10 || 
           state.currentRunStats.bossesDefeated >= 1 ||
           state.currentRunStats.totalScore >= 50000;
  }, [state.currentRunStats]);

  const performPrestige = useCallback(() => {
    if (!canPrestige()) return false;

    const earnedPoints = calculatePrestigePoints(state.currentRunStats);
    
    setState(prev => {
      // Update best run stats
      const newBestStats: RunStats = {
        totalScore: Math.max(prev.bestRunStats.totalScore, prev.currentRunStats.totalScore),
        pestsKilled: Math.max(prev.bestRunStats.pestsKilled, prev.currentRunStats.pestsKilled),
        bossesDefeated: Math.max(prev.bestRunStats.bossesDefeated, prev.currentRunStats.bossesDefeated),
        coinsEarned: Math.max(prev.bestRunStats.coinsEarned, prev.currentRunStats.coinsEarned),
        playTime: Math.max(prev.bestRunStats.playTime, prev.currentRunStats.playTime),
        maxCombo: Math.max(prev.bestRunStats.maxCombo, prev.currentRunStats.maxCombo),
        levelsCompleted: Math.max(prev.bestRunStats.levelsCompleted, prev.currentRunStats.levelsCompleted),
      };

      const newState = {
        ...prev,
        prestigeLevel: prev.prestigeLevel + 1,
        prestigePoints: prev.prestigePoints + earnedPoints,
        totalPrestigePointsEarned: prev.totalPrestigePointsEarned + earnedPoints,
        currentRunStats: { ...DEFAULT_RUN_STATS },
        bestRunStats: newBestStats,
        prestigeMultiplier: 1 + (prev.prestigeLevel + 1) * 0.1, // +10% per prestige level
      };

      savePrestigeData(newState);
      return newState;
    });

    return true;
  }, [canPrestige, calculatePrestigePoints, state.currentRunStats]);

  const purchasePerk = useCallback((perkId: string): boolean => {
    const perk = PRESTIGE_PERKS.find(p => p.id === perkId);
    if (!perk) return false;
    if (state.prestigeLevel < perk.requirement) return false;
    if (state.prestigePoints < perk.cost) return false;
    if (state.unlockedPrestigePerks.includes(perkId)) return false;

    setState(prev => {
      const newState = {
        ...prev,
        prestigePoints: prev.prestigePoints - perk.cost,
        unlockedPrestigePerks: [...prev.unlockedPrestigePerks, perkId],
      };
      savePrestigeData(newState);
      return newState;
    });

    return true;
  }, [state]);

  const updateRunStats = useCallback((updates: Partial<RunStats>) => {
    setState(prev => {
      const newState = {
        ...prev,
        currentRunStats: { ...prev.currentRunStats, ...updates },
      };
      savePrestigeData(newState);
      return newState;
    });
  }, []);

  const getPerkBonus = useCallback((effectType: string): number => {
    let total = 0;
    state.unlockedPrestigePerks.forEach(perkId => {
      const perk = PRESTIGE_PERKS.find(p => p.id === perkId);
      if (perk && perk.effect.type === effectType) {
        total += perk.effect.value;
      }
    });
    return total;
  }, [state.unlockedPrestigePerks]);

  const getAvailablePerks = useCallback(() => {
    return PRESTIGE_PERKS.filter(perk => 
      !state.unlockedPrestigePerks.includes(perk.id) &&
      state.prestigeLevel >= perk.requirement
    );
  }, [state.prestigeLevel, state.unlockedPrestigePerks]);

  return {
    state,
    canPrestige,
    performPrestige,
    purchasePerk,
    updateRunStats,
    getPerkBonus,
    getAvailablePerks,
    calculatePrestigePoints,
    PRESTIGE_PERKS,
  };
}

export default usePrestige;
