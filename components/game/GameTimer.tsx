// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

// --- Theme (come da requisiti) ---
const Colors = {
  primaryGreen: '#2D7D46',
  gold: '#FFD700',
  darkBackground: '#1A1A2E',
};

const Spacing = {
  md: 16,
};

const BorderRadius = {
  md: 12,
};

const STORAGE_KEY = '@gameTimer_elapsedTime';

/**
 * Formatta i secondi totali in una stringa MM:SS.
 * @param totalSeconds - Il numero totale di secondi.
 * @returns Il tempo formattato come stringa.
 */
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');
  return `${paddedMinutes}:${paddedSeconds}`;
};

/**
 * Un componente che mostra il tempo di gioco trascorso, con persistenza locale.
 */
const GameTimer = () => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Carica il tempo salvato all'avvio e imposta l'intervallo
  useEffect(() => {
    const loadTime = async () => {
      try {
        const savedTime = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedTime !== null) {
          setElapsedTime(parseInt(savedTime, 10));
        }
      } catch (error) {
        console.error('Failed to load time from storage', error);
      }
    };

    loadTime();

    intervalRef.current = setInterval(() => {
      setElapsedTime(prevTime => prevTime + 1);
    }, 1000);

    // Feedback aptico all'avvio del timer
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Salva il tempo trascorso in AsyncStorage ogni 5 secondi
  useEffect(() => {
    const saveTime = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, String(elapsedTime));
      } catch (error) {
        console.error('Failed to save time to storage', error);
      }
    };

    if (elapsedTime > 0 && elapsedTime % 5 === 0) {
        saveTime();
    }
  }, [elapsedTime]);

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.timerText}>
        {formatTime(elapsedTime)}
      </ThemedText>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.darkBackground,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryGreen,
  },
  timerText: {
    color: Colors.gold,
    fontSize: 48,
    fontWeight: 'bold',
    fontFamily: 'monospace', // Monospace per un allineamento stabile dei numeri
  },
});

export default GameTimer;
