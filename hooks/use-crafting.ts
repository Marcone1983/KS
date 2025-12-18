import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CraftingMaterial {
  id: string;
  name: string;
  icon: string;
  rarity: ItemRarity;
  description: string;
  maxStack: number;
}

export interface CraftingRecipe {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'spray' | 'potion' | 'equipment' | 'decoration' | 'consumable';
  rarity: ItemRarity;
  materials: { materialId: string; amount: number }[];
  craftTime: number; // seconds
  unlockLevel: number;
  stats?: Record<string, number>;
}

export interface CraftingQueue {
  recipeId: string;
  startTime: number;
  endTime: number;
}

interface CraftingState {
  materials: Record<string, number>;
  craftedItems: Record<string, number>;
  unlockedRecipes: string[];
  craftingQueue: CraftingQueue[];
  craftingLevel: number;
  craftingXp: number;
  totalCrafted: number;
}

const STORAGE_KEY = '@kurstaki_crafting';

const MATERIALS: CraftingMaterial[] = [
  { id: 'leaf_green', name: 'Foglia Verde', icon: '🍃', rarity: 'common', description: 'Foglia comune', maxStack: 999 },
  { id: 'leaf_gold', name: 'Foglia Dorata', icon: '🍂', rarity: 'rare', description: 'Foglia rara dorata', maxStack: 999 },
  { id: 'crystal_blue', name: 'Cristallo Blu', icon: '💎', rarity: 'epic', description: 'Cristallo magico', maxStack: 99 },
  { id: 'crystal_red', name: 'Cristallo Rosso', icon: '❤️', rarity: 'epic', description: 'Cristallo di potere', maxStack: 99 },
  { id: 'essence_nature', name: 'Essenza Natura', icon: '🌿', rarity: 'rare', description: 'Essenza della natura', maxStack: 99 },
  { id: 'essence_fire', name: 'Essenza Fuoco', icon: '🔥', rarity: 'rare', description: 'Essenza infuocata', maxStack: 99 },
  { id: 'essence_water', name: 'Essenza Acqua', icon: '💧', rarity: 'rare', description: 'Essenza acquatica', maxStack: 99 },
  { id: 'essence_void', name: 'Essenza Vuoto', icon: '🌀', rarity: 'legendary', description: 'Essenza del vuoto', maxStack: 50 },
  { id: 'pest_wing', name: 'Ala di Parassita', icon: '🪰', rarity: 'common', description: 'Drop dai parassiti', maxStack: 999 },
  { id: 'pest_shell', name: 'Guscio di Parassita', icon: '🐚', rarity: 'rare', description: 'Guscio resistente', maxStack: 99 },
  { id: 'boss_core', name: 'Nucleo Boss', icon: '💀', rarity: 'legendary', description: 'Drop dai boss', maxStack: 10 },
  { id: 'herb_heal', name: 'Erba Curativa', icon: '🌱', rarity: 'common', description: 'Erba medicinale', maxStack: 999 },
  { id: 'herb_power', name: 'Erba Potenziante', icon: '🌾', rarity: 'rare', description: 'Aumenta il potere', maxStack: 99 },
  { id: 'metal_iron', name: 'Ferro', icon: '⚙️', rarity: 'common', description: 'Metallo base', maxStack: 999 },
  { id: 'metal_gold', name: 'Oro', icon: '🪙', rarity: 'rare', description: 'Metallo prezioso', maxStack: 99 },
  { id: 'metal_mythril', name: 'Mythril', icon: '✨', rarity: 'legendary', description: 'Metallo leggendario', maxStack: 50 },
];

const RECIPES: CraftingRecipe[] = [
  { id: 'spray_basic', name: 'Spray Base', icon: '💨', description: 'Spray semplice', category: 'spray', rarity: 'common', materials: [{ materialId: 'leaf_green', amount: 5 }, { materialId: 'essence_water', amount: 1 }], craftTime: 30, unlockLevel: 1, stats: { damage: 10 } },
  { id: 'spray_poison', name: 'Spray Veleno', icon: '☠️', description: 'Spray velenoso', category: 'spray', rarity: 'rare', materials: [{ materialId: 'pest_wing', amount: 10 }, { materialId: 'essence_nature', amount: 3 }], craftTime: 120, unlockLevel: 5, stats: { damage: 25, dot: 5 } },
  { id: 'spray_fire', name: 'Spray Infuocato', icon: '🔥', description: 'Brucia i nemici', category: 'spray', rarity: 'epic', materials: [{ materialId: 'crystal_red', amount: 5 }, { materialId: 'essence_fire', amount: 5 }], craftTime: 300, unlockLevel: 10, stats: { damage: 50, burn: 10 } },
  { id: 'spray_void', name: 'Spray del Vuoto', icon: '🌀', description: 'Potere del vuoto', category: 'spray', rarity: 'legendary', materials: [{ materialId: 'essence_void', amount: 3 }, { materialId: 'boss_core', amount: 1 }], craftTime: 600, unlockLevel: 20, stats: { damage: 100, void: 20 } },
  { id: 'potion_health', name: 'Pozione Salute', icon: '❤️', description: 'Ripristina salute', category: 'potion', rarity: 'common', materials: [{ materialId: 'herb_heal', amount: 3 }], craftTime: 15, unlockLevel: 1, stats: { heal: 50 } },
  { id: 'potion_power', name: 'Pozione Potere', icon: '💪', description: 'Aumenta il danno', category: 'potion', rarity: 'rare', materials: [{ materialId: 'herb_power', amount: 5 }, { materialId: 'crystal_red', amount: 1 }], craftTime: 60, unlockLevel: 8, stats: { damage_boost: 25 } },
  { id: 'potion_shield', name: 'Pozione Scudo', icon: '🛡️', description: 'Scudo temporaneo', category: 'potion', rarity: 'rare', materials: [{ materialId: 'pest_shell', amount: 5 }, { materialId: 'essence_water', amount: 2 }], craftTime: 90, unlockLevel: 12, stats: { shield: 100 } },
  { id: 'potion_ultimate', name: 'Elisir Supremo', icon: '⭐', description: 'Pozione leggendaria', category: 'potion', rarity: 'legendary', materials: [{ materialId: 'boss_core', amount: 2 }, { materialId: 'essence_void', amount: 1 }, { materialId: 'metal_mythril', amount: 3 }], craftTime: 900, unlockLevel: 25, stats: { heal: 100, damage_boost: 50, shield: 200 } },
  { id: 'equip_gloves', name: 'Guanti Giardiniere', icon: '🧤', description: 'Aumenta efficienza', category: 'equipment', rarity: 'common', materials: [{ materialId: 'leaf_green', amount: 10 }, { materialId: 'metal_iron', amount: 5 }], craftTime: 120, unlockLevel: 3, stats: { efficiency: 10 } },
  { id: 'equip_boots', name: 'Stivali Veloci', icon: '👢', description: 'Movimento veloce', category: 'equipment', rarity: 'rare', materials: [{ materialId: 'pest_wing', amount: 20 }, { materialId: 'metal_gold', amount: 3 }], craftTime: 240, unlockLevel: 15, stats: { speed: 20 } },
  { id: 'equip_crown', name: 'Corona del Giardiniere', icon: '👑', description: 'Equipaggiamento leggendario', category: 'equipment', rarity: 'legendary', materials: [{ materialId: 'metal_mythril', amount: 10 }, { materialId: 'boss_core', amount: 3 }, { materialId: 'crystal_blue', amount: 5 }], craftTime: 1800, unlockLevel: 30, stats: { all_stats: 25 } },
  { id: 'deco_lamp', name: 'Lampada Magica', icon: '🏮', description: 'Illumina il giardino', category: 'decoration', rarity: 'rare', materials: [{ materialId: 'essence_fire', amount: 3 }, { materialId: 'metal_gold', amount: 2 }], craftTime: 180, unlockLevel: 7, stats: { beauty: 15 } },
  { id: 'deco_fountain', name: 'Fontana Cristallo', icon: '⛲', description: 'Fontana decorativa', category: 'decoration', rarity: 'epic', materials: [{ materialId: 'crystal_blue', amount: 10 }, { materialId: 'essence_water', amount: 5 }], craftTime: 600, unlockLevel: 18, stats: { beauty: 50 } },
  { id: 'cons_bomb', name: 'Bomba Insetticida', icon: '💣', description: 'Danno ad area', category: 'consumable', rarity: 'rare', materials: [{ materialId: 'pest_shell', amount: 3 }, { materialId: 'essence_fire', amount: 2 }], craftTime: 45, unlockLevel: 6, stats: { aoe_damage: 75 } },
  { id: 'cons_trap', name: 'Trappola Avanzata', icon: '🪤', description: 'Cattura parassiti', category: 'consumable', rarity: 'epic', materials: [{ materialId: 'metal_iron', amount: 10 }, { materialId: 'pest_wing', amount: 15 }], craftTime: 150, unlockLevel: 14, stats: { trap_power: 50 } },
];

const XP_PER_LEVEL = 1000;
const XP_PER_CRAFT: Record<ItemRarity, number> = { common: 10, rare: 25, epic: 50, legendary: 100 };

const initialState: CraftingState = { materials: {}, craftedItems: {}, unlockedRecipes: ['spray_basic', 'potion_health'], craftingQueue: [], craftingLevel: 1, craftingXp: 0, totalCrafted: 0 };

export function useCrafting() {
  const [state, setState] = useState<CraftingState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then(data => { if (data) setState(prev => ({ ...prev, ...JSON.parse(data) })); setIsLoaded(true); }); }, []);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state, isLoaded]);

  // Process completed crafts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setState(prev => {
        const completed = prev.craftingQueue.filter(q => q.endTime <= now);
        if (completed.length === 0) return prev;
        const remaining = prev.craftingQueue.filter(q => q.endTime > now);
        const newCraftedItems = { ...prev.craftedItems };
        let xpGained = 0;
        completed.forEach(q => {
          const recipe = RECIPES.find(r => r.id === q.recipeId);
          if (recipe) { newCraftedItems[q.recipeId] = (newCraftedItems[q.recipeId] || 0) + 1; xpGained += XP_PER_CRAFT[recipe.rarity]; }
        });
        const newXp = prev.craftingXp + xpGained;
        const newLevel = Math.floor(newXp / XP_PER_LEVEL) + 1;
        const newUnlocked = RECIPES.filter(r => r.unlockLevel <= newLevel && !prev.unlockedRecipes.includes(r.id)).map(r => r.id);
        return { ...prev, craftingQueue: remaining, craftedItems: newCraftedItems, craftingXp: newXp, craftingLevel: newLevel, unlockedRecipes: [...prev.unlockedRecipes, ...newUnlocked], totalCrafted: prev.totalCrafted + completed.length };
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getMaterialById = useCallback((id: string) => MATERIALS.find(m => m.id === id), []);
  const getRecipeById = useCallback((id: string) => RECIPES.find(r => r.id === id), []);
  const canCraft = useCallback((recipeId: string) => {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe || !state.unlockedRecipes.includes(recipeId)) return false;
    return recipe.materials.every(mat => (state.materials[mat.materialId] || 0) >= mat.amount);
  }, [state.materials, state.unlockedRecipes]);

  const startCraft = useCallback((recipeId: string) => {
    const recipe = RECIPES.find(r => r.id === recipeId);
    if (!recipe || !canCraft(recipeId)) return false;
    const now = Date.now();
    setState(prev => {
      const newMaterials = { ...prev.materials };
      recipe.materials.forEach(mat => { newMaterials[mat.materialId] = (newMaterials[mat.materialId] || 0) - mat.amount; });
      return { ...prev, materials: newMaterials, craftingQueue: [...prev.craftingQueue, { recipeId, startTime: now, endTime: now + recipe.craftTime * 1000 }] };
    });
    return true;
  }, [canCraft]);

  const addMaterial = useCallback((materialId: string, amount: number) => {
    const material = MATERIALS.find(m => m.id === materialId);
    if (!material) return;
    setState(prev => ({ ...prev, materials: { ...prev.materials, [materialId]: Math.min((prev.materials[materialId] || 0) + amount, material.maxStack) } }));
  }, []);

  const getRecipesByCategory = useCallback((category: CraftingRecipe['category']) => RECIPES.filter(r => r.category === category && state.unlockedRecipes.includes(r.id)), [state.unlockedRecipes]);
  const getCraftingProgress = useCallback((queueItem: CraftingQueue) => { const now = Date.now(); const total = queueItem.endTime - queueItem.startTime; const elapsed = now - queueItem.startTime; return Math.min(elapsed / total, 1); }, []);

  return { state, materials: MATERIALS, recipes: RECIPES, getMaterialById, getRecipeById, canCraft, startCraft, addMaterial, getRecipesByCategory, getCraftingProgress, isLoaded };
}
