import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';

export interface GameProgress {
  currentLevel: number;
  totalScore: number;
  highScore: number;
  leafCurrency: number;
  pestsKilled: number;
  gamesPlayed: number;
  totalPlayTime: number;
  achievements: string[];
  inventory: { itemId: string; quantity: number }[];
  plants: { id: string; strain: string; growthStage: number; health: number }[];
  lastSyncedAt: string | null;
}

const DEFAULT_PROGRESS: GameProgress = {
  currentLevel: 1,
  totalScore: 0,
  highScore: 0,
  leafCurrency: 100,
  pestsKilled: 0,
  gamesPlayed: 0,
  totalPlayTime: 0,
  achievements: [],
  inventory: [],
  plants: [],
  lastSyncedAt: null,
};

const STORAGE_KEY = 'gameProgress';
const SYNC_INTERVAL = 60000; // 1 minute

export function useCloudSync() {
  const { user, isAuthenticated } = useAuth();
  const [progress, setProgress] = useState<GameProgress>(DEFAULT_PROGRESS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Load local progress on mount
  useEffect(() => {
    loadLocalProgress();
  }, []);

  // Auto-sync when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      syncWithCloud();
      
      // Set up periodic sync
      const interval = setInterval(syncWithCloud, SYNC_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user]);

  const loadLocalProgress = useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setProgress(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load local progress:', error);
    }
  }, []);

  const saveLocalProgress = useCallback(async (newProgress: GameProgress) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newProgress));
      setProgress(newProgress);
    } catch (error) {
      console.error('Failed to save local progress:', error);
    }
  }, []);

  const syncWithCloud = useCallback(async () => {
    if (!isAuthenticated || isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);

    try {
      // For now, just save locally since we don't have the tRPC endpoint set up
      // In production, this would call the tRPC sync endpoint
      const now = new Date().toISOString();
      const updatedProgress = { ...progress, lastSyncedAt: now };
      await saveLocalProgress(updatedProgress);
      setLastSyncTime(new Date());
      console.log('Progress synced at:', now);
    } catch (error: any) {
      console.error('Sync failed:', error);
      setSyncError(error.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
    }
  }, [isAuthenticated, isSyncing, progress, saveLocalProgress]);

  const updateProgress = useCallback(async (updates: Partial<GameProgress>) => {
    const newProgress = { ...progress, ...updates };
    await saveLocalProgress(newProgress);
    
    // Trigger cloud sync if authenticated
    if (isAuthenticated) {
      // Debounced sync - don't sync immediately on every update
      // The periodic sync will handle it
    }
  }, [progress, saveLocalProgress, isAuthenticated]);

  // Game-specific update methods
  const addScore = useCallback(async (points: number) => {
    const newTotal = progress.totalScore + points;
    const newHigh = Math.max(progress.highScore, newTotal);
    await updateProgress({ totalScore: newTotal, highScore: newHigh });
  }, [progress, updateProgress]);

  const addCurrency = useCallback(async (amount: number) => {
    await updateProgress({ leafCurrency: progress.leafCurrency + amount });
  }, [progress, updateProgress]);

  const spendCurrency = useCallback(async (amount: number): Promise<boolean> => {
    if (progress.leafCurrency < amount) return false;
    await updateProgress({ leafCurrency: progress.leafCurrency - amount });
    return true;
  }, [progress, updateProgress]);

  const incrementPestsKilled = useCallback(async (count: number = 1) => {
    await updateProgress({ pestsKilled: progress.pestsKilled + count });
  }, [progress, updateProgress]);

  const incrementGamesPlayed = useCallback(async () => {
    await updateProgress({ gamesPlayed: progress.gamesPlayed + 1 });
  }, [progress, updateProgress]);

  const addPlayTime = useCallback(async (seconds: number) => {
    await updateProgress({ totalPlayTime: progress.totalPlayTime + seconds });
  }, [progress, updateProgress]);

  const unlockAchievement = useCallback(async (achievementId: string) => {
    if (progress.achievements.includes(achievementId)) return false;
    await updateProgress({ achievements: [...progress.achievements, achievementId] });
    return true;
  }, [progress, updateProgress]);

  const addToInventory = useCallback(async (itemId: string, quantity: number = 1) => {
    const existing = progress.inventory.find(i => i.itemId === itemId);
    let newInventory;
    if (existing) {
      newInventory = progress.inventory.map(i => 
        i.itemId === itemId ? { ...i, quantity: i.quantity + quantity } : i
      );
    } else {
      newInventory = [...progress.inventory, { itemId, quantity }];
    }
    await updateProgress({ inventory: newInventory });
  }, [progress, updateProgress]);

  const removeFromInventory = useCallback(async (itemId: string, quantity: number = 1): Promise<boolean> => {
    const existing = progress.inventory.find(i => i.itemId === itemId);
    if (!existing || existing.quantity < quantity) return false;
    
    let newInventory;
    if (existing.quantity === quantity) {
      newInventory = progress.inventory.filter(i => i.itemId !== itemId);
    } else {
      newInventory = progress.inventory.map(i => 
        i.itemId === itemId ? { ...i, quantity: i.quantity - quantity } : i
      );
    }
    await updateProgress({ inventory: newInventory });

    return true;
  }, [progress, updateProgress]);

  const levelUp = useCallback(async () => {
    await updateProgress({ currentLevel: progress.currentLevel + 1 });
  }, [progress, updateProgress]);

  const resetProgress = useCallback(async () => {
    await saveLocalProgress(DEFAULT_PROGRESS);
  }, [saveLocalProgress]);

  return {
    progress,
    isSyncing,
    lastSyncTime,
    syncError,
    syncWithCloud,
    updateProgress,
    addScore,
    addCurrency,
    spendCurrency,
    incrementPestsKilled,
    incrementGamesPlayed,
    addPlayTime,
    unlockAchievement,
    addToInventory,
    removeFromInventory,
    levelUp,
    resetProgress,
  };
}

export default useCloudSync;
