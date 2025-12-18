import { useRouter } from "expo-router";
import React, { useState, useEffect, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, FlatList, RefreshControl, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { useSounds } from '@/hooks/use-sounds';

const { width } = Dimensions.get('window');

interface Player {
  id: string;
  name: string;
  avatar: string;
  level: number;
  xp: number;
  score: number;
  plantsGrown: number;
  pestsKilled: number;
  rank: number;
  isOnline: boolean;
  lastActive: string;
  gardenId?: string;
}

interface LeaderboardCategory {
  id: string;
  name: string;
  icon: string;
  key: keyof Player;
}

const CATEGORIES: LeaderboardCategory[] = [
  { id: 'score', name: 'Punteggio', icon: '🏆', key: 'score' },
  { id: 'level', name: 'Livello', icon: '⭐', key: 'level' },
  { id: 'plants', name: 'Piante', icon: '🌿', key: 'plantsGrown' },
  { id: 'pests', name: 'Parassiti', icon: '🐛', key: 'pestsKilled' },
];

const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];
const RANK_ICONS = ['🥇', '🥈', '🥉'];

// 3D Trophy Component
function Trophy3D({ rank }: { rank: number }) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const color = RANK_COLORS[rank - 1] || '#9ca3af';
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <group>
      {/* Base */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.35, 0.15, 16]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Stem */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.4, 16]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Cup */}
      <mesh ref={meshRef} position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.25, 0.15, 0.5, 16]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Handles */}
      <mesh position={[0.3, 0.25, 0]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.1, 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.3, 0.25, 0]} rotation={[0, Math.PI, Math.PI / 2]}>
        <torusGeometry args={[0.1, 0.03, 8, 16, Math.PI]} />
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

// Player Card Component
function PlayerCard({ 
  player, 
  currentUserId,
  onViewGarden,
  onChallenge,
}: { 
  player: Player;
  currentUserId: string;
  onViewGarden: () => void;
  onChallenge: () => void;
}) {
  const isCurrentUser = player.id === currentUserId;
  const isTopThree = player.rank <= 3;
  
  return (
    <View style={[
      styles.playerCard,
      isCurrentUser && styles.playerCardCurrent,
      isTopThree && { borderColor: RANK_COLORS[player.rank - 1] },
    ]}>
      {/* Rank */}
      <View style={[styles.rankBadge, { backgroundColor: isTopThree ? RANK_COLORS[player.rank - 1] : '#374151' }]}>
        <ThemedText style={styles.rankText}>
          {isTopThree ? RANK_ICONS[player.rank - 1] : `#${player.rank}`}
        </ThemedText>
      </View>
      
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <ThemedText style={styles.avatar}>{player.avatar}</ThemedText>
        {player.isOnline && <View style={styles.onlineIndicator} />}
      </View>
      
      {/* Info */}
      <View style={styles.playerInfo}>
        <ThemedText style={styles.playerName}>
          {player.name} {isCurrentUser && '(Tu)'}
        </ThemedText>
        <ThemedText style={styles.playerStats}>
          Lv.{player.level} • {player.score.toLocaleString()} pts
        </ThemedText>
      </View>
      
      {/* Actions */}
      {!isCurrentUser && (
        <View style={styles.playerActions}>
          {player.gardenId && (
            <Pressable style={styles.actionButton} onPress={onViewGarden}>
              <ThemedText style={styles.actionIcon}>🏡</ThemedText>
            </Pressable>
          )}
          <Pressable style={[styles.actionButton, styles.challengeButton]} onPress={onChallenge}>
            <ThemedText style={styles.actionIcon}>⚔️</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// Mock data generator
const generateMockPlayers = (count: number): Player[] => {
  const names = ['GreenThumb', 'PlantMaster', 'BugSlayer', 'GardenKing', 'LeafLover', 'SproutNinja', 'HerbHero', 'FloraFan', 'BotanyBoss', 'CropChamp'];
  const avatars = ['👨‍🌾', '👩‍🌾', '🧑‍🌾', '🌱', '🌿', '🌳', '🌴', '🌵', '🌻', '🌺'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `player_${i}`,
    name: `${names[i % names.length]}${Math.floor(i / names.length) || ''}`,
    avatar: avatars[i % avatars.length],
    level: Math.max(1, 50 - i * 2 + Math.floor(Math.random() * 5)),
    xp: Math.floor(Math.random() * 10000),
    score: Math.max(0, 100000 - i * 5000 + Math.floor(Math.random() * 2000)),
    plantsGrown: Math.max(0, 500 - i * 20 + Math.floor(Math.random() * 50)),
    pestsKilled: Math.max(0, 10000 - i * 500 + Math.floor(Math.random() * 200)),
    rank: i + 1,
    isOnline: Math.random() > 0.7,
    lastActive: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
    gardenId: Math.random() > 0.3 ? `garden_${i}` : undefined,
  }));
};

export default function LeaderboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<LeaderboardCategory>(CATEGORIES[0]);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTopThree, setShowTopThree] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [selectedCategory]);

  const loadLeaderboard = async () => {
    // Simulate API call
    const mockPlayers = generateMockPlayers(50);
    
    // Sort by selected category
    const sorted = [...mockPlayers].sort((a, b) => {
      const aVal = a[selectedCategory.key] as number;
      const bVal = b[selectedCategory.key] as number;
      return bVal - aVal;
    }).map((p, i) => ({ ...p, rank: i + 1 }));
    
    setPlayers(sorted);
    
    // Set current user (mock - in real app would come from auth)
    const userStats = await AsyncStorage.getItem('userStats');
    if (userStats) {
      const stats = JSON.parse(userStats);
      const userPlayer: Player = {
        id: 'current_user',
        name: 'Tu',
        avatar: '🧑‍🌾',
        level: stats.level || 1,
        xp: stats.xp || 0,
        score: stats.score || 0,
        plantsGrown: stats.plantsGrown || 0,
        pestsKilled: stats.pestsKilled || 0,
        rank: 0,
        isOnline: true,
        lastActive: new Date().toISOString(),
        gardenId: 'my_garden',
      };
      
      // Find user's rank
      const userRank = sorted.findIndex(p => (p[selectedCategory.key] as number) < (userPlayer[selectedCategory.key] as number)) + 1;
      userPlayer.rank = userRank || sorted.length + 1;
      
      setCurrentUser(userPlayer);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    play('ui_success');
    await loadLeaderboard();
    setIsRefreshing(false);
  };

  const handleViewGarden = (player: Player) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    play('ui_open');
    Alert.alert(
      'Visita Garden',
      `Vuoi visitare il garden di ${player.name}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Visita', onPress: () => {
          // In real app, navigate to garden view
          Alert.alert('Garden', `Stai visitando il garden di ${player.name}!`);
        }},
      ]
    );
  };

  const handleChallenge = (player: Player) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    play('challenge_start');
    Alert.alert(
      'Sfida',
      `Vuoi sfidare ${player.name}?`,
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Sfida!', onPress: () => {
          Alert.alert('Sfida Inviata!', `Hai sfidato ${player.name}! Attendi la risposta.`);
        }},
      ]
    );
  };

  const handleShare = async () => {
    if (!currentUser) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    play('ui_success');
    
    try {
      await Share.share({
        message: `🏆 Sono al #${currentUser.rank} nella classifica di Kurstaki Strike!\n\n📊 Punteggio: ${currentUser.score.toLocaleString()}\n🌿 Piante: ${currentUser.plantsGrown}\n🐛 Parassiti: ${currentUser.pestsKilled}\n\nScarica l'app e sfidami!`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const topThree = players.slice(0, 3);
  const restPlayers = players.slice(3);

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <Pressable onPress={handleShare} style={styles.shareButton}>
            <ThemedText style={styles.shareIcon}>📤</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.title}>Classifica Globale</ThemedText>

        {/* 3D Trophy */}
        <View style={styles.trophy3D}>
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, 3, -5]} intensity={0.5} color="#ffd700" />
            <PerspectiveCamera makeDefault position={[0, 0, 2]} />
            <Suspense fallback={null}>
              <Trophy3D rank={1} />
            </Suspense>
          </Canvas>
        </View>

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory.id === cat.id && styles.categoryButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                play('ui_tab_switch');
                setSelectedCategory(cat);
              }}
            >
              <ThemedText style={styles.categoryIcon}>{cat.icon}</ThemedText>
              <ThemedText style={[
                styles.categoryText,
                selectedCategory.id === cat.id && styles.categoryTextActive,
              ]}>
                {cat.name}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Current User Rank */}
        {currentUser && (
          <View style={styles.currentUserCard}>
            <ThemedText style={styles.currentUserLabel}>La tua posizione</ThemedText>
            <PlayerCard
              player={currentUser}
              currentUserId="current_user"
              onViewGarden={() => {}}
              onChallenge={() => {}}
            />
          </View>
        )}

        {/* Top 3 Podium */}
        {showTopThree && topThree.length === 3 && (
          <View style={styles.podium}>
            {/* 2nd Place */}
            <View style={styles.podiumSpot}>
              <ThemedText style={styles.podiumAvatar}>{topThree[1].avatar}</ThemedText>
              <ThemedText style={styles.podiumName}>{topThree[1].name}</ThemedText>
              <View style={[styles.podiumBar, styles.podiumBar2]}>
                <ThemedText style={styles.podiumRank}>🥈</ThemedText>
              </View>
            </View>
            
            {/* 1st Place */}
            <View style={styles.podiumSpot}>
              <ThemedText style={styles.podiumAvatar}>{topThree[0].avatar}</ThemedText>
              <ThemedText style={styles.podiumName}>{topThree[0].name}</ThemedText>
              <View style={[styles.podiumBar, styles.podiumBar1]}>
                <ThemedText style={styles.podiumRank}>🥇</ThemedText>
              </View>
            </View>
            
            {/* 3rd Place */}
            <View style={styles.podiumSpot}>
              <ThemedText style={styles.podiumAvatar}>{topThree[2].avatar}</ThemedText>
              <ThemedText style={styles.podiumName}>{topThree[2].name}</ThemedText>
              <View style={[styles.podiumBar, styles.podiumBar3]}>
                <ThemedText style={styles.podiumRank}>🥉</ThemedText>
              </View>
            </View>
          </View>
        )}

        {/* Leaderboard List */}
        <FlatList
          data={restPlayers}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PlayerCard
              player={item}
              currentUserId="current_user"
              onViewGarden={() => handleViewGarden(item)}
              onChallenge={() => handleChallenge(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#22c55e"
            />
          }
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  shareButton: {
    padding: 8,
  },
  shareIcon: {
    fontSize: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  trophy3D: {
    height: 120,
    marginBottom: 8,
  },
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: 12,
  },
  categoriesContent: {
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#ffd700',
    fontWeight: 'bold',
  },
  currentUserCard: {
    marginBottom: 12,
  },
  currentUserLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
    marginLeft: 8,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginBottom: 16,
    height: 120,
  },
  podiumSpot: {
    alignItems: 'center',
    width: (width - 64) / 3,
  },
  podiumAvatar: {
    fontSize: 32,
    marginBottom: 4,
  },
  podiumName: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  podiumBar: {
    width: '80%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  podiumBar1: {
    height: 80,
    backgroundColor: '#ffd700',
  },
  podiumBar2: {
    height: 60,
    backgroundColor: '#c0c0c0',
  },
  podiumBar3: {
    height: 40,
    backgroundColor: '#cd7f32',
  },
  podiumRank: {
    fontSize: 24,
  },
  listContent: {
    paddingBottom: 100,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  playerCardCurrent: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: '#22c55e',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    fontSize: 32,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerStats: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  playerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
  },
  actionIcon: {
    fontSize: 18,
  },
});
