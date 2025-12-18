/**
 * Hook per gestire i suoni ambient con ciclo giorno/notte automatico
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSounds } from './use-sounds';

type TimeOfDay = 'day' | 'night';

function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  // Day: 6:00 - 20:00, Night: 20:00 - 6:00
  return (hour >= 6 && hour < 20) ? 'day' : 'night';
}

interface UseAmbientSoundOptions {
  enabled?: boolean;
  autoStart?: boolean;
}

export function useAmbientSound(options: UseAmbientSoundOptions = {}) {
  const { enabled = true, autoStart = true } = options;
  const { playLoop, stopLoop, settings } = useSounds();
  
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Check time of day every minute
  useEffect(() => {
    if (!enabled) return;

    const checkTime = () => {
      const newTimeOfDay = getTimeOfDay();
      if (newTimeOfDay !== timeOfDay) {
        setTimeOfDay(newTimeOfDay);
      }
    };

    intervalRef.current = setInterval(checkTime, 60000); // Check every minute

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, timeOfDay]);

  // Handle app state changes (pause when backgrounded)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appStateRef.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        // App going to background - stop ambient
        stopAmbient();
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground - restart ambient if was playing
        if (isPlaying && enabled && settings.musicEnabled) {
          startAmbient();
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isPlaying, enabled, settings.musicEnabled]);

  // Start/stop ambient based on time of day
  useEffect(() => {
    if (!enabled || !settings.musicEnabled || !autoStart) return;

    const switchAmbient = async () => {
      // Stop current ambient
      await stopLoop('amb_day_loop');
      await stopLoop('amb_night_loop');

      // Start new ambient based on time
      if (timeOfDay === 'day') {
        await playLoop('amb_day_loop');
      } else {
        await playLoop('amb_night_loop');
      }
      setIsPlaying(true);
    };

    if (isPlaying || autoStart) {
      switchAmbient();
    }

    return () => {
      stopLoop('amb_day_loop');
      stopLoop('amb_night_loop');
    };
  }, [timeOfDay, enabled, settings.musicEnabled]);

  const startAmbient = async () => {
    if (!enabled || !settings.musicEnabled) return;
    
    if (timeOfDay === 'day') {
      await playLoop('amb_day_loop');
    } else {
      await playLoop('amb_night_loop');
    }
    setIsPlaying(true);
  };

  const stopAmbient = async () => {
    await stopLoop('amb_day_loop');
    await stopLoop('amb_night_loop');
    setIsPlaying(false);
  };

  const playWindGust = () => {
    if (enabled && settings.soundEnabled) {
      const { play } = useSounds();
      play('wind_gust');
    }
  };

  const playLeavesRustle = () => {
    if (enabled && settings.soundEnabled) {
      const { play } = useSounds();
      play('leaves_rustle');
    }
  };

  return {
    timeOfDay,
    isPlaying,
    startAmbient,
    stopAmbient,
    playWindGust,
    playLeavesRustle,
  };
}

export default useAmbientSound;
