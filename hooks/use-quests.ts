import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type QuestType = 'main' | 'side' | 'daily' | 'weekly' | 'event';
export type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'claimed';
export type ObjectiveType = 'kill_pests' | 'kill_boss' | 'collect_coins' | 'reach_combo' | 'complete_levels' | 'breed_plants' | 'craft_items' | 'buy_items' | 'reach_prestige' | 'unlock_skills';

export interface QuestObjective {
  id: string;
  type: ObjectiveType;
  description: string;
  target: number;
  current: number;
  completed: boolean;
}

export interface QuestReward {
  type: 'coins' | 'gems' | 'xp' | 'skill_points' | 'item' | 'chest';
  amount: number;
  itemId?: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  chapter?: number;
  status: QuestStatus;
  objectives: QuestObjective[];
  rewards: QuestReward[];
  prerequisites: string[];
  expiresAt?: number;
  icon: string;
}

interface QuestState {
  quests: Record<string, Quest>;
  activeQuestIds: string[];
  completedQuestIds: string[];
  claimedQuestIds: string[];
  totalQuestsCompleted: number;
  mainQuestProgress: number;
}

const STORAGE_KEY = '@kurstaki_quests';

const INITIAL_QUESTS: Quest[] = [
  // Main Story Quests - Chapter 1
  {
    id: 'main_1_1',
    title: 'Il Risveglio del Guardiano',
    description: 'Inizia il tuo viaggio come guardiano delle piante. Elimina i primi parassiti che minacciano il giardino.',
    type: 'main',
    chapter: 1,
    status: 'available',
    objectives: [
      { id: 'obj_1', type: 'kill_pests', description: 'Elimina 10 parassiti', target: 10, current: 0, completed: false },
    ],
    rewards: [
      { type: 'coins', amount: 100 },
      { type: 'xp', amount: 50 },
    ],
    prerequisites: [],
    icon: '🌱',
  },
  {
    id: 'main_1_2',
    title: 'Primi Passi',
    description: 'Impara le basi della coltivazione e raggiungi il tuo primo combo.',
    type: 'main',
    chapter: 1,
    status: 'locked',
    objectives: [
      { id: 'obj_1', type: 'reach_combo', description: 'Raggiungi un combo di 5x', target: 5, current: 0, completed: false },
      { id: 'obj_2', type: 'collect_coins', description: 'Raccogli 200 monete', target: 200, current: 0, completed: false },
    ],
    rewards: [
      { type: 'coins', amount: 200 },
      { type: 'xp', amount: 100 },
      { type: 'item', amount: 1, itemId: 'spray_basic' },
    ],
    prerequisites: ['main_1_1'],
    icon: '👣',
  },
  {
    id: 'main_1_3',
    title: 'La Prima Sfida',
    description: 'Affronta il tuo primo boss e dimostra il tuo valore.',
    type: 'main',
    chapter: 1,
    status: 'locked',
    objectives: [
      { id: 'obj_1', type: 'kill_boss', description: 'Sconfiggi 1 boss', target: 1, current: 0, completed: false },
    ],
    rewards: [
      { type: 'coins', amount: 500 },
      { type: 'gems', amount: 10 },
      { type: 'xp', amount: 200 },
    ],
    prerequisites: ['main_1_2'],
    icon: '⚔️',
  },
  // Chapter 2
  {
    id: 'main_2_1',
    title: 'Il Giardino si Espande',
    description: 'Il tuo giardino cresce. Completa più livelli per sbloccare nuove aree.',
    type: 'main',
    chapter: 2,
    status: 'locked',
    objectives: [
      { id: 'obj_1', type: 'complete_levels', description: 'Completa 5 livelli', target: 5, current: 0, completed: false },
      { id: 'obj_2', type: 'kill_pests', description: 'Elimina 50 parassiti', target: 50, current: 0, completed: false },
    ],
    rewards: [
      { type: 'coins', amount: 800 },
      { type: 'skill_points', amount: 2 },
      { type: 'xp', amount: 300 },
    ],
    prerequisites: ['main_1_3'],
    icon: '🌿',
  },
  {
    id: 'main_2_2',
    title: 'Maestro del Breeding',
    description: 'Impara l\'arte dell\'ibridazione delle piante.',
    type: 'main',
    chapter: 2,
    status: 'locked',
    objectives: [
      { id: 'obj_1', type: 'breed_plants', description: 'Crea 3 ibridi', target: 3, current: 0, completed: false },
    ],
    rewards: [
      { type: 'coins', amount: 1000 },
      { type: 'gems', amount: 20 },
      { type: 'xp', amount: 400 },
    ],
    prerequisites: ['main_2_1'],
    icon: '🧬',
  },
  // Side Quests
  {
    id: 'side_collector',
    title: 'Il Collezionista',
    description: 'Raccogli una grande quantità di monete.',
    type: 'side',
    status: 'available',
    objectives: [
      { id: 'obj_1', type: 'collect_coins', description: 'Raccogli 5000 monete', target: 5000, current: 0, completed: false },
    ],
    rewards: [
      { type: 'gems', amount: 15 },
      { type: 'chest', amount: 1 },
    ],
    prerequisites: [],
    icon: '💰',
  },
  {
    id: 'side_combo_master',
    title: 'Maestro del Combo',
    description: 'Dimostra la tua abilità raggiungendo combo elevati.',
    type: 'side',
    status: 'available',
    objectives: [
      { id: 'obj_1', type: 'reach_combo', description: 'Raggiungi un combo di 20x', target: 20, current: 0, completed: false },
    ],
    rewards: [
      { type: 'skill_points', amount: 3 },
      { type: 'xp', amount: 500 },
    ],
    prerequisites: [],
    icon: '🔥',
  },
  {
    id: 'side_crafter',
    title: 'L\'Artigiano',
    description: 'Crea oggetti al banco da lavoro.',
    type: 'side',
    status: 'available',
    objectives: [
      { id: 'obj_1', type: 'craft_items', description: 'Crea 5 oggetti', target: 5, current: 0, completed: false },
    ],
    rewards: [
      { type: 'coins', amount: 600 },
      { type: 'item', amount: 1, itemId: 'recipe_rare' },
    ],
    prerequisites: [],
    icon: '🔨',
  },
  {
    id: 'side_shopper',
    title: 'Lo Shopper',
    description: 'Acquista oggetti dal negozio.',
    type: 'side',
    status: 'available',
    objectives: [
      { id: 'obj_1', type: 'buy_items', description: 'Acquista 10 oggetti', target: 10, current: 0, completed: false },
    ],
    rewards: [
      { type: 'gems', amount: 25 },
    ],
    prerequisites: [],
    icon: '🛒',
  },
  // Daily Quests (regenerate daily)
  {
    id: 'daily_pests',
    title: 'Caccia Quotidiana',
    description: 'Elimina parassiti oggi.',
    type: 'daily',
    status: 'available',
    objectives: [
      { id: 'obj_1', type: 'kill_pests', description: 'Elimina 25 parassiti', target: 25, current: 0, completed: false },
    ],
    rewards: [
      { type: 'coins', amount: 150 },
      { type: 'xp', amount: 75 },
    ],
    prerequisites: [],
    icon: '🐛',
  },
  {
    id: 'daily_coins',
    title: 'Raccolta Giornaliera',
    description: 'Raccogli monete oggi.',
    type: 'daily',
    status: 'available',
    objectives: [
      { id: 'obj_1', type: 'collect_coins', description: 'Raccogli 500 monete', target: 500, current: 0, completed: false },
    ],
    rewards: [
      { type: 'gems', amount: 5 },
      { type: 'xp', amount: 50 },
    ],
    prerequisites: [],
    icon: '🪙',
  },
  // Weekly Quests
  {
    id: 'weekly_boss_hunter',
    title: 'Cacciatore di Boss',
    description: 'Sconfiggi più boss questa settimana.',
    type: 'weekly',
    status: 'available',
    objectives: [
      { id: 'obj_1', type: 'kill_boss', description: 'Sconfiggi 5 boss', target: 5, current: 0, completed: false },
    ],
    rewards: [
      { type: 'gems', amount: 50 },
      { type: 'skill_points', amount: 5 },
      { type: 'chest', amount: 1 },
    ],
    prerequisites: [],
    icon: '👑',
  },
  {
    id: 'weekly_grinder',
    title: 'Maratoneta',
    description: 'Completa molti livelli questa settimana.',
    type: 'weekly',
    status: 'available',
    objectives: [
      { id: 'obj_1', type: 'complete_levels', description: 'Completa 20 livelli', target: 20, current: 0, completed: false },
    ],
    rewards: [
      { type: 'coins', amount: 2000 },
      { type: 'xp', amount: 1000 },
    ],
    prerequisites: [],
    icon: '🏃',
  },
];

const initialState: QuestState = {
  quests: INITIAL_QUESTS.reduce((acc, q) => ({ ...acc, [q.id]: q }), {}),
  activeQuestIds: [],
  completedQuestIds: [],
  claimedQuestIds: [],
  totalQuestsCompleted: 0,
  mainQuestProgress: 0,
};

export function useQuests() {
  const [state, setState] = useState<QuestState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load state
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(data => {
      if (data) {
        const saved = JSON.parse(data);
        setState(prev => ({ ...prev, ...saved }));
      }
      setIsLoaded(true);
    });
  }, []);

  // Save state
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded]);

  // Accept quest
  const acceptQuest = useCallback((questId: string) => {
    setState(prev => {
      const quest = prev.quests[questId];
      if (!quest || quest.status !== 'available') return prev;
      
      return {
        ...prev,
        quests: {
          ...prev.quests,
          [questId]: { ...quest, status: 'active' as QuestStatus },
        },
        activeQuestIds: [...prev.activeQuestIds, questId],
      };
    });
  }, []);

  // Update quest progress
  const updateProgress = useCallback((objectiveType: ObjectiveType, amount: number = 1) => {
    setState(prev => {
      const updatedQuests = { ...prev.quests };
      let hasChanges = false;
      
      prev.activeQuestIds.forEach(questId => {
        const quest = updatedQuests[questId];
        if (!quest || quest.status !== 'active') return;
        
        const updatedObjectives = quest.objectives.map(obj => {
          if (obj.type === objectiveType && !obj.completed) {
            const newCurrent = Math.min(obj.current + amount, obj.target);
            hasChanges = true;
            return {
              ...obj,
              current: newCurrent,
              completed: newCurrent >= obj.target,
            };
          }
          return obj;
        });
        
        const allCompleted = updatedObjectives.every(obj => obj.completed);
        
        updatedQuests[questId] = {
          ...quest,
          objectives: updatedObjectives,
          status: allCompleted ? 'completed' as QuestStatus : quest.status,
        };
      });
      
      if (!hasChanges) return prev;
      
      const newCompletedIds = Object.values(updatedQuests)
        .filter(q => q.status === 'completed' && !prev.completedQuestIds.includes(q.id))
        .map(q => q.id);
      
      return {
        ...prev,
        quests: updatedQuests,
        completedQuestIds: [...prev.completedQuestIds, ...newCompletedIds],
      };
    });
  }, []);

  // Claim rewards
  const claimRewards = useCallback((questId: string): QuestReward[] | null => {
    const quest = state.quests[questId];
    if (!quest || quest.status !== 'completed') return null;
    
    setState(prev => {
      // Unlock next quests
      const updatedQuests = { ...prev.quests };
      updatedQuests[questId] = { ...quest, status: 'claimed' as QuestStatus };
      
      // Check prerequisites for other quests
      Object.values(updatedQuests).forEach(q => {
        if (q.status === 'locked' && q.prerequisites.every(prereq => 
          updatedQuests[prereq]?.status === 'claimed'
        )) {
          updatedQuests[q.id] = { ...q, status: 'available' as QuestStatus };
        }
      });
      
      const mainQuestProgress = Object.values(updatedQuests)
        .filter(q => q.type === 'main' && q.status === 'claimed').length;
      
      return {
        ...prev,
        quests: updatedQuests,
        claimedQuestIds: [...prev.claimedQuestIds, questId],
        activeQuestIds: prev.activeQuestIds.filter(id => id !== questId),
        totalQuestsCompleted: prev.totalQuestsCompleted + 1,
        mainQuestProgress,
      };
    });
    
    return quest.rewards;
  }, [state.quests]);

  // Get quests by type
  const getQuestsByType = useCallback((type: QuestType): Quest[] => {
    return Object.values(state.quests).filter(q => q.type === type);
  }, [state.quests]);

  // Get active quests
  const getActiveQuests = useCallback((): Quest[] => {
    return state.activeQuestIds.map(id => state.quests[id]).filter(Boolean);
  }, [state.quests, state.activeQuestIds]);

  // Get available quests
  const getAvailableQuests = useCallback((): Quest[] => {
    return Object.values(state.quests).filter(q => q.status === 'available');
  }, [state.quests]);

  // Get main quest chapter
  const getCurrentChapter = useCallback((): number => {
    const mainQuests = Object.values(state.quests).filter(q => q.type === 'main');
    const lastClaimed = mainQuests
      .filter(q => q.status === 'claimed')
      .sort((a, b) => (b.chapter || 0) - (a.chapter || 0))[0];
    return lastClaimed?.chapter || 1;
  }, [state.quests]);

  return {
    state,
    acceptQuest,
    updateProgress,
    claimRewards,
    getQuestsByType,
    getActiveQuests,
    getAvailableQuests,
    getCurrentChapter,
    isLoaded,
  };
}
