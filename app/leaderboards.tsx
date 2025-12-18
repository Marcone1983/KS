import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, FlatList, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';

interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  level: number;
  avatar: string;
  isCurrentUser: boolean;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, username: 'GreenMaster420', score: 125000, level: 45, avatar: '👨‍🌾', isCurrentUser: false },
  { rank: 2, username: 'PlantDefender', score: 98500, level: 38, avatar: '🧑‍🔬', isCurrentUser: false },
  { rank: 3, username: 'BugSlayer99', score: 87200, level: 35, avatar: '🦸', isCurrentUser: false },
  { rank: 4, username: 'CannabisKing', score: 76800, level: 32, avatar: '👑', isCurrentUser: false },
  { rank: 5, username: 'SprayMaster', score: 65400, level: 28, avatar: '🔫', isCurrentUser: false },
  { rank: 6, username: 'Tu', score: 45000, level: 20, avatar: '😎', isCurrentUser: true },
  { rank: 7, username: 'GrowPro', score: 42000, level: 18, avatar: '🌱', isCurrentUser: false },
  { rank: 8, username: 'PestHunter', score: 38500, level: 16, avatar: '🎯', isCurrentUser: false },
  { rank: 9, username: 'LeafGuard', score: 35000, level: 15, avatar: '🛡️', isCurrentUser: false },
  { rank: 10, username: 'BioWarrior', score: 32000, level: 14, avatar: '⚔️', isCurrentUser: false },
];

type LeaderboardType = 'global' | 'weekly' | 'friends';

export default function LeaderboardsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<LeaderboardType>('global');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);

  const getRankColor = (rank: number) => {
    if (rank === 1) return '#fbbf24';
    if (rank === 2) return '#9ca3af';
    if (rank === 3) return '#cd7f32';
    return '#6b7280';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderLeaderboardItem = ({ item }: { item: LeaderboardEntry }) => (
    <View style={[styles.leaderboardRow, item.isCurrentUser && styles.currentUserRow]}>
      <View style={styles.rankContainer}>
        <ThemedText style={[styles.rankText, { color: getRankColor(item.rank) }]}>
          {getRankIcon(item.rank)}
        </ThemedText>
      </View>
      <ThemedText style={styles.avatar}>{item.avatar}</ThemedText>
      <View style={styles.userInfo}>
        <ThemedText style={[styles.username, item.isCurrentUser && styles.currentUsername]}>
          {item.username}
        </ThemedText>
        <ThemedText style={styles.levelText}>Livello {item.level}</ThemedText>
      </View>
      <View style={styles.scoreContainer}>
        <ThemedText style={styles.scoreText}>{item.score.toLocaleString()}</ThemedText>
        <ThemedText style={styles.scoreLabel}>punti</ThemedText>
      </View>
    </View>
  );

  return (
    <LinearGradient
      colors={['#14532d', '#166534', '#059669']}
      style={styles.container}
    >
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) + 20 }]}>
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

        <ThemedText style={styles.title}>Leaderboards</ThemedText>
        <ThemedText style={styles.subtitle}>Competi con i migliori giocatori</ThemedText>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          {(['global', 'weekly', 'friends'] as LeaderboardType[]).map((tab) => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab)}
            >
              <ThemedText style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab === 'global' ? 'Globale' : tab === 'weekly' ? 'Settimanale' : 'Amici'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Leaderboard List */}
        <FlatList
          data={leaderboard}
          renderItem={renderLeaderboardItem}
          keyExtractor={(item) => item.rank.toString()}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) + 100 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  logo: { width: 120, height: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a7f3d0', textAlign: 'center', marginBottom: 24 },
  tabsContainer: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
  activeTab: { backgroundColor: '#22c55e' },
  tabText: { color: '#a7f3d0', fontSize: 14, fontWeight: '600' },
  activeTabText: { color: '#fff' },
  list: { flex: 1 },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 12, marginBottom: 8 },
  currentUserRow: { backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#22c55e' },
  rankContainer: { width: 40, alignItems: 'center' },
  rankText: { fontSize: 20, fontWeight: 'bold' },
  avatar: { fontSize: 32, marginHorizontal: 12 },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: 'bold', color: '#166534' },
  currentUsername: { color: '#15803d' },
  levelText: { fontSize: 12, color: '#6b7280' },
  scoreContainer: { alignItems: 'flex-end' },
  scoreText: { fontSize: 18, fontWeight: 'bold', color: '#166534' },
  scoreLabel: { fontSize: 10, color: '#6b7280' },
});
