import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PlayerStats {
  totalGames: number;
  totalScore: number;
  highScore: number;
  pestsEliminated: number;
  plantsProtected: number;
  currentLevel: number;
  leafTokens: number;
  playTime: number;
  achievements: string[];
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<PlayerStats>({
    totalGames: 0,
    totalScore: 0,
    highScore: 0,
    pestsEliminated: 0,
    plantsProtected: 0,
    currentLevel: 1,
    leafTokens: 0,
    playTime: 0,
    achievements: [],
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const saved = await AsyncStorage.getItem('playerStats');
      if (saved) {
        setStats(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  };

  const statCards = [
    { label: 'Partite Totali', value: stats.totalGames, icon: '🎮' },
    { label: 'Punteggio Totale', value: stats.totalScore, icon: '⭐' },
    { label: 'Record', value: stats.highScore, icon: '🏆' },
    { label: 'Parassiti Eliminati', value: stats.pestsEliminated, icon: '🐛' },
    { label: 'Piante Protette', value: stats.plantsProtected, icon: '🌿' },
    { label: 'Livello Attuale', value: stats.currentLevel, icon: '📈' },
    { label: 'Leaf Token', value: stats.leafTokens, icon: '🍃' },
    { label: 'Tempo di Gioco', value: `${Math.floor(stats.playTime / 60)}h`, icon: '⏱️' },
  ];

  return (
    <LinearGradient
      colors={['#14532d', '#166534', '#059669']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <ThemedText style={styles.title}>Dashboard</ThemedText>
        <ThemedText style={styles.subtitle}>Le tue statistiche di gioco</ThemedText>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <ThemedText style={styles.statIcon}>{stat.icon}</ThemedText>
              <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
              <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
            </View>
          ))}
        </View>

        {/* Achievements Section */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Achievements Recenti</ThemedText>
          {stats.achievements.length > 0 ? (
            stats.achievements.slice(0, 5).map((achievement, index) => (
              <View key={index} style={styles.achievementCard}>
                <ThemedText style={styles.achievementIcon}>🏅</ThemedText>
                <ThemedText style={styles.achievementText}>{achievement}</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={styles.emptyText}>Nessun achievement ancora. Gioca per sbloccarli!</ThemedText>
          )}
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
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#a7f3d0',
    fontSize: 16,
  },
  logo: {
    width: 120,
    height: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a7f3d0',
    textAlign: 'center',
    marginBottom: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#166534',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  achievementText: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  emptyText: {
    color: '#a7f3d0',
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
