import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PetRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type PetElement = 'nature' | 'fire' | 'water' | 'earth' | 'void';

export interface PetAbility {
  id: string;
  name: string;
  description: string;
  icon: string;
  cooldown: number; // seconds
  effect: { type: 'damage' | 'heal' | 'buff' | 'debuff' | 'gather'; value: number; duration?: number };
}

export interface Pet {
  id: string;
  name: string;
  icon: string;
  rarity: PetRarity;
  element: PetElement;
  description: string;
  baseStats: { health: number; attack: number; defense: number; speed: number };
  abilities: PetAbility[];
  evolutionId?: string;
  evolutionLevel?: number;
}

export interface OwnedPet {
  petId: string;
  nickname?: string;
  level: number;
  xp: number;
  happiness: number;
  lastFed: number;
  isActive: boolean;
  stats: { health: number; attack: number; defense: number; speed: number };
}

interface PetsState {
  ownedPets: OwnedPet[];
  activePetId: string | null;
  petFood: number;
  totalPetsOwned: number;
}

const STORAGE_KEY = '@kurstaki_pets';
const XP_PER_LEVEL = 500;
const MAX_LEVEL = 50;
const HAPPINESS_DECAY_RATE = 5; // per hour
const HAPPINESS_FEED_BOOST = 30;

const ALL_PETS: Pet[] = [
  { id: 'bee', name: 'Ape Operaia', icon: '🐝', rarity: 'common', element: 'nature', description: 'Raccoglie risorse automaticamente', baseStats: { health: 50, attack: 10, defense: 5, speed: 15 }, abilities: [{ id: 'gather', name: 'Raccolta', description: 'Raccoglie materiali', icon: '🍯', cooldown: 60, effect: { type: 'gather', value: 5 } }] },
  { id: 'ladybug', name: 'Coccinella', icon: '🐞', rarity: 'common', element: 'nature', description: 'Porta fortuna nel gacha', baseStats: { health: 40, attack: 8, defense: 10, speed: 12 }, abilities: [{ id: 'luck', name: 'Fortuna', description: 'Aumenta drop rate', icon: '🍀', cooldown: 300, effect: { type: 'buff', value: 10, duration: 60 } }] },
  { id: 'butterfly', name: 'Farfalla Magica', icon: '🦋', rarity: 'rare', element: 'nature', description: 'Cura le piante', baseStats: { health: 60, attack: 5, defense: 8, speed: 20 }, abilities: [{ id: 'heal', name: 'Polline Curativo', description: 'Cura le piante', icon: '💚', cooldown: 120, effect: { type: 'heal', value: 30 } }], evolutionId: 'fairy_butterfly', evolutionLevel: 25 },
  { id: 'fairy_butterfly', name: 'Farfalla Fatata', icon: '🧚', rarity: 'epic', element: 'nature', description: 'Evoluzione della Farfalla Magica', baseStats: { health: 120, attack: 15, defense: 20, speed: 30 }, abilities: [{ id: 'heal_plus', name: 'Aura Curativa', description: 'Cura potente', icon: '💖', cooldown: 90, effect: { type: 'heal', value: 75 } }, { id: 'fairy_dust', name: 'Polvere Fatata', description: 'Buff a tutti', icon: '✨', cooldown: 180, effect: { type: 'buff', value: 20, duration: 120 } }] },
  { id: 'firefly', name: 'Lucciola', icon: '✨', rarity: 'rare', element: 'fire', description: 'Illumina la notte', baseStats: { health: 45, attack: 15, defense: 5, speed: 25 }, abilities: [{ id: 'light', name: 'Luce Guida', description: 'Rivela nemici nascosti', icon: '💡', cooldown: 90, effect: { type: 'buff', value: 15, duration: 30 } }] },
  { id: 'salamander', name: 'Salamandra', icon: '🦎', rarity: 'epic', element: 'fire', description: 'Attacca con il fuoco', baseStats: { health: 80, attack: 30, defense: 15, speed: 18 }, abilities: [{ id: 'fireball', name: 'Palla di Fuoco', description: 'Danno ad area', icon: '🔥', cooldown: 45, effect: { type: 'damage', value: 50 } }], evolutionId: 'dragon', evolutionLevel: 30 },
  { id: 'dragon', name: 'Drago', icon: '🐉', rarity: 'legendary', element: 'fire', description: 'Il pet definitivo', baseStats: { health: 200, attack: 60, defense: 40, speed: 25 }, abilities: [{ id: 'breath', name: 'Soffio di Drago', description: 'Devastazione totale', icon: '🔥', cooldown: 60, effect: { type: 'damage', value: 150 } }, { id: 'roar', name: 'Ruggito', description: 'Spaventa i nemici', icon: '📢', cooldown: 120, effect: { type: 'debuff', value: 30, duration: 30 } }] },
  { id: 'frog', name: 'Rana', icon: '🐸', rarity: 'common', element: 'water', description: 'Salta sui nemici', baseStats: { health: 55, attack: 12, defense: 8, speed: 22 }, abilities: [{ id: 'jump', name: 'Salto', description: 'Attacco a sorpresa', icon: '🦘', cooldown: 30, effect: { type: 'damage', value: 20 } }] },
  { id: 'turtle', name: 'Tartaruga', icon: '🐢', rarity: 'rare', element: 'water', description: 'Difesa impenetrabile', baseStats: { health: 100, attack: 8, defense: 35, speed: 5 }, abilities: [{ id: 'shell', name: 'Guscio', description: 'Difesa aumentata', icon: '🛡️', cooldown: 60, effect: { type: 'buff', value: 50, duration: 20 } }] },
  { id: 'seahorse', name: 'Cavalluccio Marino', icon: '🦑', rarity: 'epic', element: 'water', description: 'Maestro delle correnti', baseStats: { health: 70, attack: 25, defense: 15, speed: 30 }, abilities: [{ id: 'wave', name: 'Onda', description: 'Spazza via i nemici', icon: '🌊', cooldown: 45, effect: { type: 'damage', value: 40 } }] },
  { id: 'mole', name: 'Talpa', icon: '🐀', rarity: 'rare', element: 'earth', description: 'Scava per trovare tesori', baseStats: { health: 65, attack: 18, defense: 20, speed: 10 }, abilities: [{ id: 'dig', name: 'Scava', description: 'Trova materiali rari', icon: '⛏️', cooldown: 180, effect: { type: 'gather', value: 15 } }] },
  { id: 'golem', name: 'Golem', icon: '🗿', rarity: 'legendary', element: 'earth', description: 'Difensore di pietra', baseStats: { health: 250, attack: 40, defense: 60, speed: 8 }, abilities: [{ id: 'quake', name: 'Terremoto', description: 'Stordisce tutti', icon: '💥', cooldown: 90, effect: { type: 'damage', value: 80 } }, { id: 'fortify', name: 'Fortificazione', description: 'Difesa massima', icon: '🏰', cooldown: 120, effect: { type: 'buff', value: 100, duration: 30 } }] },
  { id: 'shadow', name: 'Ombra', icon: '👤', rarity: 'epic', element: 'void', description: 'Si muove nell\'oscurità', baseStats: { health: 60, attack: 35, defense: 10, speed: 35 }, abilities: [{ id: 'vanish', name: 'Svanire', description: 'Diventa invisibile', icon: '👻', cooldown: 60, effect: { type: 'buff', value: 100, duration: 10 } }] },
  { id: 'phoenix', name: 'Fenice', icon: '🔥', rarity: 'mythic', element: 'void', description: 'Rinasce dalle ceneri', baseStats: { health: 180, attack: 50, defense: 30, speed: 28 }, abilities: [{ id: 'rebirth', name: 'Rinascita', description: 'Risorge una volta', icon: '♻️', cooldown: 600, effect: { type: 'heal', value: 100 } }, { id: 'inferno', name: 'Inferno', description: 'Brucia tutto', icon: '🌋', cooldown: 90, effect: { type: 'damage', value: 120 } }] },
];

const initialState: PetsState = { ownedPets: [], activePetId: null, petFood: 10, totalPetsOwned: 0 };

export function usePets() {
  const [state, setState] = useState<PetsState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => { AsyncStorage.getItem(STORAGE_KEY).then(data => { if (data) setState(prev => ({ ...prev, ...JSON.parse(data) })); setIsLoaded(true); }); }, []);
  useEffect(() => { if (isLoaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state, isLoaded]);

  // Happiness decay
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setState(prev => ({ ...prev, ownedPets: prev.ownedPets.map(pet => { const hoursSinceLastFed = (now - pet.lastFed) / (1000 * 60 * 60); const decay = Math.floor(hoursSinceLastFed * HAPPINESS_DECAY_RATE); return { ...pet, happiness: Math.max(0, 100 - decay) }; }) }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getPetById = useCallback((id: string) => ALL_PETS.find(p => p.id === id), []);
  const getOwnedPet = useCallback((petId: string) => state.ownedPets.find(p => p.petId === petId), [state.ownedPets]);
  const getActivePet = useCallback(() => state.activePetId ? state.ownedPets.find(p => p.petId === state.activePetId) : null, [state.ownedPets, state.activePetId]);

  const addPet = useCallback((petId: string) => {
    const pet = ALL_PETS.find(p => p.id === petId);
    if (!pet || state.ownedPets.some(p => p.petId === petId)) return false;
    const newPet: OwnedPet = { petId, level: 1, xp: 0, happiness: 100, lastFed: Date.now(), isActive: false, stats: { ...pet.baseStats } };
    setState(prev => ({ ...prev, ownedPets: [...prev.ownedPets, newPet], totalPetsOwned: prev.totalPetsOwned + 1 }));
    return true;
  }, [state.ownedPets]);

  const setActivePet = useCallback((petId: string | null) => {
    setState(prev => ({ ...prev, activePetId: petId, ownedPets: prev.ownedPets.map(p => ({ ...p, isActive: p.petId === petId })) }));
  }, []);

  const feedPet = useCallback((petId: string) => {
    if (state.petFood <= 0) return false;
    setState(prev => ({ ...prev, petFood: prev.petFood - 1, ownedPets: prev.ownedPets.map(p => p.petId === petId ? { ...p, happiness: Math.min(100, p.happiness + HAPPINESS_FEED_BOOST), lastFed: Date.now() } : p) }));
    return true;
  }, [state.petFood]);

  const addXp = useCallback((petId: string, amount: number) => {
    setState(prev => ({ ...prev, ownedPets: prev.ownedPets.map(p => {
      if (p.petId !== petId || p.level >= MAX_LEVEL) return p;
      const newXp = p.xp + amount;
      const xpNeeded = p.level * XP_PER_LEVEL;
      if (newXp >= xpNeeded) {
        const pet = ALL_PETS.find(pet => pet.id === petId);
        const levelUp = p.level + 1;
        const statBonus = 1 + (levelUp * 0.05);
        return { ...p, level: levelUp, xp: newXp - xpNeeded, stats: pet ? { health: Math.floor(pet.baseStats.health * statBonus), attack: Math.floor(pet.baseStats.attack * statBonus), defense: Math.floor(pet.baseStats.defense * statBonus), speed: Math.floor(pet.baseStats.speed * statBonus) } : p.stats };
      }
      return { ...p, xp: newXp };
    }) }));
  }, []);

  const evolvePet = useCallback((petId: string) => {
    const ownedPet = state.ownedPets.find(p => p.petId === petId);
    const pet = ALL_PETS.find(p => p.id === petId);
    if (!ownedPet || !pet || !pet.evolutionId || !pet.evolutionLevel) return false;
    if (ownedPet.level < pet.evolutionLevel) return false;
    const evolvedPet = ALL_PETS.find(p => p.id === pet.evolutionId);
    if (!evolvedPet) return false;
    setState(prev => ({ ...prev, ownedPets: prev.ownedPets.map(p => p.petId === petId ? { ...p, petId: pet.evolutionId!, level: 1, xp: 0, stats: { ...evolvedPet.baseStats } } : p) }));
    return true;
  }, [state.ownedPets]);

  const addFood = useCallback((amount: number) => setState(prev => ({ ...prev, petFood: prev.petFood + amount })), []);
  const getPetsByElement = useCallback((element: PetElement) => ALL_PETS.filter(p => p.element === element), []);
  const getPetsByRarity = useCallback((rarity: PetRarity) => ALL_PETS.filter(p => p.rarity === rarity), []);

  return { state, allPets: ALL_PETS, getPetById, getOwnedPet, getActivePet, addPet, setActivePet, feedPet, addXp, evolvePet, addFood, getPetsByElement, getPetsByRarity, isLoaded };
}
