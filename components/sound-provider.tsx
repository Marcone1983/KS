/**
 * SoundProvider - Inizializza il sistema audio globalmente
 */

import React, { createContext, useContext, useEffect } from 'react';
import { useSounds, setGlobalSounds } from '@/hooks/use-sounds';

type SoundContextType = ReturnType<typeof useSounds>;

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const sounds = useSounds();

  // Set global instance for non-React access
  useEffect(() => {
    setGlobalSounds(sounds);
  }, [sounds]);

  return (
    <SoundContext.Provider value={sounds}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundContext() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error('useSoundContext must be used within a SoundProvider');
  }
  return context;
}

export default SoundProvider;
