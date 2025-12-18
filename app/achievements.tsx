import { useRouter } from "expo-router";
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { useSounds } from '@/hooks/use-sounds';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'combat' | 'farming' | 'social' | 'collection' | 'mastery';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: number;
  progress: number;
  unlocked: boolean;
  unlockedAt?: string;
  xpReward: number;
  coinReward: number;
}

interface AchievementCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const CATEGORIES: AchievementCategory[] = [
  { id: 'all', name: 'Tutti', icon: '🏆', color: '#ffd700' },
  { id: 'combat', name: 'Combattimento', icon: '⚔️', color: '#ef4444' },
  { id: 'farming', name: 'Coltivazione', icon: '🌱', color: '#22c55e' },
  { id: 'social', name: 'Social', icon: '👥', color: '#3b82f6' },
  { id: 'collection', name: 'Collezione', icon: '📦', color: '#a855f7' },
  { id: 'mastery', name: 'Maestria', icon: '⭐', color: '#f59e0b' },
];

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const ACHIEVEMENTS_DATA: Omit<Achievement, 'progress' | 'unlocked' | 'unlockedAt'>[] = [
  // Combat
  { id: 'pest_slayer_1', name: 'Cacciatore di Parassiti', description: 'Elimina 100 parassiti', icon: '🐛', category: 'combat', rarity: 'common', requirement: 100, xpReward: 50, coinReward: 100 },
  { id: 'pest_slayer_2', name: 'Sterminatore', description: 'Elimina 1000 parassiti', icon: '💀', category: 'combat', rarity: 'rare', requirement: 1000, xpReward: 200, coinReward: 500 },
  { id: 'pest_slayer_3', name: 'Leggenda della Difesa', description: 'Elimina 10000 parassiti', icon: '🏅', category: 'combat', rarity: 'legendary', requirement: 10000, xpReward: 1000, coinReward: 5000 },
  { id: 'boss_hunter', name: 'Cacciatore di Boss', description: 'Sconfiggi 10 boss', icon: '👹', category: 'combat', rarity: 'epic', requirement: 10, xpReward: 500, coinReward: 1000 },
  { id: 'perfect_wave', name: 'Onda Perfetta', description: 'Completa 5 ondate senza danni', icon: '🛡️', category: 'combat', rarity: 'rare', requirement: 5, xpReward: 150, coinReward: 300 },
  
  // Farming
  { id: 'green_thumb_1', name: 'Pollice Verde', description: 'Coltiva 10 piante', icon: '🌿', category: 'farming', rarity: 'common', requirement: 10, xpReward: 30, coinReward: 50 },
  { id: 'green_thumb_2', name: 'Giardiniere Esperto', description: 'Coltiva 100 piante', icon: '🌳', category: 'farming', rarity: 'rare', requirement: 100, xpReward: 200, coinReward: 400 },
  { id: 'green_thumb_3', name: 'Maestro Botanico', description: 'Coltiva 500 piante', icon: '🏡', category: 'farming', rarity: 'epic', requirement: 500, xpReward: 500, coinReward: 2000 },
  { id: 'breeder', name: 'Genetista', description: 'Crea 20 ibridi unici', icon: '🧬', category: 'farming', rarity: 'epic', requirement: 20, xpReward: 400, coinReward: 800 },
  { id: 'perfect_harvest', name: 'Raccolto Perfetto', description: 'Ottieni 50 raccolti di qualità massima', icon: '✨', category: 'farming', rarity: 'rare', requirement: 50, xpReward: 250, coinReward: 500 },
  
  // Social
  { id: 'friendly', name: 'Amichevole', description: 'Visita 10 garden di altri giocatori', icon: '👋', category: 'social', rarity: 'common', requirement: 10, xpReward: 30, coinReward: 50 },
  { id: 'popular', name: 'Popolare', description: 'Ricevi 50 visite al tuo garden', icon: '🌟', category: 'social', rarity: 'rare', requirement: 50, xpReward: 150, coinReward: 300 },
  { id: 'challenger', name: 'Sfidante', description: 'Vinci 25 sfide PvP', icon: '🏆', category: 'social', rarity: 'epic', requirement: 25, xpReward: 400, coinReward: 1000 },
  { id: 'helper', name: 'Aiutante', description: 'Aiuta 10 giocatori', icon: '🤝', category: 'social', rarity: 'rare', requirement: 10, xpReward: 100, coinReward: 200 },
  
  // Collection
  { id: 'collector_1', name: 'Collezionista', description: 'Raccogli 25 oggetti unici', icon: '📦', category: 'collection', rarity: 'common', requirement: 25, xpReward: 50, coinReward: 100 },
  { id: 'collector_2', name: 'Accumulatore', description: 'Raccogli 100 oggetti unici', icon: '🗃️', category: 'collection', rarity: 'rare', requirement: 100, xpReward: 200, coinReward: 500 },
  { id: 'rare_finder', name: 'Cercatore di Rarità', description: 'Ottieni 10 oggetti epici', icon: '💎', category: 'collection', rarity: 'epic', requirement: 10, xpReward: 300, coinReward: 1000 },
  { id: 'legendary_owner', name: 'Possessore Leggendario', description: 'Ottieni 3 oggetti leggendari', icon: '👑', category: 'collection', rarity: 'legendary', requirement: 3, xpReward: 1000, coinReward: 5000 },
  
  // Mastery
  { id: 'level_10', name: 'Apprendista', description: 'Raggiungi il livello 10', icon: '📈', category: 'mastery', rarity: 'common', requirement: 10, xpReward: 100, coinReward: 200 },
  { id: 'level_25', name: 'Esperto', description: 'Raggiungi il livello 25', icon: '📊', category: 'mastery', rarity: 'rare', requirement: 25, xpReward: 300, coinReward: 600 },
  { id: 'level_50', name: 'Maestro', description: 'Raggiungi il livello 50', icon: '🎓', category: 'mastery', rarity: 'epic', requirement: 50, xpReward: 500, coinReward: 2000 },
  { id: 'level_100', name: 'Leggenda', description: 'Raggiungi il livello 100', icon: '👑', category: 'mastery', rarity: 'legendary', requirement: 100, xpReward: 2000, coinReward: 10000 },
  { id: 'daily_streak', name: 'Costante', description: 'Gioca per 30 giorni consecutivi', icon: '🔥', category: 'mastery', rarity: 'epic', requirement: 30, xpReward: 500, coinReward: 1500 },
];

// 3D Badge Component
function Badge3D({ rarity, unlocked }: { rarity: string; unlocked: boolean }) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const glowRef = React.useRef<THREE.Mesh>(null);
  const color = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || '#9ca3af';
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += unlocked ? 0.02 : 0.005;
      if (unlocked) {
        meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
      }
    }
    if (glowRef.current && unlocked) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      glowRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group>
      {/* Glow effect for unlocked */}
      {unlocked && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.55, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* Badge base */}
      <mesh ref={meshRef}>
        <cylinderGeometry args={[0.4, 0.4, 0.1, 32]} />
        <meshStandardMaterial 
          color={unlocked ? color : '#374151'} 
          metalness={unlocked ? 0.8 : 0.3} 
          roughness={unlocked ? 0.2 : 0.7}
        />
      </mesh>
      
      {/* Star decoration */}
      {unlocked && (
        <mesh position={[0, 0.06, 0]}>
          <coneGeometry args={[0.15, 0.2, 5]} />
          <meshStandardMaterial color="#fff" metalness={0.9} roughness={0.1} />
        </mesh>
      )}
      
      {/* Lock for locked badges */}
      {!unlocked && (
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.15, 0.2, 0.05]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      )}
    </group>
  );
}

// Achievement Card Component
function AchievementCard({ 
  achievement, 
  onPress 
}: { 
  achievement: Achievement;
  onPress: () => void;
}) {
  const progress = Math.min(achievement.progress / achievement.requirement, 1);
  const rarityColor = RARITY_COLORS[achievement.rarity];
  
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.95),
      withSpring(1)
    );
    onPress();
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[
        styles.achievementCard,
        achievement.unlocked && styles.achievementCardUnlocked,
        { borderColor: achievement.unlocked ? rarityColor : 'transparent' },
        animatedStyle,
      ]}>
        {/* 3D Badge Preview */}
        <View style={styles.badgePreview}>
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[2, 2, 2]} intensity={1} />
            <PerspectiveCamera makeDefault position={[0, 0, 2]} />
            <Suspense fallback={null}>
              <Badge3D rarity={achievement.rarity} unlocked={achievement.unlocked} />
            </Suspense>
          </Canvas>
        </View>
        
        {/* Info */}
        <View style={styles.achievementInfo}>
          <View style={styles.achievementHeader}>
            <ThemedText style={styles.achievementIcon}>{achievement.icon}</ThemedText>
            <View style={styles.achievementTitleContainer}>
              <ThemedText style={[
                styles.achievementName,
                !achievement.unlocked && styles.achievementNameLocked,
              ]}>
                {achievement.name}
              </ThemedText>
              <View style={[styles.rarityBadge, { backgroundColor: rarityColor }]}>
                <ThemedText style={styles.rarityText}>
                  {achievement.rarity.charAt(0).toUpperCase() + achievement.rarity.slice(1)}
                </ThemedText>
              </View>
            </View>
          </View>
          
          <ThemedText style={styles.achievementDescription}>
            {achievement.description}
          </ThemedText>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[
                styles.progressFill, 
                { width: `${progress * 100}%`, backgroundColor: rarityColor }
              ]} />
            </View>
            <ThemedText style={styles.progressText}>
              {achievement.progress}/{achievement.requirement}
            </ThemedText>
          </View>
          
          {/* Rewards */}
          <View style={styles.rewards}>
            <View style={styles.reward}>
              <ThemedText style={styles.rewardIcon}>⭐</ThemedText>
              <ThemedText style={styles.rewardText}>{achievement.xpReward} XP</ThemedText>
            </View>
            <View style={styles.reward}>
              <ThemedText style={styles.rewardIcon}>🪙</ThemedText>
              <ThemedText style={styles.rewardText}>{achievement.coinReward}</ThemedText>
            </View>
          </View>
        </View>
        
        {/* Unlocked indicator */}
        {achievement.unlocked && (
          <View style={styles.unlockedBadge}>
            <ThemedText style={styles.unlockedText}>✓</ThemedText>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export default function AchievementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [stats, setStats] = useState({ total: 0, unlocked: 0, totalXP: 0, totalCoins: 0 });

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      // Load user stats to calculate progress
      const userStatsStr = await AsyncStorage.getItem('userStats');
      const userStats = userStatsStr ? JSON.parse(userStatsStr) : {};
      
      // Load unlocked achievements
      const unlockedStr = await AsyncStorage.getItem('unlockedAchievements');
      const unlockedIds = unlockedStr ? JSON.parse(unlockedStr) : [];
      
      // Map achievements with progress
      const mappedAchievements: Achievement[] = ACHIEVEMENTS_DATA.map(a => {
        let progress = 0;
        
        // Calculate progress based on achievement type
        if (a.id.startsWith('pest_slayer')) progress = userStats.pestsKilled || 0;
        else if (a.id === 'boss_hunter') progress = userStats.bossesDefeated || 0;
        else if (a.id === 'perfect_wave') progress = userStats.perfectWaves || 0;
        else if (a.id.startsWith('green_thumb')) progress = userStats.plantsGrown || 0;
        else if (a.id === 'breeder') progress = userStats.hybridsCreated || 0;
        else if (a.id === 'perfect_harvest') progress = userStats.perfectHarvests || 0;
        else if (a.id === 'friendly') progress = userStats.gardensVisited || 0;
        else if (a.id === 'popular') progress = userStats.visitsReceived || 0;
        else if (a.id === 'challenger') progress = userStats.pvpWins || 0;
        else if (a.id === 'helper') progress = userStats.playersHelped || 0;
        else if (a.id.startsWith('collector')) progress = userStats.uniqueItems || 0;
        else if (a.id === 'rare_finder') progress = userStats.epicItems || 0;
        else if (a.id === 'legendary_owner') progress = userStats.legendaryItems || 0;
        else if (a.id.startsWith('level')) progress = userStats.level || 1;
        else if (a.id === 'daily_streak') progress = userStats.dailyStreak || 0;
        
        const unlocked = unlockedIds.includes(a.id) || progress >= a.requirement;
        
        return {
          ...a,
          progress: Math.min(progress, a.requirement),
          unlocked,
          unlockedAt: unlocked ? new Date().toISOString() : undefined,
        };
      });
      
      setAchievements(mappedAchievements);
      
      // Calculate stats
      const unlockedCount = mappedAchievements.filter(a => a.unlocked).length;
      const totalXP = mappedAchievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xpReward, 0);
      const totalCoins = mappedAchievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.coinReward, 0);
      
      setStats({
        total: mappedAchievements.length,
        unlocked: unlockedCount,
        totalXP,
        totalCoins,
      });
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };

  const handleAchievementPress = useCallback((achievement: Achievement) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    play('ui_tap_light');
    
    if (achievement.unlocked) {
      play('ui_success');
    }
  }, [play]);

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(a => a.category === selectedCategory);

  const unlockedPercentage = stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.title}>🏆 Achievements</ThemedText>

        {/* Stats Summary */}
        <View style={styles.statsSummary}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{stats.unlocked}/{stats.total}</ThemedText>
            <ThemedText style={styles.statLabel}>Sbloccati</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{unlockedPercentage}%</ThemedText>
            <ThemedText style={styles.statLabel}>Completamento</ThemedText>
          </View>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>{stats.totalXP}</ThemedText>
            <ThemedText style={styles.statLabel}>XP Totali</ThemedText>
          </View>
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
                selectedCategory === cat.id && { backgroundColor: cat.color + '40' },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                play('ui_tab_switch');
                setSelectedCategory(cat.id);
              }}
            >
              <ThemedText style={styles.categoryIcon}>{cat.icon}</ThemedText>
              <ThemedText style={[
                styles.categoryText,
                selectedCategory === cat.id && { color: cat.color },
              ]}>
                {cat.name}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Achievements List */}
        <FlatList
          data={filteredAchievements}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <AchievementCard
              achievement={item}
              onPress={() => handleAchievementPress(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
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
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffd700',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: 16,
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
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 100,
  },
  achievementCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  achievementCardUnlocked: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  badgePreview: {
    width: 80,
    height: 80,
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  achievementIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  achievementTitleContainer: {
    flex: 1,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  achievementNameLocked: {
    color: 'rgba(255,255,255,0.5)',
  },
  rarityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  rarityText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  achievementDescription: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    minWidth: 60,
    textAlign: 'right',
  },
  rewards: {
    flexDirection: 'row',
    gap: 16,
  },
  reward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardIcon: {
    fontSize: 14,
  },
  rewardText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  unlockedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockedText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
