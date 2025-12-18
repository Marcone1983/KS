import { useState, useCallback, useRef, useEffect } from 'react';
import { useHaptics } from './use-haptics';

export interface ComboState {
  count: number;
  multiplier: number;
  lastHitTime: number;
  comboWindow: number;
  maxCombo: number;
  totalDamageDealt: number;
  perfectHits: number;
  criticalHits: number;
  comboTier: ComboTier;
  isActive: boolean;
}

export type ComboTier = 'none' | 'good' | 'great' | 'excellent' | 'perfect' | 'legendary';

interface ComboTierConfig {
  tier: ComboTier;
  minCombo: number;
  multiplier: number;
  color: string;
  message: string;
  hapticPattern: string;
}

const COMBO_TIERS: ComboTierConfig[] = [
  { tier: 'none', minCombo: 0, multiplier: 1, color: '#ffffff', message: '', hapticPattern: 'tap' },
  { tier: 'good', minCombo: 5, multiplier: 1.2, color: '#22c55e', message: 'Good!', hapticPattern: 'tap' },
  { tier: 'great', minCombo: 10, multiplier: 1.5, color: '#3b82f6', message: 'Great!', hapticPattern: 'doubleTap' },
  { tier: 'excellent', minCombo: 20, multiplier: 2.0, color: '#a855f7', message: 'Excellent!', hapticPattern: 'success' },
  { tier: 'perfect', minCombo: 35, multiplier: 2.5, color: '#f97316', message: 'Perfect!', hapticPattern: 'achievement' },
  { tier: 'legendary', minCombo: 50, multiplier: 3.0, color: '#fbbf24', message: 'LEGENDARY!', hapticPattern: 'level_up' },
];

const DEFAULT_COMBO_WINDOW = 2000; // ms to maintain combo
const CRITICAL_HIT_CHANCE = 0.1;
const CRITICAL_HIT_MULTIPLIER = 2;

export function useComboSystem(comboWindow: number = DEFAULT_COMBO_WINDOW) {
  const haptics = useHaptics();
  const [state, setState] = useState<ComboState>({
    count: 0,
    multiplier: 1,
    lastHitTime: 0,
    comboWindow,
    maxCombo: 0,
    totalDamageDealt: 0,
    perfectHits: 0,
    criticalHits: 0,
    comboTier: 'none',
    isActive: false,
  });

  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clear combo after window expires
  useEffect(() => {
    if (state.isActive && state.lastHitTime > 0) {
      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current);
      }

      comboTimerRef.current = setTimeout(() => {
        resetCombo();
      }, comboWindow);
    }

    return () => {
      if (comboTimerRef.current) {
        clearTimeout(comboTimerRef.current);
      }
    };
  }, [state.lastHitTime, state.isActive, comboWindow]);

  const getCurrentTier = useCallback((comboCount: number): ComboTierConfig => {
    for (let i = COMBO_TIERS.length - 1; i >= 0; i--) {
      if (comboCount >= COMBO_TIERS[i].minCombo) {
        return COMBO_TIERS[i];
      }
    }
    return COMBO_TIERS[0];
  }, []);

  const registerHit = useCallback((baseDamage: number, isPerfect: boolean = false): { damage: number; isCritical: boolean } => {
    const now = Date.now();
    const isCritical = Math.random() < CRITICAL_HIT_CHANCE;

    setState(prev => {
      const newCount = prev.count + 1;
      const tier = getCurrentTier(newCount);
      let damageMultiplier = tier.multiplier;

      if (isPerfect) {
        damageMultiplier *= 1.5;
      }
      if (isCritical) {
        damageMultiplier *= CRITICAL_HIT_MULTIPLIER;
      }

      const finalDamage = Math.floor(baseDamage * damageMultiplier);

      // Trigger haptic based on tier change
      const prevTier = getCurrentTier(prev.count);
      if (tier.tier !== prevTier.tier && tier.tier !== 'none') {
        haptics.trigger(tier.hapticPattern as any);
      } else if (isCritical) {
        haptics.trigger('impact_heavy');
      } else {
        haptics.trigger('spray_hit');
      }

      return {
        count: newCount,
        multiplier: tier.multiplier,
        lastHitTime: now,
        comboWindow: prev.comboWindow,
        maxCombo: Math.max(prev.maxCombo, newCount),
        totalDamageDealt: prev.totalDamageDealt + finalDamage,
        perfectHits: prev.perfectHits + (isPerfect ? 1 : 0),
        criticalHits: prev.criticalHits + (isCritical ? 1 : 0),
        comboTier: tier.tier,
        isActive: true,
      };
    });

    const tier = getCurrentTier(state.count + 1);
    let damageMultiplier = tier.multiplier;
    if (isPerfect) damageMultiplier *= 1.5;
    if (isCritical) damageMultiplier *= CRITICAL_HIT_MULTIPLIER;

    return {
      damage: Math.floor(baseDamage * damageMultiplier),
      isCritical,
    };
  }, [state.count, getCurrentTier, haptics]);

  const resetCombo = useCallback(() => {
    if (comboTimerRef.current) {
      clearTimeout(comboTimerRef.current);
    }

    setState(prev => ({
      ...prev,
      count: 0,
      multiplier: 1,
      comboTier: 'none',
      isActive: false,
    }));
  }, []);

  const getComboBonus = useCallback((): number => {
    // Bonus coins/XP based on max combo achieved
    if (state.maxCombo >= 50) return 500;
    if (state.maxCombo >= 35) return 300;
    if (state.maxCombo >= 20) return 150;
    if (state.maxCombo >= 10) return 75;
    if (state.maxCombo >= 5) return 25;
    return 0;
  }, [state.maxCombo]);

  const getStats = useCallback(() => ({
    maxCombo: state.maxCombo,
    totalDamage: state.totalDamageDealt,
    perfectHits: state.perfectHits,
    criticalHits: state.criticalHits,
    comboBonus: getComboBonus(),
  }), [state, getComboBonus]);

  const getTierInfo = useCallback(() => {
    const tier = getCurrentTier(state.count);
    const nextTierIndex = COMBO_TIERS.findIndex(t => t.tier === tier.tier) + 1;
    const nextTier = nextTierIndex < COMBO_TIERS.length ? COMBO_TIERS[nextTierIndex] : null;
    
    return {
      current: tier,
      next: nextTier,
      progress: nextTier ? (state.count - tier.minCombo) / (nextTier.minCombo - tier.minCombo) : 1,
    };
  }, [state.count, getCurrentTier]);

  const getRemainingTime = useCallback((): number => {
    if (!state.isActive || state.lastHitTime === 0) return 0;
    const elapsed = Date.now() - state.lastHitTime;
    return Math.max(0, comboWindow - elapsed);
  }, [state.isActive, state.lastHitTime, comboWindow]);

  return {
    state,
    registerHit,
    resetCombo,
    getComboBonus,
    getStats,
    getTierInfo,
    getRemainingTime,
    COMBO_TIERS,
  };
}

export default useComboSystem;
