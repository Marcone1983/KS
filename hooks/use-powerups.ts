import { useState, useCallback, useRef, useEffect } from 'react';
import { useHaptics } from './use-haptics';

export interface PowerUp {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  duration: number; // ms, 0 = instant
  effect: PowerUpEffect;
  stackable: boolean;
  maxStacks: number;
  dropChance: number;
  model: string; // GLB model path
}

export interface PowerUpEffect {
  type: 'damage' | 'speed' | 'heal' | 'shield' | 'multishot' | 'freeze' | 'magnet' | 'xp_boost' | 'coin_boost' | 'invincibility';
  value: number;
  percentage: boolean;
}

export interface ActivePowerUp {
  powerUp: PowerUp;
  startTime: number;
  remainingTime: number;
  stacks: number;
}

const POWERUPS: Record<string, PowerUp> = {
  damage_boost: {
    id: 'damage_boost',
    name: 'Danno Potenziato',
    description: '+50% danno per 10 secondi',
    icon: '⚔️',
    rarity: 'common',
    duration: 10000,
    effect: { type: 'damage', value: 50, percentage: true },
    stackable: true,
    maxStacks: 3,
    dropChance: 0.15,
    model: 'powerups/damage_boost.glb',
  },
  speed_boost: {
    id: 'speed_boost',
    name: 'Velocita Aumentata',
    description: '+30% velocita spray per 8 secondi',
    icon: '💨',
    rarity: 'common',
    duration: 8000,
    effect: { type: 'speed', value: 30, percentage: true },
    stackable: true,
    maxStacks: 2,
    dropChance: 0.12,
    model: 'powerups/speed_boost.glb',
  },
  health_pack: {
    id: 'health_pack',
    name: 'Kit Medico',
    description: 'Ripristina 30 HP',
    icon: '❤️',
    rarity: 'common',
    duration: 0,
    effect: { type: 'heal', value: 30, percentage: false },
    stackable: false,
    maxStacks: 1,
    dropChance: 0.1,
    model: 'powerups/health_pack.glb',
  },
  shield: {
    id: 'shield',
    name: 'Scudo Protettivo',
    description: 'Assorbe 50 danni',
    icon: '🛡️',
    rarity: 'rare',
    duration: 15000,
    effect: { type: 'shield', value: 50, percentage: false },
    stackable: false,
    maxStacks: 1,
    dropChance: 0.08,
    model: 'powerups/shield.glb',
  },
  multishot: {
    id: 'multishot',
    name: 'Spray Triplo',
    description: 'Spara 3 spray alla volta per 12 secondi',
    icon: '🔱',
    rarity: 'rare',
    duration: 12000,
    effect: { type: 'multishot', value: 3, percentage: false },
    stackable: false,
    maxStacks: 1,
    dropChance: 0.06,
    model: 'powerups/multishot.glb',
  },
  freeze: {
    id: 'freeze',
    name: 'Congelamento',
    description: 'Rallenta tutti i nemici del 50% per 8 secondi',
    icon: '❄️',
    rarity: 'rare',
    duration: 8000,
    effect: { type: 'freeze', value: 50, percentage: true },
    stackable: false,
    maxStacks: 1,
    dropChance: 0.07,
    model: 'powerups/freeze.glb',
  },
  magnet: {
    id: 'magnet',
    name: 'Magnete Monete',
    description: 'Attira automaticamente monete per 15 secondi',
    icon: '🧲',
    rarity: 'common',
    duration: 15000,
    effect: { type: 'magnet', value: 200, percentage: false },
    stackable: false,
    maxStacks: 1,
    dropChance: 0.1,
    model: 'powerups/magnet.glb',
  },
  xp_boost: {
    id: 'xp_boost',
    name: 'Boost XP',
    description: '+100% XP per 20 secondi',
    icon: '⭐',
    rarity: 'epic',
    duration: 20000,
    effect: { type: 'xp_boost', value: 100, percentage: true },
    stackable: false,
    maxStacks: 1,
    dropChance: 0.04,
    model: 'powerups/xp_boost.glb',
  },
  coin_boost: {
    id: 'coin_boost',
    name: 'Pioggia di Monete',
    description: '+100% monete per 20 secondi',
    icon: '🪙',
    rarity: 'epic',
    duration: 20000,
    effect: { type: 'coin_boost', value: 100, percentage: true },
    stackable: false,
    maxStacks: 1,
    dropChance: 0.04,
    model: 'powerups/coin_boost.glb',
  },
  invincibility: {
    id: 'invincibility',
    name: 'Invincibilita',
    description: 'Immune ai danni per 5 secondi',
    icon: '✨',
    rarity: 'legendary',
    duration: 5000,
    effect: { type: 'invincibility', value: 1, percentage: false },
    stackable: false,
    maxStacks: 1,
    dropChance: 0.02,
    model: 'powerups/invincibility.glb',
  },
};

export function usePowerUps() {
  const [activePowerUps, setActivePowerUps] = useState<ActivePowerUp[]>([]);
  const [availablePowerUps, setAvailablePowerUps] = useState<PowerUp[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Update remaining time every 100ms
  useEffect(() => {
    const interval = setInterval(() => {
      setActivePowerUps(prev => 
        prev.map(ap => ({
          ...ap,
          remainingTime: Math.max(0, ap.powerUp.duration - (Date.now() - ap.startTime)),
        })).filter(ap => ap.remainingTime > 0 || ap.powerUp.duration === 0)
      );
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const collectPowerUp = useCallback((powerUpId: string) => {
    const powerUp = POWERUPS[powerUpId];
    if (!powerUp) return false;

    // Check if already active and not stackable
    const existing = activePowerUps.find(ap => ap.powerUp.id === powerUpId);
    if (existing && !powerUp.stackable) {
      // Refresh duration
      setActivePowerUps(prev => 
        prev.map(ap => 
          ap.powerUp.id === powerUpId 
            ? { ...ap, startTime: Date.now(), remainingTime: powerUp.duration }
            : ap
        )
      );
      return true;
    }

    if (existing && powerUp.stackable && existing.stacks >= powerUp.maxStacks) {
      return false;
    }

    // Instant effect
    if (powerUp.duration === 0) {
      // Handle instant effects like healing
      return true;
    }

    // Add new power-up
    if (existing && powerUp.stackable) {
      setActivePowerUps(prev =>
        prev.map(ap =>
          ap.powerUp.id === powerUpId
            ? { ...ap, stacks: ap.stacks + 1, startTime: Date.now(), remainingTime: powerUp.duration }
            : ap
        )
      );
    } else {
      setActivePowerUps(prev => [
        ...prev,
        { powerUp, startTime: Date.now(), remainingTime: powerUp.duration, stacks: 1 },
      ]);
    }

    return true;
  }, [activePowerUps]);

  const removePowerUp = useCallback((powerUpId: string) => {
    setActivePowerUps(prev => prev.filter(ap => ap.powerUp.id !== powerUpId));
    const timer = timersRef.current.get(powerUpId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(powerUpId);
    }
  }, []);

  const getEffectValue = useCallback((effectType: PowerUpEffect['type']): number => {
    let total = 0;
    activePowerUps.forEach(ap => {
      if (ap.powerUp.effect.type === effectType) {
        total += ap.powerUp.effect.value * ap.stacks;
      }
    });
    return total;
  }, [activePowerUps]);

  const hasEffect = useCallback((effectType: PowerUpEffect['type']): boolean => {
    return activePowerUps.some(ap => ap.powerUp.effect.type === effectType);
  }, [activePowerUps]);

  const spawnRandomPowerUp = useCallback((): PowerUp | null => {
    const roll = Math.random();
    let cumulative = 0;
    
    for (const powerUp of Object.values(POWERUPS)) {
      cumulative += powerUp.dropChance;
      if (roll <= cumulative) {
        return powerUp;
      }
    }
    return null;
  }, []);

  const clearAllPowerUps = useCallback(() => {
    setActivePowerUps([]);
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();
  }, []);

  const getAllPowerUps = useCallback(() => Object.values(POWERUPS), []);

  return {
    activePowerUps,
    collectPowerUp,
    removePowerUp,
    getEffectValue,
    hasEffect,
    spawnRandomPowerUp,
    clearAllPowerUps,
    getAllPowerUps,
  };
}

export default usePowerUps;
