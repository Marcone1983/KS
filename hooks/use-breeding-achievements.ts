/**
 * Breeding Achievements Hook
 * 
 * Tracks and unlocks achievements related to breeding:
 * - First hybrid created
 * - Rarity milestones (first rare, epic, legendary)
 * - Generation milestones (Gen 3, 5, 10)
 * - Stat records (THC 90+, CBD 90+, etc.)
 * - Collection milestones (10, 50, 100 hybrids)
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HybridPlant, HybridStats } from './use-hybrid-storage';

const ACHIEVEMENTS_KEY = 'ks_breeding_achievements';
const ACHIEVEMENT_NOTIFICATIONS_KEY = 'ks_achievement_notifications';

// Achievement definition
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'breeding' | 'rarity' | 'generation' | 'stats' | 'collection';
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number;
}

// All available achievements
const ACHIEVEMENTS_LIST: Omit<Achievement, 'unlockedAt' | 'progress'>[] = [
  // Breeding achievements
  {
    id: 'first_hybrid',
    name: 'Primo Incrocio',
    description: 'Crea il tuo primo ibrido',
    icon: '🌱',
    category: 'breeding',
    rarity: 'bronze',
  },
  {
    id: 'breeding_novice',
    name: 'Allevatore Novizio',
    description: 'Crea 5 ibridi',
    icon: '🌿',
    category: 'breeding',
    rarity: 'bronze',
    maxProgress: 5,
  },
  {
    id: 'breeding_apprentice',
    name: 'Allevatore Apprendista',
    description: 'Crea 15 ibridi',
    icon: '🪴',
    category: 'breeding',
    rarity: 'silver',
    maxProgress: 15,
  },
  {
    id: 'breeding_expert',
    name: 'Allevatore Esperto',
    description: 'Crea 50 ibridi',
    icon: '🌳',
    category: 'breeding',
    rarity: 'gold',
    maxProgress: 50,
  },
  {
    id: 'breeding_master',
    name: 'Maestro Allevatore',
    description: 'Crea 100 ibridi',
    icon: '👨‍🌾',
    category: 'breeding',
    rarity: 'platinum',
    maxProgress: 100,
  },

  // Rarity achievements
  {
    id: 'first_rare',
    name: 'Scoperta Rara',
    description: 'Ottieni il tuo primo ibrido raro',
    icon: '💎',
    category: 'rarity',
    rarity: 'bronze',
  },
  {
    id: 'first_epic',
    name: 'Scoperta Epica',
    description: 'Ottieni il tuo primo ibrido epico',
    icon: '🔮',
    category: 'rarity',
    rarity: 'silver',
  },
  {
    id: 'first_legendary',
    name: 'Scoperta Leggendaria',
    description: 'Ottieni il tuo primo ibrido leggendario',
    icon: '⭐',
    category: 'rarity',
    rarity: 'gold',
  },
  {
    id: 'legendary_collector',
    name: 'Collezionista Leggendario',
    description: 'Ottieni 5 ibridi leggendari',
    icon: '🌟',
    category: 'rarity',
    rarity: 'platinum',
    maxProgress: 5,
  },
  {
    id: 'epic_collector',
    name: 'Collezionista Epico',
    description: 'Ottieni 10 ibridi epici',
    icon: '💜',
    category: 'rarity',
    rarity: 'gold',
    maxProgress: 10,
  },

  // Generation achievements
  {
    id: 'gen_3',
    name: 'Terza Generazione',
    description: 'Crea un ibrido di 3ª generazione',
    icon: '3️⃣',
    category: 'generation',
    rarity: 'bronze',
  },
  {
    id: 'gen_5',
    name: 'Quinta Generazione',
    description: 'Crea un ibrido di 5ª generazione',
    icon: '5️⃣',
    category: 'generation',
    rarity: 'silver',
  },
  {
    id: 'gen_10',
    name: 'Decima Generazione',
    description: 'Crea un ibrido di 10ª generazione',
    icon: '🔟',
    category: 'generation',
    rarity: 'gold',
  },
  {
    id: 'gen_20',
    name: 'Ventesima Generazione',
    description: 'Crea un ibrido di 20ª generazione',
    icon: '🏆',
    category: 'generation',
    rarity: 'platinum',
  },

  // Stats achievements
  {
    id: 'high_thc',
    name: 'THC Elevato',
    description: 'Crea un ibrido con THC 80%+',
    icon: '🔥',
    category: 'stats',
    rarity: 'silver',
  },
  {
    id: 'max_thc',
    name: 'THC Massimo',
    description: 'Crea un ibrido con THC 95%+',
    icon: '💥',
    category: 'stats',
    rarity: 'platinum',
  },
  {
    id: 'high_cbd',
    name: 'CBD Elevato',
    description: 'Crea un ibrido con CBD 80%+',
    icon: '💚',
    category: 'stats',
    rarity: 'silver',
  },
  {
    id: 'max_cbd',
    name: 'CBD Massimo',
    description: 'Crea un ibrido con CBD 95%+',
    icon: '🍀',
    category: 'stats',
    rarity: 'platinum',
  },
  {
    id: 'high_yield',
    name: 'Alta Resa',
    description: 'Crea un ibrido con Resa 85%+',
    icon: '📈',
    category: 'stats',
    rarity: 'silver',
  },
  {
    id: 'balanced',
    name: 'Equilibrio Perfetto',
    description: 'Crea un ibrido con THC e CBD entrambi sopra 70%',
    icon: '⚖️',
    category: 'stats',
    rarity: 'gold',
  },
  {
    id: 'all_stats_high',
    name: 'Perfezione Genetica',
    description: 'Crea un ibrido con tutte le statistiche sopra 80%',
    icon: '🧬',
    category: 'stats',
    rarity: 'platinum',
  },

  // Collection achievements
  {
    id: 'collection_10',
    name: 'Piccola Collezione',
    description: 'Salva 10 ibridi nella collezione',
    icon: '📦',
    category: 'collection',
    rarity: 'bronze',
    maxProgress: 10,
  },
  {
    id: 'collection_25',
    name: 'Collezione Media',
    description: 'Salva 25 ibridi nella collezione',
    icon: '🗃️',
    category: 'collection',
    rarity: 'silver',
    maxProgress: 25,
  },
  {
    id: 'collection_50',
    name: 'Grande Collezione',
    description: 'Salva 50 ibridi nella collezione',
    icon: '🏛️',
    category: 'collection',
    rarity: 'gold',
    maxProgress: 50,
  },
  {
    id: 'collection_100',
    name: 'Collezione Monumentale',
    description: 'Salva 100 ibridi nella collezione',
    icon: '🏰',
    category: 'collection',
    rarity: 'platinum',
    maxProgress: 100,
  },
];

// Rarity colors and points
export const RARITY_CONFIG = {
  bronze: { color: '#CD7F32', points: 10 },
  silver: { color: '#C0C0C0', points: 25 },
  gold: { color: '#FFD700', points: 50 },
  platinum: { color: '#E5E4E2', points: 100 },
};

interface UseBreedingAchievementsReturn {
  achievements: Achievement[];
  unlockedAchievements: Achievement[];
  lockedAchievements: Achievement[];
  totalPoints: number;
  pendingNotifications: Achievement[];
  
  // Check and unlock
  checkAchievements: (hybrids: HybridPlant[], stats: HybridStats) => Promise<Achievement[]>;
  checkNewHybrid: (hybrid: HybridPlant, hybrids: HybridPlant[]) => Promise<Achievement[]>;
  
  // Notifications
  dismissNotification: (achievementId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  
  // Stats
  getProgress: (achievementId: string) => { current: number; max: number } | null;
  getCategoryProgress: (category: Achievement['category']) => { unlocked: number; total: number };
  
  // Utility
  isLoading: boolean;
  resetAchievements: () => Promise<void>;
}

export function useBreedingAchievements(): UseBreedingAchievementsReturn {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [pendingNotifications, setPendingNotifications] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load achievements on mount
  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    setIsLoading(true);
    try {
      const [savedData, notificationsData] = await Promise.all([
        AsyncStorage.getItem(ACHIEVEMENTS_KEY),
        AsyncStorage.getItem(ACHIEVEMENT_NOTIFICATIONS_KEY),
      ]);

      const savedAchievements: Record<string, { unlockedAt: number; progress?: number }> = 
        savedData ? JSON.parse(savedData) : {};
      
      const notifications: string[] = notificationsData ? JSON.parse(notificationsData) : [];

      // Merge saved data with achievement definitions
      const mergedAchievements = ACHIEVEMENTS_LIST.map(achievement => ({
        ...achievement,
        unlockedAt: savedAchievements[achievement.id]?.unlockedAt,
        progress: savedAchievements[achievement.id]?.progress || 0,
      }));

      setAchievements(mergedAchievements);
      
      // Set pending notifications
      const pending = mergedAchievements.filter(a => notifications.includes(a.id));
      setPendingNotifications(pending);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveAchievements = async (newAchievements: Achievement[]) => {
    try {
      const toSave: Record<string, { unlockedAt?: number; progress?: number }> = {};
      newAchievements.forEach(a => {
        if (a.unlockedAt || a.progress) {
          toSave[a.id] = { unlockedAt: a.unlockedAt, progress: a.progress };
        }
      });
      await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(toSave));
      setAchievements(newAchievements);
    } catch (error) {
      console.error('Failed to save achievements:', error);
    }
  };

  const addNotification = async (achievement: Achievement) => {
    try {
      const data = await AsyncStorage.getItem(ACHIEVEMENT_NOTIFICATIONS_KEY);
      const notifications: string[] = data ? JSON.parse(data) : [];
      if (!notifications.includes(achievement.id)) {
        notifications.push(achievement.id);
        await AsyncStorage.setItem(ACHIEVEMENT_NOTIFICATIONS_KEY, JSON.stringify(notifications));
        setPendingNotifications(prev => [...prev, achievement]);
      }
    } catch (error) {
      console.error('Failed to add notification:', error);
    }
  };

  const dismissNotification = useCallback(async (achievementId: string) => {
    try {
      const data = await AsyncStorage.getItem(ACHIEVEMENT_NOTIFICATIONS_KEY);
      const notifications: string[] = data ? JSON.parse(data) : [];
      const filtered = notifications.filter(id => id !== achievementId);
      await AsyncStorage.setItem(ACHIEVEMENT_NOTIFICATIONS_KEY, JSON.stringify(filtered));
      setPendingNotifications(prev => prev.filter(a => a.id !== achievementId));
    } catch (error) {
      console.error('Failed to dismiss notification:', error);
    }
  }, []);

  const clearAllNotifications = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ACHIEVEMENT_NOTIFICATIONS_KEY, JSON.stringify([]));
      setPendingNotifications([]);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }, []);

  // Check all achievements based on current state
  const checkAchievements = useCallback(async (
    hybrids: HybridPlant[], 
    stats: HybridStats
  ): Promise<Achievement[]> => {
    const newlyUnlocked: Achievement[] = [];
    const updatedAchievements = [...achievements];

    for (let i = 0; i < updatedAchievements.length; i++) {
      const achievement = updatedAchievements[i];
      if (achievement.unlockedAt) continue; // Already unlocked

      let shouldUnlock = false;
      let newProgress = achievement.progress || 0;

      switch (achievement.id) {
        // Breeding achievements
        case 'first_hybrid':
          shouldUnlock = stats.totalHybridsCreated >= 1;
          break;
        case 'breeding_novice':
          newProgress = stats.totalHybridsCreated;
          shouldUnlock = stats.totalHybridsCreated >= 5;
          break;
        case 'breeding_apprentice':
          newProgress = stats.totalHybridsCreated;
          shouldUnlock = stats.totalHybridsCreated >= 15;
          break;
        case 'breeding_expert':
          newProgress = stats.totalHybridsCreated;
          shouldUnlock = stats.totalHybridsCreated >= 50;
          break;
        case 'breeding_master':
          newProgress = stats.totalHybridsCreated;
          shouldUnlock = stats.totalHybridsCreated >= 100;
          break;

        // Rarity achievements
        case 'first_rare':
          shouldUnlock = stats.rareCount >= 1;
          break;
        case 'first_epic':
          shouldUnlock = stats.epicCount >= 1;
          break;
        case 'first_legendary':
          shouldUnlock = stats.legendaryCount >= 1;
          break;
        case 'legendary_collector':
          newProgress = stats.legendaryCount;
          shouldUnlock = stats.legendaryCount >= 5;
          break;
        case 'epic_collector':
          newProgress = stats.epicCount;
          shouldUnlock = stats.epicCount >= 10;
          break;

        // Generation achievements
        case 'gen_3':
          shouldUnlock = stats.highestGeneration >= 3;
          break;
        case 'gen_5':
          shouldUnlock = stats.highestGeneration >= 5;
          break;
        case 'gen_10':
          shouldUnlock = stats.highestGeneration >= 10;
          break;
        case 'gen_20':
          shouldUnlock = stats.highestGeneration >= 20;
          break;

        // Stats achievements
        case 'high_thc':
          shouldUnlock = stats.bestThc >= 80;
          break;
        case 'max_thc':
          shouldUnlock = stats.bestThc >= 95;
          break;
        case 'high_cbd':
          shouldUnlock = stats.bestCbd >= 80;
          break;
        case 'max_cbd':
          shouldUnlock = stats.bestCbd >= 95;
          break;
        case 'high_yield':
          shouldUnlock = stats.bestYield >= 85;
          break;
        case 'balanced':
          shouldUnlock = hybrids.some(h => h.genetics.thc >= 70 && h.genetics.cbd >= 70);
          break;
        case 'all_stats_high':
          shouldUnlock = hybrids.some(h => 
            h.genetics.thc >= 80 && 
            h.genetics.cbd >= 80 && 
            h.genetics.yield >= 80 && 
            h.genetics.resistance >= 80 &&
            h.genetics.growth >= 80 &&
            h.genetics.potency >= 80
          );
          break;

        // Collection achievements
        case 'collection_10':
          newProgress = hybrids.length;
          shouldUnlock = hybrids.length >= 10;
          break;
        case 'collection_25':
          newProgress = hybrids.length;
          shouldUnlock = hybrids.length >= 25;
          break;
        case 'collection_50':
          newProgress = hybrids.length;
          shouldUnlock = hybrids.length >= 50;
          break;
        case 'collection_100':
          newProgress = hybrids.length;
          shouldUnlock = hybrids.length >= 100;
          break;
      }

      // Update progress
      if (achievement.maxProgress) {
        updatedAchievements[i] = { ...achievement, progress: newProgress };
      }

      // Unlock achievement
      if (shouldUnlock) {
        updatedAchievements[i] = { 
          ...updatedAchievements[i], 
          unlockedAt: Date.now(),
          progress: achievement.maxProgress || undefined,
        };
        newlyUnlocked.push(updatedAchievements[i]);
        await addNotification(updatedAchievements[i]);
      }
    }

    await saveAchievements(updatedAchievements);
    return newlyUnlocked;
  }, [achievements]);

  // Check achievements for a newly created hybrid
  const checkNewHybrid = useCallback(async (
    hybrid: HybridPlant,
    hybrids: HybridPlant[]
  ): Promise<Achievement[]> => {
    // Calculate stats from hybrids
    const stats: HybridStats = {
      totalHybridsCreated: hybrids.length,
      legendaryCount: hybrids.filter(h => h.rarity === 'legendary').length,
      epicCount: hybrids.filter(h => h.rarity === 'epic').length,
      rareCount: hybrids.filter(h => h.rarity === 'rare').length,
      commonCount: hybrids.filter(h => h.rarity === 'common').length,
      highestGeneration: Math.max(...hybrids.map(h => h.generation), 0),
      bestThc: Math.max(...hybrids.map(h => h.genetics.thc), 0),
      bestCbd: Math.max(...hybrids.map(h => h.genetics.cbd), 0),
      bestYield: Math.max(...hybrids.map(h => h.genetics.yield), 0),
      favoriteStrains: [],
      lastBreedingDate: Date.now(),
    };

    return checkAchievements(hybrids, stats);
  }, [checkAchievements]);

  // Get progress for a specific achievement
  const getProgress = useCallback((achievementId: string): { current: number; max: number } | null => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement || !achievement.maxProgress) return null;
    return {
      current: achievement.progress || 0,
      max: achievement.maxProgress,
    };
  }, [achievements]);

  // Get category progress
  const getCategoryProgress = useCallback((category: Achievement['category']): { unlocked: number; total: number } => {
    const categoryAchievements = achievements.filter(a => a.category === category);
    const unlocked = categoryAchievements.filter(a => a.unlockedAt).length;
    return { unlocked, total: categoryAchievements.length };
  }, [achievements]);

  // Reset all achievements
  const resetAchievements = useCallback(async () => {
    await AsyncStorage.multiRemove([ACHIEVEMENTS_KEY, ACHIEVEMENT_NOTIFICATIONS_KEY]);
    const resetList = ACHIEVEMENTS_LIST.map(a => ({ ...a, unlockedAt: undefined, progress: 0 }));
    setAchievements(resetList);
    setPendingNotifications([]);
  }, []);

  // Derived values
  const unlockedAchievements = achievements.filter(a => a.unlockedAt);
  const lockedAchievements = achievements.filter(a => !a.unlockedAt);
  const totalPoints = unlockedAchievements.reduce(
    (sum, a) => sum + RARITY_CONFIG[a.rarity].points, 
    0
  );

  return {
    achievements,
    unlockedAchievements,
    lockedAchievements,
    totalPoints,
    pendingNotifications,
    checkAchievements,
    checkNewHybrid,
    dismissNotification,
    clearAllNotifications,
    getProgress,
    getCategoryProgress,
    isLoading,
    resetAchievements,
  };
}

export default useBreedingAchievements;
