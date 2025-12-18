import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const GAME_STATE_KEY = 'KannaSprout_GameState';

/**
 * @interface GameState
 * @description Represents the structure of the game's state.
 * @property {number} level - The player's current level.
 * @property {number} score - The player's current score.
 * @property {number} gleaf - The player's in-game currency (G-Leafs).
 * @property {boolean} isPremium - Flag indicating if the player has a premium account.
 */
interface GameState {
  level: number;
  score: number;
  gleaf: number;
  isPremium: boolean;
}

const initialState: GameState = {
  level: 1,
  score: 0,
  gleaf: 100,
  isPremium: false,
};

/**
 * @hook useGameState
 * @description A custom hook to manage the game's state, persisting it to AsyncStorage.
 * It provides the current game state and functions to update it.
 * Haptic feedback is triggered on specific state changes.
 */
export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [isLoaded, setIsLoaded] = useState(false);

  // Effect to load the state from AsyncStorage on initial mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(GAME_STATE_KEY);
        if (savedState !== null) {
          setGameState(JSON.parse(savedState));
        }
      } catch (error) {
        console.error('Failed to load game state from AsyncStorage', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadState();
  }, []);

  // Effect to save the state to AsyncStorage whenever it changes
  useEffect(() => {
    if (isLoaded) {
      const saveState = async () => {
        try {
          await AsyncStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState));
        } catch (error) {
          console.error('Failed to save game state to AsyncStorage', error);
        }
      };
      saveState();
    }
  }, [gameState, isLoaded]);

  const updateLevel = useCallback((newLevel: number) => {
    setGameState(prevState => ({ ...prevState, level: newLevel }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const updateScore = useCallback((points: number) => {
    setGameState(prevState => ({ ...prevState, score: prevState.score + points }));
  }, []);

  const spendGleaf = useCallback((amount: number) => {
    setGameState(prevState => {
      if (prevState.gleaf >= amount) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return { ...prevState, gleaf: prevState.gleaf - amount };
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return prevState;
    });
  }, []);

  const addGleaf = useCallback((amount: number) => {
    setGameState(prevState => ({ ...prevState, gleaf: prevState.gleaf + amount }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const setPremium = useCallback((isPremium: boolean) => {
    setGameState(prevState => ({ ...prevState, isPremium }));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const resetGame = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(GAME_STATE_KEY);
      setGameState(initialState);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to reset game state in AsyncStorage', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, []);

  return {
    ...gameState,
    isLoaded,
    updateLevel,
    updateScore,
    spendGleaf,
    addGleaf,
    setPremium,
    resetGame,
  };
};
