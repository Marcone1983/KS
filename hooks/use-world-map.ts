import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ZoneType = 'forest' | 'desert' | 'mountain' | 'swamp' | 'volcano' | 'ice' | 'void';
export type ZoneDifficulty = 'easy' | 'medium' | 'hard' | 'extreme' | 'nightmare';

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  icon: string;
  description: string;
  difficulty: ZoneDifficulty;
  requiredLevel: number;
  enemies: string[];
  drops: { itemId: string; chance: number }[];
  bossId?: string;
  position: { x: number; y: number };
  connections: string[];
}

export interface ZoneProgress {
  zoneId: string;
  timesCleared: number;
  bestTime: number;
  bossDefeated: boolean;
  stars: number; // 0-3
  lastVisited: number;
}

interface WorldMapState {
  unlockedZones: string[];
  zoneProgress: Record<string, ZoneProgress>;
  currentZone: string | null;
  totalStars: number;
  bossesDefeated: number;
}

const STORAGE_KEY = '@kurstaki_worldmap';

const ZONE_COLORS: Record<ZoneType, string> = { forest: '#22c55e', desert: '#fbbf24', mountain: '#6b7280', swamp: '#84cc16', volcano: '#ef4444', ice: '#3b82f6', void: '#7c3aed' };
const DIFFICULTY_COLORS: Record<ZoneDifficulty, string> = { easy: '#22c55e', medium: '#fbbf24', hard: '#f97316', extreme: '#ef4444', nightmare: '#7c3aed' };

const ALL_ZONES: Zone[] = [
  { id: 'forest_start', name: 'Foresta Iniziale', type: 'forest', icon: '🌲', description: 'Una foresta tranquilla per iniziare', difficulty: 'easy', requiredLevel: 1, enemies: ['aphid', 'caterpillar'], drops: [{ itemId: 'leaf_green', chance: 0.8 }, { itemId: 'herb_heal', chance: 0.5 }], position: { x: 50, y: 80 }, connections: ['forest_deep'] },
  { id: 'forest_deep', name: 'Foresta Profonda', type: 'forest', icon: '🌳', description: 'Alberi antichi e nemici più forti', difficulty: 'medium', requiredLevel: 5, enemies: ['spider_mite', 'caterpillar', 'mealybug'], drops: [{ itemId: 'leaf_green', chance: 0.9 }, { itemId: 'essence_nature', chance: 0.3 }], bossId: 'giant_spider', position: { x: 35, y: 65 }, connections: ['forest_start', 'swamp_edge', 'mountain_base'] },
  { id: 'swamp_edge', name: 'Palude Nebbiosa', type: 'swamp', icon: '🌿', description: 'Terreno fangoso e insidioso', difficulty: 'medium', requiredLevel: 8, enemies: ['whitefly', 'thrip', 'mealybug'], drops: [{ itemId: 'essence_water', chance: 0.4 }, { itemId: 'pest_wing', chance: 0.7 }], position: { x: 20, y: 50 }, connections: ['forest_deep', 'swamp_heart'] },
  { id: 'swamp_heart', name: 'Cuore della Palude', type: 'swamp', icon: '🐸', description: 'Il centro della palude tossica', difficulty: 'hard', requiredLevel: 12, enemies: ['thrip', 'locust_boss'], drops: [{ itemId: 'essence_water', chance: 0.6 }, { itemId: 'pest_shell', chance: 0.4 }], bossId: 'swamp_queen', position: { x: 15, y: 35 }, connections: ['swamp_edge', 'volcano_entrance'] },
  { id: 'mountain_base', name: 'Base della Montagna', type: 'mountain', icon: '⛰️', description: 'Sentieri rocciosi e venti forti', difficulty: 'medium', requiredLevel: 10, enemies: ['spider_mite', 'aphid'], drops: [{ itemId: 'metal_iron', chance: 0.6 }, { itemId: 'crystal_blue', chance: 0.2 }], position: { x: 60, y: 55 }, connections: ['forest_deep', 'mountain_peak'] },
  { id: 'mountain_peak', name: 'Vetta della Montagna', type: 'mountain', icon: '🏔️', description: 'La cima ghiacciata', difficulty: 'hard', requiredLevel: 15, enemies: ['spider_mite', 'mealybug', 'whitefly'], drops: [{ itemId: 'crystal_blue', chance: 0.5 }, { itemId: 'metal_gold', chance: 0.3 }], bossId: 'frost_giant', position: { x: 75, y: 40 }, connections: ['mountain_base', 'ice_cavern'] },
  { id: 'desert_oasis', name: 'Oasi del Deserto', type: 'desert', icon: '🏜️', description: 'Un rifugio nel deserto ardente', difficulty: 'medium', requiredLevel: 10, enemies: ['locust_boss', 'thrip'], drops: [{ itemId: 'leaf_gold', chance: 0.4 }, { itemId: 'essence_fire', chance: 0.3 }], position: { x: 80, y: 70 }, connections: ['desert_ruins'] },
  { id: 'desert_ruins', name: 'Rovine Antiche', type: 'desert', icon: '🏛️', description: 'Rovine misteriose nel deserto', difficulty: 'hard', requiredLevel: 18, enemies: ['locust_boss', 'spider_mite'], drops: [{ itemId: 'metal_gold', chance: 0.5 }, { itemId: 'crystal_red', chance: 0.3 }], bossId: 'sand_worm', position: { x: 90, y: 55 }, connections: ['desert_oasis', 'volcano_entrance'] },
  { id: 'volcano_entrance', name: 'Ingresso del Vulcano', type: 'volcano', icon: '🌋', description: 'Lava e calore estremo', difficulty: 'extreme', requiredLevel: 22, enemies: ['locust_boss', 'thrip', 'spider_mite'], drops: [{ itemId: 'essence_fire', chance: 0.6 }, { itemId: 'crystal_red', chance: 0.4 }], position: { x: 50, y: 25 }, connections: ['swamp_heart', 'desert_ruins', 'volcano_core'] },
  { id: 'volcano_core', name: 'Nucleo del Vulcano', type: 'volcano', icon: '🔥', description: 'Il cuore infuocato', difficulty: 'nightmare', requiredLevel: 28, enemies: ['locust_boss'], drops: [{ itemId: 'boss_core', chance: 0.3 }, { itemId: 'metal_mythril', chance: 0.2 }], bossId: 'fire_lord', position: { x: 50, y: 10 }, connections: ['volcano_entrance', 'void_rift'] },
  { id: 'ice_cavern', name: 'Caverna di Ghiaccio', type: 'ice', icon: '❄️', description: 'Cristalli di ghiaccio eterno', difficulty: 'extreme', requiredLevel: 25, enemies: ['whitefly', 'mealybug'], drops: [{ itemId: 'crystal_blue', chance: 0.7 }, { itemId: 'essence_water', chance: 0.5 }], bossId: 'ice_queen', position: { x: 85, y: 25 }, connections: ['mountain_peak', 'void_rift'] },
  { id: 'void_rift', name: 'Frattura del Vuoto', type: 'void', icon: '🌀', description: 'Dimensione sconosciuta', difficulty: 'nightmare', requiredLevel: 35, enemies: ['locust_boss'], drops: [{ itemId: 'essence_void', chance: 0.5 }, { itemId: 'boss_core', chance: 0.4 }], bossId: 'void_emperor', position: { x: 50, y: 5 }, connections: ['volcano_core', 'ice_cavern'] },
];

const initialState: WorldMapState = { unlockedZones: ['forest_start'], zoneProgress: {}, currentZone: null, totalStars: 0, bossesDefeated: 0 };

export function useWorldMap() {
  const [state, setState] = useState<WorldMapState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then(data => { if (data) setState(prev => ({ ...prev, ...JSON.parse(data) })); setIsLoaded(true); }); }, []);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state, isLoaded]);

  const getZoneById = useCallback((id: string) => ALL_ZONES.find(z => z.id === id), []);
  const isZoneUnlocked = useCallback((zoneId: string) => state.unlockedZones.includes(zoneId), [state.unlockedZones]);
  const getZoneProgress = useCallback((zoneId: string) => state.zoneProgress[zoneId], [state.zoneProgress]);

  const unlockZone = useCallback((zoneId: string) => {
    if (state.unlockedZones.includes(zoneId)) return;
    setState(prev => ({ ...prev, unlockedZones: [...prev.unlockedZones, zoneId] }));
  }, [state.unlockedZones]);

  const completeZone = useCallback((zoneId: string, time: number, stars: number, bossDefeated: boolean) => {
    const existing = state.zoneProgress[zoneId];
    const newProgress: ZoneProgress = { zoneId, timesCleared: (existing?.timesCleared || 0) + 1, bestTime: existing?.bestTime ? Math.min(existing.bestTime, time) : time, bossDefeated: existing?.bossDefeated || bossDefeated, stars: Math.max(existing?.stars || 0, stars), lastVisited: Date.now() };
    const zone = ALL_ZONES.find(z => z.id === zoneId);
    const newUnlocked = zone?.connections.filter(c => !state.unlockedZones.includes(c)) || [];
    const starDiff = newProgress.stars - (existing?.stars || 0);
    const bossDefeatedNew = bossDefeated && !existing?.bossDefeated;
    setState(prev => ({ ...prev, zoneProgress: { ...prev.zoneProgress, [zoneId]: newProgress }, unlockedZones: [...prev.unlockedZones, ...newUnlocked], totalStars: prev.totalStars + starDiff, bossesDefeated: prev.bossesDefeated + (bossDefeatedNew ? 1 : 0) }));
  }, [state.zoneProgress, state.unlockedZones]);

  const setCurrentZone = useCallback((zoneId: string | null) => setState(prev => ({ ...prev, currentZone: zoneId })), []);
  const getConnectedZones = useCallback((zoneId: string) => { const zone = ALL_ZONES.find(z => z.id === zoneId); return zone?.connections.map(c => ALL_ZONES.find(z => z.id === c)).filter(Boolean) as Zone[] || []; }, []);
  const getZonesByType = useCallback((type: ZoneType) => ALL_ZONES.filter(z => z.type === type), []);

  return { state, allZones: ALL_ZONES, zoneColors: ZONE_COLORS, difficultyColors: DIFFICULTY_COLORS, getZoneById, isZoneUnlocked, getZoneProgress, unlockZone, completeZone, setCurrentZone, getConnectedZones, getZonesByType, isLoaded };
}
