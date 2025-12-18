import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  currentLevel: number;
  cost: number[];
  costType: 'skill_points' | 'coins' | 'gems';
  prerequisites: string[];
  effects: SkillEffect[];
  category: SkillCategory;
  position: { x: number; y: number };
}

export interface SkillEffect {
  type: 'damage' | 'speed' | 'health' | 'crit_chance' | 'crit_damage' | 'coin_bonus' | 'xp_bonus' | 'spray_capacity' | 'cooldown_reduction' | 'combo_duration' | 'powerup_duration';
  value: number;
  percentage: boolean;
}

export type SkillCategory = 'offense' | 'defense' | 'utility' | 'mastery';

export interface SkillTreeState {
  skills: Record<string, Skill>;
  skillPoints: number;
  totalSkillPointsEarned: number;
  unlockedSkills: string[];
}

const SKILL_DEFINITIONS: Skill[] = [
  // OFFENSE TREE
  { id: 'damage_1', name: 'Spray Potenziato', description: '+10% danno base', icon: '⚔️', maxLevel: 5, currentLevel: 0, cost: [1, 2, 3, 4, 5], costType: 'skill_points', prerequisites: [], effects: [{ type: 'damage', value: 10, percentage: true }], category: 'offense', position: { x: 0, y: 0 } },
  { id: 'damage_2', name: 'Colpo Devastante', description: '+15% danno base', icon: '💥', maxLevel: 5, currentLevel: 0, cost: [2, 3, 4, 5, 6], costType: 'skill_points', prerequisites: ['damage_1'], effects: [{ type: 'damage', value: 15, percentage: true }], category: 'offense', position: { x: 0, y: 1 } },
  { id: 'crit_chance', name: 'Occhio Critico', description: '+5% probabilita critico', icon: '🎯', maxLevel: 5, currentLevel: 0, cost: [2, 3, 4, 5, 6], costType: 'skill_points', prerequisites: ['damage_1'], effects: [{ type: 'crit_chance', value: 5, percentage: true }], category: 'offense', position: { x: 1, y: 1 } },
  { id: 'crit_damage', name: 'Colpo Letale', description: '+20% danno critico', icon: '☠️', maxLevel: 5, currentLevel: 0, cost: [3, 4, 5, 6, 7], costType: 'skill_points', prerequisites: ['crit_chance'], effects: [{ type: 'crit_damage', value: 20, percentage: true }], category: 'offense', position: { x: 1, y: 2 } },
  { id: 'speed_1', name: 'Spray Rapido', description: '+10% velocita spray', icon: '💨', maxLevel: 5, currentLevel: 0, cost: [1, 2, 3, 4, 5], costType: 'skill_points', prerequisites: [], effects: [{ type: 'speed', value: 10, percentage: true }], category: 'offense', position: { x: -1, y: 1 } },
  
  // DEFENSE TREE
  { id: 'health_1', name: 'Costituzione', description: '+10 HP massimi', icon: '❤️', maxLevel: 5, currentLevel: 0, cost: [1, 2, 3, 4, 5], costType: 'skill_points', prerequisites: [], effects: [{ type: 'health', value: 10, percentage: false }], category: 'defense', position: { x: 3, y: 0 } },
  { id: 'health_2', name: 'Vitalita', description: '+15 HP massimi', icon: '💖', maxLevel: 5, currentLevel: 0, cost: [2, 3, 4, 5, 6], costType: 'skill_points', prerequisites: ['health_1'], effects: [{ type: 'health', value: 15, percentage: false }], category: 'defense', position: { x: 3, y: 1 } },
  { id: 'regen', name: 'Rigenerazione', description: 'Rigenera 1 HP ogni 10s', icon: '🔄', maxLevel: 3, currentLevel: 0, cost: [3, 5, 7], costType: 'skill_points', prerequisites: ['health_2'], effects: [{ type: 'health', value: 1, percentage: false }], category: 'defense', position: { x: 3, y: 2 } },
  
  // UTILITY TREE
  { id: 'coin_bonus', name: 'Fortuna', description: '+10% monete', icon: '🪙', maxLevel: 5, currentLevel: 0, cost: [1, 2, 3, 4, 5], costType: 'skill_points', prerequisites: [], effects: [{ type: 'coin_bonus', value: 10, percentage: true }], category: 'utility', position: { x: 6, y: 0 } },
  { id: 'xp_bonus', name: 'Saggezza', description: '+10% XP', icon: '📚', maxLevel: 5, currentLevel: 0, cost: [1, 2, 3, 4, 5], costType: 'skill_points', prerequisites: [], effects: [{ type: 'xp_bonus', value: 10, percentage: true }], category: 'utility', position: { x: 7, y: 0 } },
  { id: 'spray_capacity', name: 'Serbatoio Espanso', description: '+20 capacita spray', icon: '🧪', maxLevel: 5, currentLevel: 0, cost: [2, 3, 4, 5, 6], costType: 'skill_points', prerequisites: ['coin_bonus'], effects: [{ type: 'spray_capacity', value: 20, percentage: false }], category: 'utility', position: { x: 6, y: 1 } },
  { id: 'cooldown', name: 'Efficienza', description: '-5% cooldown abilita', icon: '⏱️', maxLevel: 5, currentLevel: 0, cost: [2, 3, 4, 5, 6], costType: 'skill_points', prerequisites: ['xp_bonus'], effects: [{ type: 'cooldown_reduction', value: 5, percentage: true }], category: 'utility', position: { x: 7, y: 1 } },
  
  // MASTERY TREE
  { id: 'combo_master', name: 'Maestro Combo', description: '+1s durata combo', icon: '🔥', maxLevel: 3, currentLevel: 0, cost: [5, 7, 10], costType: 'skill_points', prerequisites: ['damage_2', 'crit_damage'], effects: [{ type: 'combo_duration', value: 1000, percentage: false }], category: 'mastery', position: { x: 0.5, y: 3 } },
  { id: 'powerup_master', name: 'Maestro Power-up', description: '+20% durata power-up', icon: '⭐', maxLevel: 3, currentLevel: 0, cost: [5, 7, 10], costType: 'skill_points', prerequisites: ['spray_capacity', 'cooldown'], effects: [{ type: 'powerup_duration', value: 20, percentage: true }], category: 'mastery', position: { x: 6.5, y: 2 } },
  { id: 'ultimate', name: 'Potere Supremo', description: 'Sblocca Ultimate Spray', icon: '👑', maxLevel: 1, currentLevel: 0, cost: [20], costType: 'skill_points', prerequisites: ['combo_master', 'powerup_master'], effects: [{ type: 'damage', value: 100, percentage: true }], category: 'mastery', position: { x: 3.5, y: 4 } },
];

const STORAGE_KEY = 'skillTree';

export function useSkillTree() {
  const [state, setState] = useState<SkillTreeState>({
    skills: {},
    skillPoints: 0,
    totalSkillPointsEarned: 0,
    unlockedSkills: [],
  });

  // Initialize skills
  useEffect(() => {
    loadSkillTree();
  }, []);

  const loadSkillTree = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setState(JSON.parse(saved));
      } else {
        // Initialize with default skills
        const skills: Record<string, Skill> = {};
        SKILL_DEFINITIONS.forEach(skill => {
          skills[skill.id] = { ...skill };
        });
        setState(prev => ({ ...prev, skills }));
      }
    } catch (error) {
      console.error('Failed to load skill tree:', error);
    }
  };

  const saveSkillTree = async (newState: SkillTreeState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.error('Failed to save skill tree:', error);
    }
  };

  const canUnlockSkill = useCallback((skillId: string): boolean => {
    const skill = state.skills[skillId];
    if (!skill) return false;
    if (skill.currentLevel >= skill.maxLevel) return false;
    
    const cost = skill.cost[skill.currentLevel];
    if (state.skillPoints < cost) return false;
    
    // Check prerequisites
    for (const prereq of skill.prerequisites) {
      const prereqSkill = state.skills[prereq];
      if (!prereqSkill || prereqSkill.currentLevel === 0) return false;
    }
    
    return true;
  }, [state]);

  const unlockSkill = useCallback((skillId: string): boolean => {
    if (!canUnlockSkill(skillId)) return false;
    
    setState(prev => {
      const skill = prev.skills[skillId];
      const cost = skill.cost[skill.currentLevel];
      
      const newState = {
        ...prev,
        skillPoints: prev.skillPoints - cost,
        skills: {
          ...prev.skills,
          [skillId]: {
            ...skill,
            currentLevel: skill.currentLevel + 1,
          },
        },
        unlockedSkills: prev.unlockedSkills.includes(skillId) 
          ? prev.unlockedSkills 
          : [...prev.unlockedSkills, skillId],
      };
      
      saveSkillTree(newState);
      return newState;
    });
    
    return true;
  }, [canUnlockSkill]);

  const addSkillPoints = useCallback((amount: number) => {
    setState(prev => {
      const newState = {
        ...prev,
        skillPoints: prev.skillPoints + amount,
        totalSkillPointsEarned: prev.totalSkillPointsEarned + amount,
      };
      saveSkillTree(newState);
      return newState;
    });
  }, []);

  const resetSkillTree = useCallback(() => {
    setState(prev => {
      // Refund all spent points
      let refundedPoints = 0;
      const resetSkills: Record<string, Skill> = {};
      
      Object.values(prev.skills).forEach(skill => {
        for (let i = 0; i < skill.currentLevel; i++) {
          refundedPoints += skill.cost[i];
        }
        resetSkills[skill.id] = { ...skill, currentLevel: 0 };
      });
      
      const newState = {
        ...prev,
        skills: resetSkills,
        skillPoints: prev.skillPoints + refundedPoints,
        unlockedSkills: [],
      };
      
      saveSkillTree(newState);
      return newState;
    });
  }, []);

  const getTotalBonus = useCallback((effectType: SkillEffect['type']): number => {
    let total = 0;
    Object.values(state.skills).forEach(skill => {
      if (skill.currentLevel > 0) {
        skill.effects.forEach(effect => {
          if (effect.type === effectType) {
            total += effect.value * skill.currentLevel;
          }
        });
      }
    });
    return total;
  }, [state.skills]);

  const getSkillsByCategory = useCallback((category: SkillCategory): Skill[] => {
    return Object.values(state.skills).filter(s => s.category === category);
  }, [state.skills]);

  return {
    state,
    canUnlockSkill,
    unlockSkill,
    addSkillPoints,
    resetSkillTree,
    getTotalBonus,
    getSkillsByCategory,
    SKILL_DEFINITIONS,
  };
}

export default useSkillTree;
