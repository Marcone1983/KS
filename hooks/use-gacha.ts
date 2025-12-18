import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface CollectibleItem {
  id: string;
  name: string;
  description: string;
  rarity: Rarity;
  category: 'plant' | 'spray' | 'decoration' | 'badge' | 'skin' | 'pet';
  icon: string;
  stats?: Record<string, number>;
  isNew?: boolean;
}

export interface GachaBanner {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: { type: 'gems' | 'tickets'; amount: number };
  cost10x: { type: 'gems' | 'tickets'; amount: number };
  items: string[];
  rateUp?: string[];
}

interface GachaState {
  collection: Record<string, { item: CollectibleItem; count: number; firstObtained: number }>;
  pity: Record<string, number>;
  totalPulls: number;
  gems: number;
  tickets: number;
  lastPullResults: CollectibleItem[];
}

const STORAGE_KEY = '@kurstaki_gacha';

const RARITY_RATES: Record<Rarity, number> = {
  common: 0.50, rare: 0.30, epic: 0.15, legendary: 0.045, mythic: 0.005,
};

const ALL_ITEMS: CollectibleItem[] = [
  { id: 'plant_rose', name: 'Rosa Magica', description: 'Una rosa con petali luminosi', rarity: 'rare', category: 'plant', icon: '🌹', stats: { health: 10 } },
  { id: 'plant_sunflower', name: 'Girasole Solare', description: 'Genera energia dal sole', rarity: 'common', category: 'plant', icon: '🌻', stats: { energy: 5 } },
  { id: 'plant_tulip', name: 'Tulipano Arcobaleno', description: 'Cambia colore ogni giorno', rarity: 'rare', category: 'plant', icon: '🌷', stats: { luck: 8 } },
  { id: 'plant_cherry', name: 'Ciliegio Eterno', description: 'Fiorisce tutto l\'anno', rarity: 'epic', category: 'plant', icon: '🌸', stats: { health: 20, luck: 10 } },
  { id: 'plant_lotus', name: 'Loto Celestiale', description: 'Galleggia nell\'aria', rarity: 'legendary', category: 'plant', icon: '🪷', stats: { health: 50, energy: 30 } },
  { id: 'plant_crystal', name: 'Fiore di Cristallo', description: 'Pianta leggendaria di puro cristallo', rarity: 'mythic', category: 'plant', icon: '💎', stats: { health: 100, energy: 50, luck: 25 } },
  { id: 'spray_water', name: 'Spray Acqua', description: 'Spray base ad acqua', rarity: 'common', category: 'spray', icon: '💧', stats: { damage: 5 } },
  { id: 'spray_poison', name: 'Spray Veleno', description: 'Danneggia nel tempo', rarity: 'rare', category: 'spray', icon: '☠️', stats: { damage: 8 } },
  { id: 'spray_fire', name: 'Spray Infuocato', description: 'Brucia i parassiti', rarity: 'epic', category: 'spray', icon: '🔥', stats: { damage: 15 } },
  { id: 'spray_ice', name: 'Spray Glaciale', description: 'Congela i nemici', rarity: 'epic', category: 'spray', icon: '❄️', stats: { damage: 12 } },
  { id: 'spray_thunder', name: 'Spray Fulmine', description: 'Colpisce più nemici', rarity: 'legendary', category: 'spray', icon: '⚡', stats: { damage: 25 } },
  { id: 'spray_void', name: 'Spray del Vuoto', description: 'Elimina istantaneamente', rarity: 'mythic', category: 'spray', icon: '🌀', stats: { damage: 100 } },
  { id: 'deco_fountain', name: 'Fontana Magica', description: 'Fontana con acqua luminosa', rarity: 'rare', category: 'decoration', icon: '⛲', stats: { beauty: 15 } },
  { id: 'deco_statue', name: 'Statua del Guardiano', description: 'Protegge il giardino', rarity: 'epic', category: 'decoration', icon: '🗿', stats: { defense: 10 } },
  { id: 'deco_lantern', name: 'Lanterna Fatata', description: 'Illumina la notte', rarity: 'rare', category: 'decoration', icon: '🏮', stats: { light: 20 } },
  { id: 'deco_tree', name: 'Albero Antico', description: 'Albero millenario', rarity: 'legendary', category: 'decoration', icon: '🌳', stats: { beauty: 50, defense: 20 } },
  { id: 'badge_novice', name: 'Badge Novizio', description: 'Primo passo nel giardino', rarity: 'common', category: 'badge', icon: '🥉' },
  { id: 'badge_expert', name: 'Badge Esperto', description: 'Giardiniere esperto', rarity: 'rare', category: 'badge', icon: '🥈' },
  { id: 'badge_master', name: 'Badge Maestro', description: 'Maestro del giardino', rarity: 'epic', category: 'badge', icon: '🥇' },
  { id: 'badge_legend', name: 'Badge Leggenda', description: 'Leggenda vivente', rarity: 'legendary', category: 'badge', icon: '🏆' },
  { id: 'skin_neon', name: 'Skin Neon', description: 'Effetto neon brillante', rarity: 'rare', category: 'skin', icon: '🌈' },
  { id: 'skin_galaxy', name: 'Skin Galattica', description: 'Pattern cosmico', rarity: 'epic', category: 'skin', icon: '🌌' },
  { id: 'skin_gold', name: 'Skin Dorata', description: 'Ricoperto d\'oro', rarity: 'legendary', category: 'skin', icon: '✨' },
  { id: 'skin_void', name: 'Skin del Vuoto', description: 'Oscurità pura', rarity: 'mythic', category: 'skin', icon: '🖤' },
  { id: 'pet_bee', name: 'Ape Aiutante', description: 'Raccoglie risorse', rarity: 'rare', category: 'pet', icon: '🐝', stats: { gather: 10 } },
  { id: 'pet_butterfly', name: 'Farfalla Magica', description: 'Aumenta la fortuna', rarity: 'epic', category: 'pet', icon: '🦋', stats: { luck: 15 } },
  { id: 'pet_dragon', name: 'Drago Cucciolo', description: 'Attacca i nemici', rarity: 'legendary', category: 'pet', icon: '🐉', stats: { damage: 20 } },
  { id: 'pet_phoenix', name: 'Fenice', description: 'Rinasce dalle ceneri', rarity: 'mythic', category: 'pet', icon: '🔥', stats: { revive: 1, damage: 30 } },
];

const BANNERS: GachaBanner[] = [
  { id: 'standard', name: 'Banner Standard', description: 'Contiene tutti gli oggetti', icon: '🎰', cost: { type: 'gems', amount: 100 }, cost10x: { type: 'gems', amount: 900 }, items: ALL_ITEMS.map(i => i.id) },
  { id: 'plants', name: 'Banner Piante', description: 'Rate up per piante rare!', icon: '🌱', cost: { type: 'gems', amount: 100 }, cost10x: { type: 'gems', amount: 900 }, items: ALL_ITEMS.filter(i => i.category === 'plant').map(i => i.id), rateUp: ['plant_lotus', 'plant_cherry'] },
  { id: 'weapons', name: 'Banner Spray', description: 'Rate up per spray potenti!', icon: '💨', cost: { type: 'gems', amount: 100 }, cost10x: { type: 'gems', amount: 900 }, items: ALL_ITEMS.filter(i => i.category === 'spray').map(i => i.id), rateUp: ['spray_thunder'] },
  { id: 'pets', name: 'Banner Pet', description: 'Trova il tuo compagno!', icon: '🐾', cost: { type: 'tickets', amount: 1 }, cost10x: { type: 'tickets', amount: 10 }, items: ALL_ITEMS.filter(i => i.category === 'pet').map(i => i.id), rateUp: ['pet_dragon'] },
];

const PITY_THRESHOLD = 90;
const SOFT_PITY_START = 75;

const initialState: GachaState = { collection: {}, pity: {}, totalPulls: 0, gems: 1000, tickets: 5, lastPullResults: [] };

export function useGacha() {
  const [state, setState] = useState<GachaState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(data => {
      if (data) setState(prev => ({ ...prev, ...JSON.parse(data) }));
      setIsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, isLoaded]);

  const getItemById = useCallback((id: string) => ALL_ITEMS.find(item => item.id === id), []);

  const calculateRarity = useCallback((pityCount: number): Rarity => {
    const rand = Math.random();
    let legendaryRate = RARITY_RATES.legendary + RARITY_RATES.mythic;
    if (pityCount >= SOFT_PITY_START) legendaryRate = Math.min(legendaryRate + (pityCount - SOFT_PITY_START) * 0.06, 1);
    if (pityCount >= PITY_THRESHOLD) return Math.random() < 0.1 ? 'mythic' : 'legendary';
    let cumulative = 0;
    for (const [rarity, rate] of Object.entries(RARITY_RATES)) {
      cumulative += rarity === 'legendary' || rarity === 'mythic' ? legendaryRate / 2 : rate;
      if (rand < cumulative) return rarity as Rarity;
    }
    return 'common';
  }, []);

  const pull = useCallback((bannerId: string, count: number = 1): CollectibleItem[] => {
    const banner = BANNERS.find(b => b.id === bannerId);
    if (!banner) return [];
    const cost = count === 10 ? banner.cost10x : banner.cost;
    const totalCost = count === 10 ? cost.amount : cost.amount * count;
    if (cost.type === 'gems' && state.gems < totalCost) return [];
    if (cost.type === 'tickets' && state.tickets < totalCost) return [];
    
    const results: CollectibleItem[] = [];
    let newPity = state.pity[bannerId] || 0;
    
    for (let i = 0; i < count; i++) {
      const rarity = calculateRarity(newPity);
      const eligibleItems = banner.items.map(id => getItemById(id)).filter((item): item is CollectibleItem => item !== undefined && item.rarity === rarity);
      let selectedItem: CollectibleItem;
      if (eligibleItems.length === 0) {
        const fallback = ALL_ITEMS.find(item => item.rarity === rarity);
        selectedItem = fallback || ALL_ITEMS[0];
      } else if (banner.rateUp && Math.random() < 0.5) {
        const rateUpItems = eligibleItems.filter(item => banner.rateUp?.includes(item.id));
        selectedItem = rateUpItems.length > 0 ? rateUpItems[Math.floor(Math.random() * rateUpItems.length)] : eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
      } else {
        selectedItem = eligibleItems[Math.floor(Math.random() * eligibleItems.length)];
      }
      results.push({ ...selectedItem, isNew: !state.collection[selectedItem.id] });
      newPity = (rarity === 'legendary' || rarity === 'mythic') ? 0 : newPity + 1;
    }
    
    setState(prev => {
      const newCollection = { ...prev.collection };
      results.forEach(item => {
        if (newCollection[item.id]) newCollection[item.id].count++;
        else newCollection[item.id] = { item, count: 1, firstObtained: Date.now() };
      });
      return { ...prev, collection: newCollection, pity: { ...prev.pity, [bannerId]: newPity }, totalPulls: prev.totalPulls + count, gems: cost.type === 'gems' ? prev.gems - totalCost : prev.gems, tickets: cost.type === 'tickets' ? prev.tickets - totalCost : prev.tickets, lastPullResults: results };
    });
    return results;
  }, [state, calculateRarity, getItemById]);

  const getCollectionByCategory = useCallback((category: CollectibleItem['category']) => Object.values(state.collection).filter(entry => entry.item.category === category).sort((a, b) => { const order = { mythic: 0, legendary: 1, epic: 2, rare: 3, common: 4 }; return order[a.item.rarity] - order[b.item.rarity]; }), [state.collection]);
  const getCollectionProgress = useCallback(() => { const total = ALL_ITEMS.length; const owned = Object.keys(state.collection).length; return { owned, total, percentage: (owned / total) * 100 }; }, [state.collection]);
  const addCurrency = useCallback((type: 'gems' | 'tickets', amount: number) => setState(prev => ({ ...prev, [type]: prev[type] + amount })), []);

  return { state, pull, getItemById, getCollectionByCategory, getCollectionProgress, addCurrency, banners: BANNERS, allItems: ALL_ITEMS, isLoaded };
}
