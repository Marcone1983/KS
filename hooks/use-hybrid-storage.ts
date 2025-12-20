/**
 * Hybrid Plant Storage Hook
 * 
 * Manages persistent storage of hybrid plants created through breeding:
 * - Save new hybrids to AsyncStorage
 * - Load hybrid collection
 * - Update hybrid stats
 * - Delete hybrids
 * - Export/Import collection
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const HYBRIDS_STORAGE_KEY = 'ks_hybrid_plants';
const HYBRID_STATS_KEY = 'ks_hybrid_stats';
const FAVORITE_HYBRIDS_KEY = 'ks_favorite_hybrids';

// Genetic trait interface
export interface GeneticTraits {
  thc: number;        // 0-100
  cbd: number;        // 0-100
  yield: number;      // 0-100
  flowerTime: number; // 0-100 (lower = faster)
  resistance: number; // 0-100
  growth: number;     // 0-100
  potency: number;    // 0-100
  terpenes: string[]; // Array of terpene names
}

// Hybrid plant interface
export interface HybridPlant {
  id: string;
  name: string;
  strain: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;
  genetics: GeneticTraits;
  
  // Lineage
  parent1Id: string;
  parent1Name: string;
  parent2Id: string;
  parent2Name: string;
  generation: number;
  
  // Metadata
  createdAt: number;
  timesUsedAsParent: number;
  timesHarvested: number;
  bestYield: number;
  
  // Visual
  stage: number;
  imageUrl?: string;
}

// Breeding stats
export interface HybridStats {
  totalHybridsCreated: number;
  legendaryCount: number;
  epicCount: number;
  rareCount: number;
  commonCount: number;
  highestGeneration: number;
  bestThc: number;
  bestCbd: number;
  bestYield: number;
  favoriteStrains: string[];
  lastBreedingDate: number;
}

// Default stats
const DEFAULT_STATS: HybridStats = {
  totalHybridsCreated: 0,
  legendaryCount: 0,
  epicCount: 0,
  rareCount: 0,
  commonCount: 0,
  highestGeneration: 0,
  bestThc: 0,
  bestCbd: 0,
  bestYield: 0,
  favoriteStrains: [],
  lastBreedingDate: 0,
};

// Hook return type
interface UseHybridStorageReturn {
  // Data
  hybrids: HybridPlant[];
  favorites: string[];
  stats: HybridStats;
  isLoading: boolean;
  error: string | null;
  
  // CRUD operations
  saveHybrid: (hybrid: HybridPlant) => Promise<boolean>;
  updateHybrid: (id: string, updates: Partial<HybridPlant>) => Promise<boolean>;
  deleteHybrid: (id: string) => Promise<boolean>;
  getHybridById: (id: string) => HybridPlant | undefined;
  
  // Favorites
  toggleFavorite: (id: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  
  // Queries
  getHybridsByRarity: (rarity: HybridPlant['rarity']) => HybridPlant[];
  getHybridsByGeneration: (generation: number) => HybridPlant[];
  getHybridsByParent: (parentId: string) => HybridPlant[];
  searchHybrids: (query: string) => HybridPlant[];
  sortHybrids: (by: 'date' | 'rarity' | 'thc' | 'cbd' | 'yield' | 'name') => HybridPlant[];
  
  // Stats
  refreshStats: () => Promise<void>;
  
  // Import/Export
  exportCollection: () => Promise<string>;
  importCollection: (data: string) => Promise<boolean>;
  
  // Utility
  clearAllHybrids: () => Promise<void>;
  getCollectionSize: () => number;
}

export function useHybridStorage(): UseHybridStorageReturn {
  const [hybrids, setHybrids] = useState<HybridPlant[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [stats, setStats] = useState<HybridStats>(DEFAULT_STATS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data on mount
  useEffect(() => {
    loadAllData();
  }, []);

  // Load all data from storage
  const loadAllData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const [hybridsData, favoritesData, statsData] = await Promise.all([
        AsyncStorage.getItem(HYBRIDS_STORAGE_KEY),
        AsyncStorage.getItem(FAVORITE_HYBRIDS_KEY),
        AsyncStorage.getItem(HYBRID_STATS_KEY),
      ]);

      if (hybridsData) {
        setHybrids(JSON.parse(hybridsData));
      }
      
      if (favoritesData) {
        setFavorites(JSON.parse(favoritesData));
      }
      
      if (statsData) {
        setStats({ ...DEFAULT_STATS, ...JSON.parse(statsData) });
      }
    } catch (err) {
      console.error('Failed to load hybrid data:', err);
      setError('Errore nel caricamento della collezione');
    } finally {
      setIsLoading(false);
    }
  };

  // Save hybrids to storage
  const persistHybrids = async (newHybrids: HybridPlant[]) => {
    try {
      await AsyncStorage.setItem(HYBRIDS_STORAGE_KEY, JSON.stringify(newHybrids));
      setHybrids(newHybrids);
      return true;
    } catch (err) {
      console.error('Failed to save hybrids:', err);
      setError('Errore nel salvataggio');
      return false;
    }
  };

  // Save favorites to storage
  const persistFavorites = async (newFavorites: string[]) => {
    try {
      await AsyncStorage.setItem(FAVORITE_HYBRIDS_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (err) {
      console.error('Failed to save favorites:', err);
    }
  };

  // Save stats to storage
  const persistStats = async (newStats: HybridStats) => {
    try {
      await AsyncStorage.setItem(HYBRID_STATS_KEY, JSON.stringify(newStats));
      setStats(newStats);
    } catch (err) {
      console.error('Failed to save stats:', err);
    }
  };

  // Save a new hybrid
  const saveHybrid = useCallback(async (hybrid: HybridPlant): Promise<boolean> => {
    // Check for duplicate
    if (hybrids.some(h => h.id === hybrid.id)) {
      console.warn('Hybrid with this ID already exists');
      return false;
    }

    const newHybrids = [...hybrids, hybrid];
    const success = await persistHybrids(newHybrids);

    if (success) {
      // Update stats
      const newStats = { ...stats };
      newStats.totalHybridsCreated++;
      newStats.lastBreedingDate = Date.now();
      
      switch (hybrid.rarity) {
        case 'legendary': newStats.legendaryCount++; break;
        case 'epic': newStats.epicCount++; break;
        case 'rare': newStats.rareCount++; break;
        case 'common': newStats.commonCount++; break;
      }
      
      if (hybrid.generation > newStats.highestGeneration) {
        newStats.highestGeneration = hybrid.generation;
      }
      if (hybrid.genetics.thc > newStats.bestThc) {
        newStats.bestThc = hybrid.genetics.thc;
      }
      if (hybrid.genetics.cbd > newStats.bestCbd) {
        newStats.bestCbd = hybrid.genetics.cbd;
      }
      if (hybrid.genetics.yield > newStats.bestYield) {
        newStats.bestYield = hybrid.genetics.yield;
      }
      
      await persistStats(newStats);
    }

    return success;
  }, [hybrids, stats]);

  // Update an existing hybrid
  const updateHybrid = useCallback(async (
    id: string, 
    updates: Partial<HybridPlant>
  ): Promise<boolean> => {
    const index = hybrids.findIndex(h => h.id === id);
    if (index === -1) {
      console.warn('Hybrid not found:', id);
      return false;
    }

    const newHybrids = [...hybrids];
    newHybrids[index] = { ...newHybrids[index], ...updates };
    
    return persistHybrids(newHybrids);
  }, [hybrids]);

  // Delete a hybrid
  const deleteHybrid = useCallback(async (id: string): Promise<boolean> => {
    const newHybrids = hybrids.filter(h => h.id !== id);
    
    if (newHybrids.length === hybrids.length) {
      console.warn('Hybrid not found:', id);
      return false;
    }

    const success = await persistHybrids(newHybrids);
    
    if (success) {
      // Remove from favorites if present
      if (favorites.includes(id)) {
        await persistFavorites(favorites.filter(f => f !== id));
      }
    }

    return success;
  }, [hybrids, favorites]);

  // Get hybrid by ID
  const getHybridById = useCallback((id: string): HybridPlant | undefined => {
    return hybrids.find(h => h.id === id);
  }, [hybrids]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (id: string) => {
    const newFavorites = favorites.includes(id)
      ? favorites.filter(f => f !== id)
      : [...favorites, id];
    
    await persistFavorites(newFavorites);
  }, [favorites]);

  // Check if favorite
  const isFavorite = useCallback((id: string): boolean => {
    return favorites.includes(id);
  }, [favorites]);

  // Get hybrids by rarity
  const getHybridsByRarity = useCallback((rarity: HybridPlant['rarity']): HybridPlant[] => {
    return hybrids.filter(h => h.rarity === rarity);
  }, [hybrids]);

  // Get hybrids by generation
  const getHybridsByGeneration = useCallback((generation: number): HybridPlant[] => {
    return hybrids.filter(h => h.generation === generation);
  }, [hybrids]);

  // Get hybrids by parent
  const getHybridsByParent = useCallback((parentId: string): HybridPlant[] => {
    return hybrids.filter(h => h.parent1Id === parentId || h.parent2Id === parentId);
  }, [hybrids]);

  // Search hybrids
  const searchHybrids = useCallback((query: string): HybridPlant[] => {
    const lowerQuery = query.toLowerCase();
    return hybrids.filter(h => 
      h.name.toLowerCase().includes(lowerQuery) ||
      h.strain.toLowerCase().includes(lowerQuery) ||
      h.parent1Name.toLowerCase().includes(lowerQuery) ||
      h.parent2Name.toLowerCase().includes(lowerQuery)
    );
  }, [hybrids]);

  // Sort hybrids
  const sortHybrids = useCallback((by: 'date' | 'rarity' | 'thc' | 'cbd' | 'yield' | 'name'): HybridPlant[] => {
    const sorted = [...hybrids];
    
    switch (by) {
      case 'date':
        return sorted.sort((a, b) => b.createdAt - a.createdAt);
      case 'rarity':
        const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
        return sorted.sort((a, b) => rarityOrder[a.rarity] - rarityOrder[b.rarity]);
      case 'thc':
        return sorted.sort((a, b) => b.genetics.thc - a.genetics.thc);
      case 'cbd':
        return sorted.sort((a, b) => b.genetics.cbd - a.genetics.cbd);
      case 'yield':
        return sorted.sort((a, b) => b.genetics.yield - a.genetics.yield);
      case 'name':
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return sorted;
    }
  }, [hybrids]);

  // Refresh stats from current data
  const refreshStats = useCallback(async () => {
    const newStats: HybridStats = {
      totalHybridsCreated: hybrids.length,
      legendaryCount: hybrids.filter(h => h.rarity === 'legendary').length,
      epicCount: hybrids.filter(h => h.rarity === 'epic').length,
      rareCount: hybrids.filter(h => h.rarity === 'rare').length,
      commonCount: hybrids.filter(h => h.rarity === 'common').length,
      highestGeneration: Math.max(0, ...hybrids.map(h => h.generation)),
      bestThc: Math.max(0, ...hybrids.map(h => h.genetics.thc)),
      bestCbd: Math.max(0, ...hybrids.map(h => h.genetics.cbd)),
      bestYield: Math.max(0, ...hybrids.map(h => h.genetics.yield)),
      favoriteStrains: favorites,
      lastBreedingDate: stats.lastBreedingDate,
    };
    
    await persistStats(newStats);
  }, [hybrids, favorites, stats.lastBreedingDate]);

  // Export collection as JSON string
  const exportCollection = useCallback(async (): Promise<string> => {
    const exportData = {
      version: 1,
      exportDate: Date.now(),
      hybrids,
      favorites,
      stats,
    };
    return JSON.stringify(exportData, null, 2);
  }, [hybrids, favorites, stats]);

  // Import collection from JSON string
  const importCollection = useCallback(async (data: string): Promise<boolean> => {
    try {
      const importData = JSON.parse(data);
      
      if (!importData.version || !importData.hybrids) {
        throw new Error('Invalid import format');
      }

      // Merge with existing data (don't overwrite)
      const existingIds = new Set(hybrids.map(h => h.id));
      const newHybrids = importData.hybrids.filter(
        (h: HybridPlant) => !existingIds.has(h.id)
      );

      if (newHybrids.length > 0) {
        await persistHybrids([...hybrids, ...newHybrids]);
      }

      // Merge favorites
      const newFavorites = [...new Set([...favorites, ...(importData.favorites || [])])];
      await persistFavorites(newFavorites);

      // Refresh stats
      await refreshStats();

      return true;
    } catch (err) {
      console.error('Failed to import collection:', err);
      setError('Errore nell\'importazione');
      return false;
    }
  }, [hybrids, favorites, refreshStats]);

  // Clear all hybrids
  const clearAllHybrids = useCallback(async () => {
    await AsyncStorage.multiRemove([
      HYBRIDS_STORAGE_KEY,
      FAVORITE_HYBRIDS_KEY,
      HYBRID_STATS_KEY,
    ]);
    
    setHybrids([]);
    setFavorites([]);
    setStats(DEFAULT_STATS);
  }, []);

  // Get collection size
  const getCollectionSize = useCallback((): number => {
    return hybrids.length;
  }, [hybrids]);

  return {
    // Data
    hybrids,
    favorites,
    stats,
    isLoading,
    error,
    
    // CRUD
    saveHybrid,
    updateHybrid,
    deleteHybrid,
    getHybridById,
    
    // Favorites
    toggleFavorite,
    isFavorite,
    
    // Queries
    getHybridsByRarity,
    getHybridsByGeneration,
    getHybridsByParent,
    searchHybrids,
    sortHybrids,
    
    // Stats
    refreshStats,
    
    // Import/Export
    exportCollection,
    importCollection,
    
    // Utility
    clearAllHybrids,
    getCollectionSize,
  };
}

// Helper function to create a new hybrid from breeding
export function createHybridFromBreeding(
  parent1: HybridPlant | { id: string; name: string; genetics: GeneticTraits; generation?: number },
  parent2: HybridPlant | { id: string; name: string; genetics: GeneticTraits; generation?: number }
): HybridPlant {
  const g1 = parent1.genetics;
  const g2 = parent2.genetics;
  
  // Calculate offspring genetics with some randomness
  const calculateTrait = (t1: number, t2: number): number => {
    const base = (t1 + t2) / 2;
    const variation = (Math.random() - 0.5) * 20; // ±10 variation
    return Math.max(0, Math.min(100, Math.round(base + variation)));
  };

  const genetics: GeneticTraits = {
    thc: calculateTrait(g1.thc, g2.thc),
    cbd: calculateTrait(g1.cbd, g2.cbd),
    yield: calculateTrait(g1.yield, g2.yield),
    flowerTime: calculateTrait(g1.flowerTime, g2.flowerTime),
    resistance: calculateTrait(g1.resistance, g2.resistance),
    growth: calculateTrait(g1.growth, g2.growth),
    potency: calculateTrait(g1.potency, g2.potency),
    terpenes: [...new Set([
      ...(g1.terpenes || []).slice(0, 2),
      ...(g2.terpenes || []).slice(0, 2),
    ])],
  };

  // Calculate rarity based on average stats
  const avgStat = (genetics.thc + genetics.cbd + genetics.yield + genetics.resistance + genetics.potency) / 5;
  let rarity: HybridPlant['rarity'] = 'common';
  if (avgStat >= 85) rarity = 'legendary';
  else if (avgStat >= 70) rarity = 'epic';
  else if (avgStat >= 55) rarity = 'rare';

  // Generate name
  const name1Parts = parent1.name.split(' ');
  const name2Parts = parent2.name.split(' ');
  const newName = `${name1Parts[0]} ${name2Parts[name2Parts.length - 1] || 'Hybrid'}`;

  // Generate color based on genetics
  const hue = (genetics.thc * 1.2 + genetics.cbd * 0.8) % 360;
  const saturation = 50 + genetics.potency * 0.3;
  const lightness = 40 + genetics.yield * 0.2;
  const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  const gen1 = (parent1 as HybridPlant).generation || 0;
  const gen2 = (parent2 as HybridPlant).generation || 0;

  return {
    id: `hybrid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: newName,
    strain: `${parent1.name} x ${parent2.name}`,
    rarity,
    color,
    genetics,
    parent1Id: parent1.id,
    parent1Name: parent1.name,
    parent2Id: parent2.id,
    parent2Name: parent2.name,
    generation: Math.max(gen1, gen2) + 1,
    createdAt: Date.now(),
    timesUsedAsParent: 0,
    timesHarvested: 0,
    bestYield: 0,
    stage: 1,
  };
}

export default useHybridStorage;
