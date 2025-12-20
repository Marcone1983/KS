/**
 * Growth and Breeding Sounds Hook
 * 
 * Provides specialized sound effects for:
 * - Plant growth animations (leaf opening, bud blooming)
 * - Stage transitions
 * - Breeding process (DNA fusion, genetic transfer)
 * - Time-lapse effects
 */

import { useCallback, useRef, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useSounds } from './use-sounds';

// Growth animation sound types
type GrowthSoundName = 
  | 'leaf_unfold'      // Foglia che si apre
  | 'leaf_rustle'      // Fruscio foglie
  | 'bud_bloom'        // Fioritura cima
  | 'pistil_emerge'    // Comparsa pistilli
  | 'stage_up'         // Transizione stadio
  | 'stage_complete'   // Stadio completato
  | 'timelapse_whoosh' // Effetto time-lapse
  | 'growth_ambient'   // Suono ambientale crescita
  | 'water_absorb'     // Assorbimento acqua
  | 'photosynthesis';  // Fotosintesi (suono sottile)

// Breeding sound types
type BreedingSoundName =
  | 'dna_spin'         // Rotazione elica DNA
  | 'dna_merge'        // Fusione DNA
  | 'trait_transfer'   // Trasferimento tratto genetico
  | 'genetic_spark'    // Scintilla genetica
  | 'offspring_reveal' // Reveal prole
  | 'rare_offspring'   // Prole rara
  | 'epic_offspring'   // Prole epica
  | 'legendary_offspring'; // Prole leggendaria

// Sound configurations with pitch/volume variations
interface SoundConfig {
  baseSound: string;
  pitchRange: [number, number];
  volumeRange: [number, number];
  variants?: number;
}

const GROWTH_SOUND_CONFIGS: Record<GrowthSoundName, SoundConfig> = {
  leaf_unfold: {
    baseSound: 'leaves_rustle',
    pitchRange: [0.8, 1.2],
    volumeRange: [0.4, 0.7],
    variants: 3,
  },
  leaf_rustle: {
    baseSound: 'leaves_rustle',
    pitchRange: [0.9, 1.1],
    volumeRange: [0.2, 0.4],
    variants: 3,
  },
  bud_bloom: {
    baseSound: 'growth_tick',
    pitchRange: [0.6, 0.9],
    volumeRange: [0.5, 0.8],
  },
  pistil_emerge: {
    baseSound: 'growth_tick',
    pitchRange: [1.2, 1.5],
    volumeRange: [0.3, 0.5],
  },
  stage_up: {
    baseSound: 'plant_levelup',
    pitchRange: [0.9, 1.1],
    volumeRange: [0.7, 1.0],
  },
  stage_complete: {
    baseSound: 'ui_success',
    pitchRange: [0.8, 1.0],
    volumeRange: [0.6, 0.8],
  },
  timelapse_whoosh: {
    baseSound: 'wind_gust',
    pitchRange: [1.5, 2.0],
    volumeRange: [0.3, 0.5],
  },
  growth_ambient: {
    baseSound: 'amb_day_loop',
    pitchRange: [1.0, 1.0],
    volumeRange: [0.1, 0.2],
  },
  water_absorb: {
    baseSound: 'spray_hit_leaf',
    pitchRange: [0.5, 0.7],
    volumeRange: [0.3, 0.5],
  },
  photosynthesis: {
    baseSound: 'xp_tick',
    pitchRange: [1.5, 2.0],
    volumeRange: [0.1, 0.2],
  },
};

const BREEDING_SOUND_CONFIGS: Record<BreedingSoundName, SoundConfig> = {
  dna_spin: {
    baseSound: 'breed_loop',
    pitchRange: [0.8, 1.2],
    volumeRange: [0.4, 0.6],
  },
  dna_merge: {
    baseSound: 'breed_complete',
    pitchRange: [0.7, 0.9],
    volumeRange: [0.6, 0.8],
  },
  trait_transfer: {
    baseSound: 'growth_tick',
    pitchRange: [1.0, 1.3],
    volumeRange: [0.4, 0.6],
  },
  genetic_spark: {
    baseSound: 'xp_tick',
    pitchRange: [1.2, 1.8],
    volumeRange: [0.3, 0.5],
  },
  offspring_reveal: {
    baseSound: 'breed_complete',
    pitchRange: [1.0, 1.2],
    volumeRange: [0.8, 1.0],
  },
  rare_offspring: {
    baseSound: 'shop_buy_rare',
    pitchRange: [0.9, 1.1],
    volumeRange: [0.7, 0.9],
  },
  epic_offspring: {
    baseSound: 'strain_unlock',
    pitchRange: [0.8, 1.0],
    volumeRange: [0.8, 1.0],
  },
  legendary_offspring: {
    baseSound: 'strain_unlock',
    pitchRange: [0.6, 0.8],
    volumeRange: [1.0, 1.0],
  },
};

// Map base sounds to actual sound files
const BASE_SOUND_MAP: Record<string, any> = {
  leaves_rustle: require('@/assets/sounds/ambient/leaves_rustle.wav'),
  growth_tick: require('@/assets/sounds/breed/growth_tick.wav'),
  plant_levelup: require('@/assets/sounds/breed/plant_levelup.wav'),
  ui_success: require('@/assets/sounds/ui/ui_success.wav'),
  wind_gust: require('@/assets/sounds/ambient/wind_gust.wav'),
  amb_day_loop: require('@/assets/sounds/ambient/amb_day_loop.wav'),
  spray_hit_leaf: require('@/assets/sounds/spray/spray_hit_leaf_01.wav'),
  xp_tick: require('@/assets/sounds/progress/xp_tick.wav'),
  breed_loop: require('@/assets/sounds/breed/breed_loop.wav'),
  breed_complete: require('@/assets/sounds/breed/breed_complete.wav'),
  shop_buy_rare: require('@/assets/sounds/shop/shop_buy_rare.wav'),
  strain_unlock: require('@/assets/sounds/breed/strain_unlock.wav'),
};

interface UseGrowthSoundsReturn {
  // Growth sounds
  playLeafUnfold: () => Promise<void>;
  playLeafRustle: () => Promise<void>;
  playBudBloom: () => Promise<void>;
  playPistilEmerge: () => Promise<void>;
  playStageUp: (stage: number) => Promise<void>;
  playStageComplete: () => Promise<void>;
  playTimelapse: (speed: number) => Promise<void>;
  startGrowthAmbient: () => Promise<void>;
  stopGrowthAmbient: () => Promise<void>;
  
  // Breeding sounds
  startDNASpin: () => Promise<void>;
  stopDNASpin: () => Promise<void>;
  playDNAMerge: () => Promise<void>;
  playTraitTransfer: () => Promise<void>;
  playGeneticSpark: () => Promise<void>;
  playOffspringReveal: (rarity: 'common' | 'rare' | 'epic' | 'legendary') => Promise<void>;
  
  // Utility
  playGrowthSequence: (fromStage: number, toStage: number) => Promise<void>;
  playBreedingSequence: (duration: number, rarity: 'common' | 'rare' | 'epic' | 'legendary') => Promise<void>;
}

export function useGrowthSounds(): UseGrowthSoundsReturn {
  const { settings } = useSounds();
  const activeLoops = useRef<Map<string, Audio.Sound>>(new Map());
  const sequenceTimeouts = useRef<NodeJS.Timeout[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop all loops
      activeLoops.current.forEach(async (sound) => {
        try {
          await sound.stopAsync();
          await sound.unloadAsync();
        } catch (e) {}
      });
      activeLoops.current.clear();
      
      // Clear timeouts
      sequenceTimeouts.current.forEach(clearTimeout);
    };
  }, []);

  // Helper to get random value in range
  const getRandomInRange = (range: [number, number]) => {
    return range[0] + Math.random() * (range[1] - range[0]);
  };

  // Play a configured sound with variations
  const playConfiguredSound = useCallback(async (
    config: SoundConfig,
    options?: { pitch?: number; volume?: number }
  ) => {
    if (!settings.soundEnabled) return;

    try {
      const asset = BASE_SOUND_MAP[config.baseSound];
      if (!asset) {
        console.warn(`Base sound not found: ${config.baseSound}`);
        return;
      }

      const pitch = options?.pitch ?? getRandomInRange(config.pitchRange);
      const volume = (options?.volume ?? getRandomInRange(config.volumeRange)) * settings.soundVolume;

      const { sound } = await Audio.Sound.createAsync(asset, {
        volume,
        rate: pitch,
        shouldCorrectPitch: true,
        shouldPlay: true,
      });

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.warn('Failed to play growth sound:', error);
    }
  }, [settings.soundEnabled, settings.soundVolume]);

  // Start a looping sound
  const startLoop = useCallback(async (name: string, config: SoundConfig) => {
    if (!settings.soundEnabled) return;

    // Stop existing loop
    await stopLoop(name);

    try {
      const asset = BASE_SOUND_MAP[config.baseSound];
      if (!asset) return;

      const volume = getRandomInRange(config.volumeRange) * settings.soundVolume;

      const { sound } = await Audio.Sound.createAsync(asset, {
        volume,
        shouldPlay: true,
        isLooping: true,
      });

      activeLoops.current.set(name, sound);
    } catch (error) {
      console.warn(`Failed to start loop ${name}:`, error);
    }
  }, [settings.soundEnabled, settings.soundVolume]);

  // Stop a looping sound
  const stopLoop = useCallback(async (name: string) => {
    const sound = activeLoops.current.get(name);
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (e) {}
      activeLoops.current.delete(name);
    }
  }, []);

  // Growth sound functions
  const playLeafUnfold = useCallback(async () => {
    await playConfiguredSound(GROWTH_SOUND_CONFIGS.leaf_unfold);
  }, [playConfiguredSound]);

  const playLeafRustle = useCallback(async () => {
    await playConfiguredSound(GROWTH_SOUND_CONFIGS.leaf_rustle);
  }, [playConfiguredSound]);

  const playBudBloom = useCallback(async () => {
    await playConfiguredSound(GROWTH_SOUND_CONFIGS.bud_bloom);
  }, [playConfiguredSound]);

  const playPistilEmerge = useCallback(async () => {
    await playConfiguredSound(GROWTH_SOUND_CONFIGS.pistil_emerge);
  }, [playConfiguredSound]);

  const playStageUp = useCallback(async (stage: number) => {
    // Higher pitch for later stages
    const pitchBonus = (stage - 1) * 0.05;
    await playConfiguredSound(GROWTH_SOUND_CONFIGS.stage_up, {
      pitch: 0.9 + pitchBonus,
    });
  }, [playConfiguredSound]);

  const playStageComplete = useCallback(async () => {
    await playConfiguredSound(GROWTH_SOUND_CONFIGS.stage_complete);
  }, [playConfiguredSound]);

  const playTimelapse = useCallback(async (speed: number) => {
    // Higher pitch for faster timelapse
    const pitch = 1.5 + (speed - 1) * 0.3;
    await playConfiguredSound(GROWTH_SOUND_CONFIGS.timelapse_whoosh, { pitch });
  }, [playConfiguredSound]);

  const startGrowthAmbient = useCallback(async () => {
    await startLoop('growth_ambient', GROWTH_SOUND_CONFIGS.growth_ambient);
  }, [startLoop]);

  const stopGrowthAmbient = useCallback(async () => {
    await stopLoop('growth_ambient');
  }, [stopLoop]);

  // Breeding sound functions
  const startDNASpin = useCallback(async () => {
    await startLoop('dna_spin', BREEDING_SOUND_CONFIGS.dna_spin);
  }, [startLoop]);

  const stopDNASpin = useCallback(async () => {
    await stopLoop('dna_spin');
  }, [stopLoop]);

  const playDNAMerge = useCallback(async () => {
    await playConfiguredSound(BREEDING_SOUND_CONFIGS.dna_merge);
  }, [playConfiguredSound]);

  const playTraitTransfer = useCallback(async () => {
    await playConfiguredSound(BREEDING_SOUND_CONFIGS.trait_transfer);
  }, [playConfiguredSound]);

  const playGeneticSpark = useCallback(async () => {
    await playConfiguredSound(BREEDING_SOUND_CONFIGS.genetic_spark);
  }, [playConfiguredSound]);

  const playOffspringReveal = useCallback(async (rarity: 'common' | 'rare' | 'epic' | 'legendary') => {
    switch (rarity) {
      case 'legendary':
        await playConfiguredSound(BREEDING_SOUND_CONFIGS.legendary_offspring);
        break;
      case 'epic':
        await playConfiguredSound(BREEDING_SOUND_CONFIGS.epic_offspring);
        break;
      case 'rare':
        await playConfiguredSound(BREEDING_SOUND_CONFIGS.rare_offspring);
        break;
      default:
        await playConfiguredSound(BREEDING_SOUND_CONFIGS.offspring_reveal);
    }
  }, [playConfiguredSound]);

  // Play a growth sequence from one stage to another
  const playGrowthSequence = useCallback(async (fromStage: number, toStage: number) => {
    // Clear any existing sequence
    sequenceTimeouts.current.forEach(clearTimeout);
    sequenceTimeouts.current = [];

    const stageCount = toStage - fromStage;
    const delayPerStage = 800; // ms

    for (let i = 0; i <= stageCount; i++) {
      const currentStage = fromStage + i;
      
      const timeout = setTimeout(async () => {
        // Play stage transition
        await playStageUp(currentStage);
        
        // Play appropriate growth sounds based on stage
        if (currentStage <= 4) {
          // Vegetative - leaf sounds
          await playLeafUnfold();
        } else {
          // Flowering - bud and pistil sounds
          if (currentStage === 5) {
            await playPistilEmerge();
          } else {
            await playBudBloom();
          }
        }
        
        // Final stage complete
        if (currentStage === toStage) {
          setTimeout(() => playStageComplete(), 300);
        }
      }, i * delayPerStage);
      
      sequenceTimeouts.current.push(timeout);
    }
  }, [playStageUp, playLeafUnfold, playPistilEmerge, playBudBloom, playStageComplete]);

  // Play a breeding sequence
  const playBreedingSequence = useCallback(async (
    duration: number, 
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
  ) => {
    // Clear any existing sequence
    sequenceTimeouts.current.forEach(clearTimeout);
    sequenceTimeouts.current = [];

    // Start DNA spin
    await startDNASpin();

    // Schedule trait transfers
    const transferCount = 5;
    const transferInterval = duration / (transferCount + 1);

    for (let i = 1; i <= transferCount; i++) {
      const timeout = setTimeout(async () => {
        await playTraitTransfer();
        await playGeneticSpark();
      }, i * transferInterval);
      
      sequenceTimeouts.current.push(timeout);
    }

    // DNA merge near the end
    const mergeTimeout = setTimeout(async () => {
      await playDNAMerge();
    }, duration - 500);
    sequenceTimeouts.current.push(mergeTimeout);

    // Stop spin and reveal offspring at the end
    const revealTimeout = setTimeout(async () => {
      await stopDNASpin();
      await playOffspringReveal(rarity);
    }, duration);
    sequenceTimeouts.current.push(revealTimeout);
  }, [startDNASpin, stopDNASpin, playTraitTransfer, playGeneticSpark, playDNAMerge, playOffspringReveal]);

  return {
    // Growth sounds
    playLeafUnfold,
    playLeafRustle,
    playBudBloom,
    playPistilEmerge,
    playStageUp,
    playStageComplete,
    playTimelapse,
    startGrowthAmbient,
    stopGrowthAmbient,
    
    // Breeding sounds
    startDNASpin,
    stopDNASpin,
    playDNAMerge,
    playTraitTransfer,
    playGeneticSpark,
    playOffspringReveal,
    
    // Sequences
    playGrowthSequence,
    playBreedingSequence,
  };
}

export default useGrowthSounds;
