import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';

interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  type: 'daily' | 'weekly' | 'special';
  progress: number;
  target: number;
  reward: { type: string; amount: number; icon: string };
  completed: boolean;
  expiresIn?: string;
}

const CHALLENGES: Challenge[] = [
  { id: '1', title: 'Cacciatore di Parassiti', description: 'Elimina 50 parassiti', icon: '🐛', type: 'daily', progress: 32, target: 50, reward: { type: 'coins', amount: 100, icon: '🪙' }, completed: false, expiresIn: '12h' },
  { id: '2', title: 'Protettore Verde', description: 'Completa 3 livelli senza perdere salute', icon: '🛡️', type: 'daily', progress: 1, target: 3, reward: { type: 'gems', amount: 10, icon: '💎' }, completed: false, expiresIn: '12h' },
  { id: '3', title: 'Spray Master', description: 'Usa 500 spray', icon: '💧', type: 'daily', progress: 500, target: 500, reward: { type: 'xp', amount: 500, icon: '⭐' }, completed: true, expiresIn: '12h' },
  { id: '4', title: 'Maratona Verde', description: 'Gioca per 2 ore totali', icon: '⏱️', type: 'weekly', progress: 85, target: 120, reward: { type: 'coins', amount: 500, icon: '🪙' }, completed: false, expiresIn: '5d' },
  { id: '5', title: 'Boss Slayer', description: 'Sconfiggi 5 boss', icon: '👹', type: 'weekly', progress: 3, target: 5, reward: { type: 'gems', amount: 50, icon: '💎' }, completed: false, expiresIn: '5d' },
  { id: '6', title: 'Evento Speciale', description: 'Completa la missione speciale di Natale', icon: '🎄', type: 'special', progress: 0, target: 1, reward: { type: 'skin', amount: 1, icon: '🎁' }, completed: false, expiresIn: '7d' },
];

const TYPE_COLORS = {
  daily: '#22c55e',
  weekly: '#3b82f6',
  special: '#f59e0b',
};

export default function ChallengesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [challenges, setChallenges] = useState<Challenge[]>(CHALLENGES);
  const [activeFilter, setActiveFilter] = useState<'all' | 'daily' | 'weekly' | 'special'>('all');

  const filteredChallenges = activeFilter === 'all' 
    ? challenges 
    : challenges.filter(c => c.type === activeFilter);

  const claimReward = async (challengeId: string) => {
    setChallenges(prev => prev.map(c => 
      c.id === challengeId ? { ...c, completed: true } : c
    ));
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

        <ThemedText style={styles.title}>Sfide</ThemedText>
        <ThemedText style={styles.subtitle}>Completa le sfide per ottenere ricompense</ThemedText>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          {(['all', 'daily', 'weekly', 'special'] as const).map((filter) => (
            <Pressable
              key={filter}
              style={[styles.filterTab, activeFilter === filter && styles.activeFilterTab]}
              onPress={() => setActiveFilter(filter)}
            >
              <ThemedText style={[styles.filterText, activeFilter === filter && styles.activeFilterText]}>
                {filter === 'all' ? 'Tutte' : filter === 'daily' ? 'Giornaliere' : filter === 'weekly' ? 'Settimanali' : 'Speciali'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Challenges List */}
        <View style={styles.challengesList}>
          {filteredChallenges.map((challenge) => (
            <View key={challenge.id} style={[styles.challengeCard, challenge.completed && styles.completedCard]}>
              <View style={styles.challengeHeader}>
                <ThemedText style={styles.challengeIcon}>{challenge.icon}</ThemedText>
                <View style={styles.challengeInfo}>
                  <View style={styles.titleRow}>
                    <ThemedText style={styles.challengeTitle}>{challenge.title}</ThemedText>
                    <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[challenge.type] }]}>
                      <ThemedText style={styles.typeText}>{challenge.type.toUpperCase()}</ThemedText>
                    </View>
                  </View>
                  <ThemedText style={styles.challengeDesc}>{challenge.description}</ThemedText>
                  {challenge.expiresIn && (
                    <ThemedText style={styles.expiresText}>Scade tra: {challenge.expiresIn}</ThemedText>
                  )}
                </View>
              </View>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${Math.min((challenge.progress / challenge.target) * 100, 100)}%` }]} />
                </View>
                <ThemedText style={styles.progressText}>
                  {challenge.progress}/{challenge.target}
                </ThemedText>
              </View>

              {/* Reward */}
              <View style={styles.rewardRow}>
                <View style={styles.rewardInfo}>
                  <ThemedText style={styles.rewardIcon}>{challenge.reward.icon}</ThemedText>
                  <ThemedText style={styles.rewardText}>+{challenge.reward.amount}</ThemedText>
                </View>
                {challenge.progress >= challenge.target && !challenge.completed ? (
                  <Pressable style={styles.claimButton} onPress={() => claimReward(challenge.id)}>
                    <ThemedText style={styles.claimButtonText}>Riscuoti</ThemedText>
                  </Pressable>
                ) : challenge.completed ? (
                  <ThemedText style={styles.claimedText}>✓ Riscosso</ThemedText>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  logo: { width: 120, height: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a7f3d0', textAlign: 'center', marginBottom: 24 },
  filterContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 4, marginBottom: 20 },
  filterTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  activeFilterTab: { backgroundColor: '#22c55e' },
  filterText: { color: '#a7f3d0', fontSize: 12, fontWeight: '600' },
  activeFilterText: { color: '#fff' },
  challengesList: { gap: 12 },
  challengeCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16 },
  completedCard: { opacity: 0.7 },
  challengeHeader: { flexDirection: 'row', marginBottom: 12 },
  challengeIcon: { fontSize: 40, marginRight: 12 },
  challengeInfo: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  challengeTitle: { fontSize: 16, fontWeight: 'bold', color: '#166534', flex: 1 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  challengeDesc: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  expiresText: { fontSize: 10, color: '#f59e0b', marginTop: 4 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  progressBar: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginRight: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 4 },
  progressText: { fontSize: 12, color: '#6b7280', fontWeight: 'bold' },
  rewardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  rewardInfo: { flexDirection: 'row', alignItems: 'center' },
  rewardIcon: { fontSize: 20, marginRight: 4 },
  rewardText: { fontSize: 16, fontWeight: 'bold', color: '#166534' },
  claimButton: { backgroundColor: '#22c55e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  claimButtonText: { color: '#fff', fontWeight: 'bold' },
  claimedText: { color: '#22c55e', fontWeight: 'bold' },
});
