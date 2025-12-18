/**
 * Hook per gestione audio centralizzata
 * Supporta riproduzione suoni UI, gameplay, ambient con varianti
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Sound types
type SoundName = 
  | 'ui_tap_light' | 'ui_tap_heavy' | 'ui_back' | 'ui_open' | 'ui_close'
  | 'ui_tab_switch' | 'ui_notif' | 'ui_success' | 'ui_error'
  | 'ui_toggle_on' | 'ui_toggle_off' | 'ui_slider_tick'
  | 'trans_splash_home' | 'trans_enter_game' | 'trans_page'
  | 'shop_open' | 'shop_buy' | 'shop_buy_rare' | 'shop_denied'
  | 'inv_add_item' | 'inv_equip'
  | 'breed_open' | 'breed_select' | 'breed_start' | 'breed_loop'
  | 'breed_complete' | 'strain_unlock' | 'growth_tick' | 'plant_levelup'
  | 'spray_start' | 'spray_loop' | 'spray_stop' | 'spray_hit_leaf'
  | 'spray_empty' | 'spray_refill'
  | 'pest_spawn' | 'pest_idle_loop' | 'pest_hit' | 'pest_die_fall' | 'wave_complete'
  | 'xp_tick' | 'challenge_start' | 'challenge_complete' | 'challenge_fail'
  | 'amb_day_loop' | 'amb_night_loop' | 'wind_gust' | 'leaves_rustle';

// Sound assets mapping
const SOUNDS: Record<string, any> = {
  // UI Base (con varianti)
  ui_tap_light: [
    require('@/assets/sounds/ui/ui_tap_light_01.wav'),
    require('@/assets/sounds/ui/ui_tap_light_02.wav'),
    require('@/assets/sounds/ui/ui_tap_light_03.wav'),
  ],
  ui_tap_heavy: [
    require('@/assets/sounds/ui/ui_tap_heavy_01.wav'),
    require('@/assets/sounds/ui/ui_tap_heavy_02.wav'),
    require('@/assets/sounds/ui/ui_tap_heavy_03.wav'),
  ],
  ui_back: require('@/assets/sounds/ui/ui_back.wav'),
  ui_open: require('@/assets/sounds/ui/ui_open.wav'),
  ui_close: require('@/assets/sounds/ui/ui_close.wav'),
  ui_tab_switch: require('@/assets/sounds/ui/ui_tab_switch.wav'),
  ui_notif: require('@/assets/sounds/ui/ui_notif.wav'),
  ui_success: require('@/assets/sounds/ui/ui_success.wav'),
  ui_error: require('@/assets/sounds/ui/ui_error.wav'),
  ui_toggle_on: require('@/assets/sounds/ui/ui_toggle_on.wav'),
  ui_toggle_off: require('@/assets/sounds/ui/ui_toggle_off.wav'),
  ui_slider_tick: require('@/assets/sounds/ui/ui_slider_tick.wav'),

  // Transitions
  trans_splash_home: require('@/assets/sounds/trans/trans_splash_home.wav'),
  trans_enter_game: require('@/assets/sounds/trans/trans_enter_game.wav'),
  trans_page: require('@/assets/sounds/trans/trans_page.wav'),

  // Shop
  shop_open: require('@/assets/sounds/shop/shop_open.wav'),
  shop_buy: require('@/assets/sounds/shop/shop_buy.wav'),
  shop_buy_rare: require('@/assets/sounds/shop/shop_buy_rare.wav'),
  shop_denied: require('@/assets/sounds/shop/shop_denied.wav'),
  inv_add_item: require('@/assets/sounds/shop/inv_add_item.wav'),
  inv_equip: require('@/assets/sounds/shop/inv_equip.wav'),

  // Breeding
  breed_open: require('@/assets/sounds/breed/breed_open.wav'),
  breed_select: require('@/assets/sounds/breed/breed_select.wav'),
  breed_start: require('@/assets/sounds/breed/breed_start.wav'),
  breed_loop: require('@/assets/sounds/breed/breed_loop.wav'),
  breed_complete: require('@/assets/sounds/breed/breed_complete.wav'),
  strain_unlock: require('@/assets/sounds/breed/strain_unlock.wav'),
  growth_tick: require('@/assets/sounds/breed/growth_tick.wav'),
  plant_levelup: require('@/assets/sounds/breed/plant_levelup.wav'),

  // Spray (con varianti per hit)
  spray_start: require('@/assets/sounds/spray/spray_start.wav'),
  spray_loop: require('@/assets/sounds/spray/spray_loop.wav'),
  spray_stop: require('@/assets/sounds/spray/spray_stop.wav'),
  spray_hit_leaf: [
    require('@/assets/sounds/spray/spray_hit_leaf_01.wav'),
    require('@/assets/sounds/spray/spray_hit_leaf_02.wav'),
    require('@/assets/sounds/spray/spray_hit_leaf_03.wav'),
  ],
  spray_empty: require('@/assets/sounds/spray/spray_empty.wav'),
  spray_refill: require('@/assets/sounds/spray/spray_refill.wav'),

  // Pests (con varianti per hit)
  pest_spawn: require('@/assets/sounds/pest/pest_spawn.wav'),
  pest_idle_loop: require('@/assets/sounds/pest/pest_idle_loop.wav'),
  pest_hit: [
    require('@/assets/sounds/pest/pest_hit_01.wav'),
    require('@/assets/sounds/pest/pest_hit_02.wav'),
  ],
  pest_die_fall: require('@/assets/sounds/pest/pest_die_fall.wav'),
  wave_complete: require('@/assets/sounds/pest/wave_complete.wav'),

  // Progress
  xp_tick: require('@/assets/sounds/progress/xp_tick.wav'),
  challenge_start: require('@/assets/sounds/progress/challenge_start.wav'),
  challenge_complete: require('@/assets/sounds/progress/challenge_complete.wav'),
  challenge_fail: require('@/assets/sounds/progress/challenge_fail.wav'),

  // Ambient
  amb_day_loop: require('@/assets/sounds/ambient/amb_day_loop.wav'),
  amb_night_loop: require('@/assets/sounds/ambient/amb_night_loop.wav'),
  wind_gust: require('@/assets/sounds/ambient/wind_gust.wav'),
  leaves_rustle: require('@/assets/sounds/ambient/leaves_rustle.wav'),
};

// Storage keys
const SOUND_ENABLED_KEY = 'ks_sound_enabled';
const MUSIC_ENABLED_KEY = 'ks_music_enabled';
const SOUND_VOLUME_KEY = 'ks_sound_volume';
const MUSIC_VOLUME_KEY = 'ks_music_volume';

interface SoundSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
}

interface UseSoundsReturn {
  // Playback
  play: (name: SoundName, options?: PlayOptions) => Promise<void>;
  playLoop: (name: SoundName, options?: PlayOptions) => Promise<Audio.Sound | null>;
  stopLoop: (name: SoundName) => Promise<void>;
  stopAllLoops: () => Promise<void>;
  
  // Settings
  settings: SoundSettings;
  setSoundEnabled: (enabled: boolean) => Promise<void>;
  setMusicEnabled: (enabled: boolean) => Promise<void>;
  setSoundVolume: (volume: number) => Promise<void>;
  setMusicVolume: (volume: number) => Promise<void>;
  
  // State
  isLoading: boolean;
}

interface PlayOptions {
  volume?: number;
  loop?: boolean;
}

export function useSounds(): UseSoundsReturn {
  const [settings, setSettings] = useState<SoundSettings>({
    soundEnabled: true,
    musicEnabled: true,
    soundVolume: 1.0,
    musicVolume: 0.7,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Track active loops
  const activeLoops = useRef<Map<string, Audio.Sound>>(new Map());
  
  // Variant counters for alternating sounds
  const variantCounters = useRef<Map<string, number>>(new Map());

  // Load settings on mount
  useEffect(() => {
    loadSettings();
    
    // Configure audio mode
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    
    // Cleanup on unmount
    return () => {
      stopAllLoops();
    };
  }, []);

  const loadSettings = async () => {
    try {
      const [soundEnabled, musicEnabled, soundVolume, musicVolume] = await Promise.all([
        AsyncStorage.getItem(SOUND_ENABLED_KEY),
        AsyncStorage.getItem(MUSIC_ENABLED_KEY),
        AsyncStorage.getItem(SOUND_VOLUME_KEY),
        AsyncStorage.getItem(MUSIC_VOLUME_KEY),
      ]);

      setSettings({
        soundEnabled: soundEnabled !== 'false',
        musicEnabled: musicEnabled !== 'false',
        soundVolume: soundVolume ? parseFloat(soundVolume) : 1.0,
        musicVolume: musicVolume ? parseFloat(musicVolume) : 0.7,
      });
    } catch (error) {
      console.warn('Failed to load sound settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get sound asset, handling variants
  const getSoundAsset = useCallback((name: SoundName) => {
    const sound = SOUNDS[name];
    
    if (Array.isArray(sound)) {
      // Get current variant counter
      const currentCount = variantCounters.current.get(name) || 0;
      const variant = sound[currentCount % sound.length];
      
      // Increment counter for next play
      variantCounters.current.set(name, currentCount + 1);
      
      return variant;
    }
    
    return sound;
  }, []);

  // Play a sound once
  const play = useCallback(async (name: SoundName, options?: PlayOptions) => {
    if (!settings.soundEnabled) return;
    
    try {
      const asset = getSoundAsset(name);
      if (!asset) {
        console.warn(`Sound not found: ${name}`);
        return;
      }

      const { sound } = await Audio.Sound.createAsync(asset, {
        volume: (options?.volume ?? 1.0) * settings.soundVolume,
        shouldPlay: true,
      });

      // Auto-unload when finished
      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.warn(`Failed to play sound ${name}:`, error);
    }
  }, [settings.soundEnabled, settings.soundVolume, getSoundAsset]);

  // Play a looping sound
  const playLoop = useCallback(async (name: SoundName, options?: PlayOptions): Promise<Audio.Sound | null> => {
    // Check if it's music or sound
    const isMusic = name.includes('loop') || name.includes('amb_');
    
    if (isMusic && !settings.musicEnabled) return null;
    if (!isMusic && !settings.soundEnabled) return null;
    
    // Stop existing loop with same name
    await stopLoop(name);
    
    try {
      const asset = getSoundAsset(name);
      if (!asset) {
        console.warn(`Sound not found: ${name}`);
        return null;
      }

      const volume = isMusic ? settings.musicVolume : settings.soundVolume;
      
      const { sound } = await Audio.Sound.createAsync(asset, {
        volume: (options?.volume ?? 1.0) * volume,
        shouldPlay: true,
        isLooping: true,
      });

      activeLoops.current.set(name, sound);
      return sound;
    } catch (error) {
      console.warn(`Failed to play loop ${name}:`, error);
      return null;
    }
  }, [settings.soundEnabled, settings.musicEnabled, settings.soundVolume, settings.musicVolume, getSoundAsset]);

  // Stop a specific loop
  const stopLoop = useCallback(async (name: SoundName) => {
    const sound = activeLoops.current.get(name);
    if (sound) {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {
        console.warn(`Failed to stop loop ${name}:`, error);
      }
      activeLoops.current.delete(name);
    }
  }, []);

  // Stop all loops
  const stopAllLoops = useCallback(async () => {
    const promises = Array.from(activeLoops.current.entries()).map(async ([name, sound]) => {
      try {
        await sound.stopAsync();
        await sound.unloadAsync();
      } catch (error) {
        console.warn(`Failed to stop loop ${name}:`, error);
      }
    });
    
    await Promise.all(promises);
    activeLoops.current.clear();
  }, []);

  // Settings setters
  const setSoundEnabled = useCallback(async (enabled: boolean) => {
    setSettings(prev => ({ ...prev, soundEnabled: enabled }));
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
    
    if (!enabled) {
      // Stop non-music loops
      for (const [name, sound] of activeLoops.current.entries()) {
        if (!name.includes('loop') && !name.includes('amb_')) {
          await sound.stopAsync();
          await sound.unloadAsync();
          activeLoops.current.delete(name);
        }
      }
    }
  }, []);

  const setMusicEnabled = useCallback(async (enabled: boolean) => {
    setSettings(prev => ({ ...prev, musicEnabled: enabled }));
    await AsyncStorage.setItem(MUSIC_ENABLED_KEY, String(enabled));
    
    if (!enabled) {
      // Stop music loops
      for (const [name, sound] of activeLoops.current.entries()) {
        if (name.includes('loop') || name.includes('amb_')) {
          await sound.stopAsync();
          await sound.unloadAsync();
          activeLoops.current.delete(name);
        }
      }
    }
  }, []);

  const setSoundVolume = useCallback(async (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setSettings(prev => ({ ...prev, soundVolume: clampedVolume }));
    await AsyncStorage.setItem(SOUND_VOLUME_KEY, String(clampedVolume));
  }, []);

  const setMusicVolume = useCallback(async (volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    setSettings(prev => ({ ...prev, musicVolume: clampedVolume }));
    await AsyncStorage.setItem(MUSIC_VOLUME_KEY, String(clampedVolume));
    
    // Update volume of active music loops
    for (const [name, sound] of activeLoops.current.entries()) {
      if (name.includes('loop') || name.includes('amb_')) {
        try {
          await sound.setVolumeAsync(clampedVolume);
        } catch (error) {
          console.warn(`Failed to update volume for ${name}:`, error);
        }
      }
    }
  }, []);

  return {
    play,
    playLoop,
    stopLoop,
    stopAllLoops,
    settings,
    setSoundEnabled,
    setMusicEnabled,
    setSoundVolume,
    setMusicVolume,
    isLoading,
  };
}

// Singleton instance for global access
let globalSoundsInstance: UseSoundsReturn | null = null;

export function getGlobalSounds(): UseSoundsReturn | null {
  return globalSoundsInstance;
}

export function setGlobalSounds(instance: UseSoundsReturn) {
  globalSoundsInstance = instance;
}
