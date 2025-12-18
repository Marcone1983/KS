import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GameProgress {
  currentLevel: number;
  totalScore: number;
  highScore: number;
  leafCurrency: number;
  pestsEncountered: string[];
  hasPremium: boolean;
  gamesPlayed: number;
}

function useGameProgress() {
  const [progress, setProgress] = useState<GameProgress>({
    currentLevel: 1,
    totalScore: 0,
    highScore: 0,
    leafCurrency: 0,
    pestsEncountered: [],
    hasPremium: false,
    gamesPlayed: 0,
  });

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      const saved = await AsyncStorage.getItem('gameProgress');
      if (saved) {
        setProgress(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load progress', error);
    }
  };

  return progress;
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useGameProgress();

  const menuItems = [
    { title: 'Gioca Ora', icon: 'play', route: '/(tabs)/game', color: '#22c55e', primary: true },
    { title: 'Dashboard', icon: 'chart', route: '/dashboard', color: '#3b82f6' },
    { title: 'Shop', icon: 'cart', route: '/(tabs)/shop', color: '#a855f7' },
    { title: 'Enciclopedia', icon: 'book', route: '/encyclopedia', color: '#22c55e' },
    { title: 'Ricerca', icon: 'flask', route: '/research', color: '#06b6d4' },
    { title: 'Potenzia', icon: 'arrow', route: '/upgrades', color: '#10b981' },
    { title: 'Crafting', icon: 'hammer', route: '/crafting', color: '#ec4899' },
    { title: 'Breeding', icon: 'sparkle', route: '/breeding', color: '#a855f7' },
    { title: 'Leaderboards', icon: 'trophy', route: '/leaderboards', color: '#eab308' },
    { title: 'Skills', icon: 'star', route: '/skills', color: '#6366f1' },
    { title: 'Customize', icon: 'brush', route: '/customize', color: '#14b8a6' },
    { title: 'Growing Lab', icon: 'leaf', route: '/growing', color: '#10b981' },
    { title: 'Mini Giochi', icon: 'game', route: '/minigames', color: '#f97316' },
    { title: 'Guild', icon: 'users', route: '/guild', color: '#8b5cf6' },
    { title: 'Eventi', icon: 'calendar', route: '/events', color: '#06b6d4' },
    { title: 'Achievements', icon: 'medal', route: '/achievements', color: '#fbbf24' },
    { title: 'Trading', icon: 'exchange', route: '/trading', color: '#ec4899' },
    { title: 'Inventario', icon: 'bag', route: '/inventory', color: '#84cc16' },
    { title: 'Leaderboard', icon: 'ranking', route: '/leaderboard', color: '#ef4444' },
    { title: 'Tutorial', icon: 'help', route: '/tutorial', color: '#64748b' },
    { title: 'Sfide', icon: 'target', route: '/challenges', color: '#f43f5e' },
    { title: 'Statistiche', icon: 'stats', route: '/stats', color: '#06b6d4' },
    { title: 'Boss Arena', icon: 'skull', route: '/boss-arena', color: '#ef4444' },
  ];

  const handleNavigation = (route: string) => {
    router.push(route as any);
  };

  return (
    <LinearGradient
      colors={['#14532d', '#166534', '#059669']}
      style={styles.container}
    >
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText style={styles.subtitle}>
            Difendi la tua pianta dai parassiti con




 Bacillus thuringiensis kurstaki
          </ThemedText>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer
}>
          <View style={styles.statCard}>
            <ThemedText style={styles.statIcon}>🏆</ThemedText>
            <ThemedText style={styles.statLabel}>Livello</ThemedText>
            <ThemedText style={styles.statValue}>{progress.currentLevel}</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statIcon}>🌿</ThemedText>
            <ThemedText style={styles.statLabel}>Leaf Token</ThemedText>
            <ThemedText style={styles.statValue}>{progress.leafCurrency}</ThemedText>
          </View>
          <View style={styles.statCard}>
            <ThemedText style={styles.statIcon}>🛡️</ThemedText>
            <ThemedText style={styles.statLabel}>Partite</ThemedText>
            <ThemedText style={styles.statValue}>{progress.gamesPlayed}</ThemedText>
          </View>
        </View>

        {/* Menu Buttons */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <Pressable
              key={index}
              style={({ pressed }) => [
                styles.menuButton,
                item.primary && styles.primaryButton,
                { borderColor: item.color },
                pressed && styles.menuButtonPressed,
              ]}
              onPress={() => handleNavigation(item.route)}
            >
              <ThemedText style={[styles.menuButtonText, item.primary && styles.primaryButtonText]}>
                {item.title}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 320,
    height: 200,
  },
  subtitle: {
    color: '#a7f3d0',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    maxWidth: 300,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#166534',
  },
  menuContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  menuButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    minWidth: 140,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  menuButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    fontSize: 20,
  },
});
