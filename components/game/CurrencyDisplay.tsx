// @ts-nocheck
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';

// Assumendo che questi componenti esistano e applichino lo stile del tema.
// Se non esistono, possono essere sostituiti con i componenti standard di React Native.
// const ThemedText = Text;
// const ThemedView = View;

// Placeholder per IconSymbol, dato che non è definito
const IconSymbol = ({ name, style }) => <Text style={style}>{name === 'leaf' ? '🌿' : '?'}</Text>;

const themeColors = {
  primaryGreen: '#2D7D46',
  gold: '#FFD700',
  darkBackground: '#1A1A2E',
};

const spacing = {
  sm: 8,
  md: 16,
};

const borderRadius = {
  md: 12,
};

interface CurrencyDisplayProps {
  value: number;
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ value }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animazione
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();

      prevValue.current = value;
    }
  }, [value, scaleAnim]);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <View style={styles.innerContainer}>
          <IconSymbol name="leaf" style={styles.icon} />
          <Text style={styles.text}>{Math.floor(value)} GLeaf</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.sm,
    backgroundColor: themeColors.darkBackground,
    borderRadius: borderRadius.md,
    alignSelf: 'flex-start',
  },
  innerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    color: themeColors.primaryGreen,
    fontSize: 20,
    marginRight: spacing.sm,
  },
  text: {
    color: themeColors.gold,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CurrencyDisplay;
