// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Image, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Importazioni dal tema e componenti personalizzati (ipotizzando che esistano)
// Dato che non ho accesso a questi file, userò stili inline e componenti base.
// import { ThemedText } from '@/components/themed-text';
// import { ThemedView } from '@/components/themed-view';
// import { IconSymbol } from '@/components/ui/icon-symbol';

// --- Mock dei componenti importati per la dimostrazione ---
const ThemedView = ({ style, ...props }) => <View style={[styles.darkBackground, style]} {...props} />;
const ThemedText = ({ style, ...props }) => <Text style={[{ color: '#FFFFFF' }, style]} {...props} />;
const IconSymbol = ({ name, size }) => {
    const icons: Record<string, string> = {
        'plant-lush': '🌱',
        'plant-wilted': '🥀',
        'plant-dying': '💀',
    };
    return <ThemedText style={{ fontSize: size }}>{icons[name] || ''}</ThemedText>;
};
// --- Fine Mock ---

// Definizioni del tema
const themeColors = {
  primaryGreen: '#2D7D46',
  gold: '#FFD700',
  darkBackground: '#1A1A2E',
};

const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
};

type PlantHealth = 'lush' | 'wilted' | 'dying';

interface PlantVisualProps {
  initialHealth?: PlantHealth;
}

const PLANT_HEALTH_KEY = 'plant_health';

export default function PlantVisual({ initialHealth = 'lush' }: PlantVisualProps) {
  const [health, setHealth] = useState<PlantHealth>(initialHealth);

  useEffect(() => {
    const loadHealth = async () => {
      try {
        const savedHealth = await AsyncStorage.getItem(PLANT_HEALTH_KEY) as PlantHealth | null;
        if (savedHealth) {
          setHealth(savedHealth);
        }
      } catch (error) {
        console.error('Failed to load plant health from storage', error);
      }
    };
    loadHealth();
  }, []);

  const saveHealth = async (newHealth: PlantHealth) => {
    try {
      await AsyncStorage.setItem(PLANT_HEALTH_KEY, newHealth);
    } catch (error) {
      console.error('Failed to save plant health to storage', error);
    }
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const nextHealth: PlantHealth = health === 'lush' ? 'wilted' : health === 'wilted' ? 'dying' : 'lush';
    setHealth(nextHealth);
    saveHealth(nextHealth);
  };

  const getPlantIcon = () => {
    switch (health) {
      case 'lush':
        return 'plant-lush';
      case 'wilted':
        return 'plant-wilted';
      case 'dying':
        return 'plant-dying';
      default:
        return 'plant-lush';
    }
  };

  const getStatusColor = () => {
    switch (health) {
      case 'lush':
        return themeColors.primaryGreen;
      case 'wilted':
        return themeColors.gold;
      case 'dying':
        return '#A9A9A9'; // Grigio scuro per morente
      default:
        return themeColors.primaryGreen;
    }
  };

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity onPress={handlePress} style={styles.touchableContainer}>
        <View style={[styles.plantContainer, { borderColor: getStatusColor() }]}>
            <IconSymbol name={getPlantIcon()} size={120} />
        </View>
        <View style={styles.statusBadge}>
            <ThemedText style={styles.statusText}>{health.charAt(0).toUpperCase() + health.slice(1)}</ThemedText>
        </View>
      </TouchableOpacity>
       <ThemedText style={styles.infoText}>Tocca la pianta per cambiarne lo stato.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  darkBackground: {
      backgroundColor: themeColors.darkBackground,
  },
  touchableContainer: {
      alignItems: 'center',
  },
  plantContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2A2A3E', // Un po' più chiaro dello sfondo
    borderRadius: BorderRadius.lg,
    borderWidth: 4,
    marginBottom: Spacing.md,
  },
  statusBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: themeColors.primaryGreen,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  infoText: {
      marginTop: Spacing.md,
      color: '#A9A9A9',
      fontStyle: 'italic',
  }
});
