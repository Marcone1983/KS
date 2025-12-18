// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const theme = {
  colors: {
    primaryGreen: '#2D7D46',
    gold: '#FFD700',
    darkBackground: '#1A1A2E',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
  },
};

export type PowerUp = {
  id: string;
  name: string;
  iconName: string; // Nome dell'icona da IconSymbol
  duration: number; // Durata in secondi
  collectedAt: number; // Timestamp di quando è stato raccolto
};

type PowerUpItemProps = {
  powerUp: PowerUp;
};

const PowerUpItem: React.FC<PowerUpItemProps> = ({ powerUp }) => {
  // Nota: La persistenza dello stato del power-up (incluso `collectedAt`)
  // dovrebbe essere gestita in un componente genitore o in uno store globale.
  // Esempio di salvataggio:
  // const savePowerUp = async (powerUp: PowerUp) => {
  //   try {
  //     await AsyncStorage.setItem(`@powerup_${powerUp.id}`, JSON.stringify(powerUp));
  //   } catch (e) {
  //     // saving error
  //   }
  // };
  // Esempio di caricamento:
  // const getPowerUp = async (id: string) => {
  //   try {
  //     const jsonValue = await AsyncStorage.getItem(`@powerup_${id}`);
  //     return jsonValue != null ? JSON.parse(jsonValue) : null;
  //   } catch(e) {
  //     // error reading value
  //   }
  // };
    const [remainingTime, setRemainingTime] = useState(0);

  useEffect(() => {
    const calculateRemainingTime = () => {
      const now = Date.now() / 1000;
      const endTime = powerUp.collectedAt + powerUp.duration;
      const timeLeft = Math.max(0, endTime - now);
      setRemainingTime(timeLeft);
      return timeLeft;
    };

    if (calculateRemainingTime() > 0) {
      const interval = setInterval(() => {
        if (calculateRemainingTime() <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [powerUp]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (remainingTime <= 0) {
    return null; // O un componente placeholder per quando è scaduto
  }

    const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Aggiungere qui eventuali azioni on-press, come mostrare dettagli del power-up
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <ThemedView style={styles.container}>
      <IconSymbol name={powerUp.iconName} size={40} color={theme.colors.gold} />
      <ThemedText style={styles.timerText}>{formatTime(remainingTime)}</ThemedText>
          </ThemedView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.darkBackground,
    borderRadius: theme.borderRadius.md,
    borderColor: theme.colors.gold,
    borderWidth: 1,
    width: 80,
    height: 80,
  },
  timerText: {
    color: theme.colors.gold,
    fontWeight: 'bold',
    marginTop: theme.spacing.xs,
  },
});

export default PowerUpItem;
