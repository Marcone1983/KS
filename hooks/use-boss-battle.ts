import { useState, useCallback, useRef, useEffect } from 'react';
import { useHaptics } from './use-haptics';

export interface BossConfig {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  attackPatterns: AttackPattern[];
  weakPoints: WeakPoint[];
  phases: BossPhase[];
  rewards: BossReward;
}

export interface AttackPattern {
  id: string;
  name: string;
  type: 'charge' | 'projectile' | 'aoe' | 'summon' | 'laser';
  damage: number;
  cooldown: number;
  duration: number;
  warning: number; // ms before attack
  hitArea: { x: number; y: number; width: number; height: number };
}

export interface WeakPoint {
  id: string;
  position: { x: number; y: number };
  radius: number;
  damageMultiplier: number;
  exposedDuring: string[]; // attack pattern ids
}

export interface BossPhase {
  healthThreshold: number; // percentage
  speedMultiplier: number;
  damageMultiplier: number;
  newPatterns: string[];
  removedPatterns: string[];
}

export interface BossReward {
  coins: number;
  xp: number;
  items: { itemId: string; chance: number }[];
  achievement?: string;
}

export interface BossBattleState {
  isActive: boolean;
  boss: BossConfig | null;
  currentPhase: number;
  bossHealth: number;
  playerHealth: number;
  playerMaxHealth: number;
  currentAttack: AttackPattern | null;
  attackProgress: number;
  isVulnerable: boolean;
  activeWeakPoints: WeakPoint[];
  comboCount: number;
  comboMultiplier: number;
  score: number;
  timeElapsed: number;
  isPaused: boolean;
}

const BOSSES: Record<string, BossConfig> = {
  locust_king: {
    id: 'locust_king',
    name: 'Re Locusta',
    health: 1000,
    maxHealth: 1000,
    damage: 20,
    speed: 1,
    attackPatterns: [
      { id: 'charge', name: 'Carica', type: 'charge', damage: 25, cooldown: 5000, duration: 2000, warning: 1000, hitArea: { x: 0, y: 0, width: 100, height: 50 } },
      { id: 'swarm', name: 'Sciame', type: 'summon', damage: 10, cooldown: 8000, duration: 3000, warning: 1500, hitArea: { x: 0, y: 0, width: 200, height: 200 } },
      { id: 'stomp', name: 'Pestata', type: 'aoe', damage: 30, cooldown: 6000, duration: 1000, warning: 800, hitArea: { x: 0, y: 0, width: 150, height: 150 } },
    ],
    weakPoints: [
      { id: 'head', position: { x: 0.5, y: 0.2 }, radius: 0.1, damageMultiplier: 2, exposedDuring: ['charge'] },
      { id: 'belly', position: { x: 0.5, y: 0.6 }, radius: 0.15, damageMultiplier: 1.5, exposedDuring: ['stomp'] },
    ],
    phases: [
      { healthThreshold: 100, speedMultiplier: 1, damageMultiplier: 1, newPatterns: [], removedPatterns: [] },
      { healthThreshold: 60, speedMultiplier: 1.3, damageMultiplier: 1.2, newPatterns: ['laser'], removedPatterns: [] },
      { healthThreshold: 30, speedMultiplier: 1.6, damageMultiplier: 1.5, newPatterns: ['rage'], removedPatterns: ['charge'] },
    ],
    rewards: { coins: 500, xp: 1000, items: [{ itemId: 'legendary_spray', chance: 0.1 }, { itemId: 'boss_trophy', chance: 1 }], achievement: 'boss_slayer' },
  },
  spider_queen: {
    id: 'spider_queen',
    name: 'Regina Ragno',
    health: 800,
    maxHealth: 800,
    damage: 15,
    speed: 1.2,
    attackPatterns: [
      { id: 'web', name: 'Ragnatela', type: 'projectile', damage: 15, cooldown: 4000, duration: 1500, warning: 500, hitArea: { x: 0, y: 0, width: 80, height: 80 } },
      { id: 'poison', name: 'Veleno', type: 'aoe', damage: 5, cooldown: 7000, duration: 4000, warning: 1000, hitArea: { x: 0, y: 0, width: 120, height: 120 } },
      { id: 'eggs', name: 'Uova', type: 'summon', damage: 8, cooldown: 10000, duration: 2000, warning: 2000, hitArea: { x: 0, y: 0, width: 180, height: 180 } },
    ],
    weakPoints: [
      { id: 'eyes', position: { x: 0.5, y: 0.15 }, radius: 0.08, damageMultiplier: 2.5, exposedDuring: ['web'] },
      { id: 'abdomen', position: { x: 0.5, y: 0.7 }, radius: 0.2, damageMultiplier: 1.3, exposedDuring: ['eggs'] },
    ],
    phases: [
      { healthThreshold: 100, speedMultiplier: 1, damageMultiplier: 1, newPatterns: [], removedPatterns: [] },
      { healthThreshold: 50, speedMultiplier: 1.4, damageMultiplier: 1.3, newPatterns: ['frenzy'], removedPatterns: [] },
    ],
    rewards: { coins: 400, xp: 800, items: [{ itemId: 'rare_potion', chance: 0.2 }], achievement: 'spider_slayer' },
  },
  caterpillar_titan: {
    id: 'caterpillar_titan',
    name: 'Bruco Titano',
    health: 1500,
    maxHealth: 1500,
    damage: 30,
    speed: 0.7,
    attackPatterns: [
      { id: 'roll', name: 'Rotolata', type: 'charge', damage: 40, cooldown: 8000, duration: 3000, warning: 1500, hitArea: { x: 0, y: 0, width: 200, height: 100 } },
      { id: 'spit', name: 'Sputo Acido', type: 'projectile', damage: 20, cooldown: 3000, duration: 1000, warning: 600, hitArea: { x: 0, y: 0, width: 60, height: 60 } },
      { id: 'earthquake', name: 'Terremoto', type: 'aoe', damage: 25, cooldown: 12000, duration: 2000, warning: 2000, hitArea: { x: 0, y: 0, width: 300, height: 300 } },
    ],
    weakPoints: [
      { id: 'mouth', position: { x: 0.2, y: 0.4 }, radius: 0.12, damageMultiplier: 2, exposedDuring: ['spit'] },
      { id: 'segments', position: { x: 0.7, y: 0.5 }, radius: 0.18, damageMultiplier: 1.4, exposedDuring: ['roll'] },
    ],
    phases: [
      { healthThreshold: 100, speedMultiplier: 1, damageMultiplier: 1, newPatterns: [], removedPatterns: [] },
      { healthThreshold: 70, speedMultiplier: 1.2, damageMultiplier: 1.1, newPatterns: [], removedPatterns: [] },
      { healthThreshold: 40, speedMultiplier: 1.5, damageMultiplier: 1.4, newPatterns: ['cocoon'], removedPatterns: [] },
    ],
    rewards: { coins: 600, xp: 1200, items: [{ itemId: 'epic_fertilizer', chance: 0.15 }], achievement: 'titan_slayer' },
  },
};

export function useBossBattle() {
  const haptics = useHaptics();
  const [state, setState] = useState<BossBattleState>({
    isActive: false,
    boss: null,
    currentPhase: 0,
    bossHealth: 0,
    playerHealth: 100,
    playerMaxHealth: 100,
    currentAttack: null,
    attackProgress: 0,
    isVulnerable: false,
    activeWeakPoints: [],
    comboCount: 0,
    comboMultiplier: 1,
    score: 0,
    timeElapsed: 0,
    isPaused: false,
  });

  const attackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);

  const startBattle = useCallback((bossId: string) => {
    const boss = BOSSES[bossId];
    if (!boss) return;

    haptics.trigger('impact_heavy');
    setState({
      isActive: true,
      boss,
      currentPhase: 0,
      bossHealth: boss.health,
      playerHealth: 100,
      playerMaxHealth: 100,
      currentAttack: null,
      attackProgress: 0,
      isVulnerable: false,
      activeWeakPoints: [],
      comboCount: 0,
      comboMultiplier: 1,
      score: 0,
      timeElapsed: 0,
      isPaused: false,
    });
  }, [haptics]);

  const endBattle = useCallback((victory: boolean) => {
    if (attackTimerRef.current) clearTimeout(attackTimerRef.current);
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);

    if (victory) {
      haptics.trigger('achievement');
    } else {
      haptics.trigger('error');
    }

    setState(prev => ({
      ...prev,
      isActive: false,
    }));

    return victory ? state.boss?.rewards : null;
  }, [haptics, state.boss]);

  const dealDamage = useCallback((damage: number, hitWeakPoint: boolean = false) => {
    setState(prev => {
      if (!prev.boss || !prev.isActive) return prev;

      let actualDamage = damage;
      let newCombo = prev.comboCount + 1;
      let newMultiplier = Math.min(1 + (newCombo * 0.1), 3);

      if (hitWeakPoint) {
        actualDamage *= 2;
        haptics.trigger('pest_death');
      } else {
        haptics.trigger('spray_hit');
      }

      actualDamage *= newMultiplier;
      const newHealth = Math.max(0, prev.bossHealth - actualDamage);
      const newScore = prev.score + Math.floor(actualDamage * 10);

      // Check phase transition
      let newPhase = prev.currentPhase;
      const healthPercent = (newHealth / prev.boss.maxHealth) * 100;
      for (let i = prev.boss.phases.length - 1; i >= 0; i--) {
        if (healthPercent <= prev.boss.phases[i].healthThreshold && i > prev.currentPhase) {
          newPhase = i;
          haptics.trigger('warning');
          break;
        }
      }

      // Check victory
      if (newHealth <= 0) {
        setTimeout(() => endBattle(true), 500);
      }

      return {
        ...prev,
        bossHealth: newHealth,
        comboCount: newCombo,
        comboMultiplier: newMultiplier,
        score: newScore,
        currentPhase: newPhase,
      };
    });
  }, [haptics, endBattle]);

  const takeDamage = useCallback((damage: number) => {
    setState(prev => {
      if (!prev.isActive) return prev;

      haptics.trigger('error');
      const newHealth = Math.max(0, prev.playerHealth - damage);

      // Reset combo on hit
      if (newHealth <= 0) {
        setTimeout(() => endBattle(false), 500);
      }

      return {
        ...prev,
        playerHealth: newHealth,
        comboCount: 0,
        comboMultiplier: 1,
      };
    });
  }, [haptics, endBattle]);

  const dodge = useCallback(() => {
    haptics.trigger('selection');
    // Invincibility frames handled by game logic
  }, [haptics]);

  const pauseBattle = useCallback(() => {
    setState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  }, []);

  const getAvailableBosses = useCallback(() => {
    return Object.values(BOSSES);
  }, []);

  return {
    state,
    startBattle,
    endBattle,
    dealDamage,
    takeDamage,
    dodge,
    pauseBattle,
    getAvailableBosses,
  };
}

export default useBossBattle;
