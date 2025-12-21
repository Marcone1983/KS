// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInUp, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface PlayerStats {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalXP: number;
  title: string;
  rank: string;
  skillPoints: number;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'combat' | 'growing' | 'breeding' | 'economy';
  maxLevel: number;
  currentLevel: number;
  cost: number;
  unlocked: boolean;
  prerequisite?: string;
  bonuses: string[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  progress: number;
  target: number;
  completed: boolean;
}

const PLAYER_STATS: PlayerStats = {
  level: 25,
  currentXP: 7500,
  nextLevelXP: 10000,
  totalXP: 125000,
  title: 'Maestro Coltivatore',
  rank: 'Platino',
  skillPoints: 5,
};

const SKILLS: Skill[] = [
  // Combat
  { id: 'spray_damage', name: 'Danno Spray', description: 'Aumenta il danno dello spray', icon: '💥', category: 'combat', maxLevel: 10, currentLevel: 5, cost: 1, unlocked: true, bonuses: ['+5% danno per livello'] },
  { id: 'spray_speed', name: 'Velocità Spray', description: 'Aumenta la velocità di fuoco', icon: '⚡', category: 'combat', maxLevel: 10, currentLevel: 3, cost: 1, unlocked: true, bonuses: ['+3% velocità per livello'] },
  { id: 'critical_hit', name: 'Colpo Critico', description: 'Possibilità di danno critico', icon: '🎯', category: 'combat', maxLevel: 5, currentLevel: 2, cost: 2, unlocked: true, prerequisite: 'spray_damage', bonuses: ['+4% probabilità critico', '+50% danno critico'] },
  { id: 'area_damage', name: 'Danno ad Area', description: 'Lo spray colpisce nemici vicini', icon: '💫', category: 'combat', maxLevel: 5, currentLevel: 0, cost: 3, unlocked: false, prerequisite: 'spray_damage', bonuses: ['+10% raggio per livello'] },
  
  // Growing
  { id: 'growth_speed', name: 'Velocità Crescita', description: 'Le piante crescono più velocemente', icon: '🌱', category: 'growing', maxLevel: 10, currentLevel: 4, cost: 1, unlocked: true, bonuses: ['+5% velocità crescita'] },
  { id: 'yield_bonus', name: 'Bonus Resa', description: 'Aumenta la resa del raccolto', icon: '🌾', category: 'growing', maxLevel: 10, currentLevel: 6, cost: 1, unlocked: true, bonuses: ['+3% resa per livello'] },
  { id: 'nutrient_efficiency', name: 'Efficienza Nutrienti', description: 'I nutrienti durano di più', icon: '💧', category: 'growing', maxLevel: 5, currentLevel: 2, cost: 2, unlocked: true, prerequisite: 'growth_speed', bonuses: ['+10% durata nutrienti'] },
  { id: 'auto_water', name: 'Irrigazione Auto', description: 'Le piante si innaffiano da sole', icon: '🚿', category: 'growing', maxLevel: 3, currentLevel: 0, cost: 3, unlocked: false, prerequisite: 'nutrient_efficiency', bonuses: ['Irrigazione automatica ogni 4h'] },
  
  // Breeding
  { id: 'mutation_chance', name: 'Probabilità Mutazione', description: 'Aumenta le mutazioni positive', icon: '🧬', category: 'breeding', maxLevel: 10, currentLevel: 3, cost: 1, unlocked: true, bonuses: ['+2% probabilità mutazione'] },
  { id: 'trait_inheritance', name: 'Ereditarietà Tratti', description: 'Migliore trasmissione genetica', icon: '🔬', category: 'breeding', maxLevel: 5, currentLevel: 2, cost: 2, unlocked: true, bonuses: ['+5% ereditarietà tratti positivi'] },
  { id: 'rare_breeding', name: 'Breeding Raro', description: 'Aumenta la probabilità di rarità', icon: '⭐', category: 'breeding', maxLevel: 5, currentLevel: 1, cost: 3, unlocked: true, prerequisite: 'mutation_chance', bonuses: ['+3% probabilità rarità superiore'] },
  { id: 'instant_breed', name: 'Breeding Istantaneo', description: 'Riduce il tempo di breeding', icon: '⏰', category: 'breeding', maxLevel: 3, currentLevel: 0, cost: 4, unlocked: false, prerequisite: 'rare_breeding', bonuses: ['-20% tempo breeding per livello'] },
  
  // Economy
  { id: 'coin_bonus', name: 'Bonus Monete', description: 'Guadagna più monete', icon: '💰', category: 'economy', maxLevel: 10, currentLevel: 4, cost: 1, unlocked: true, bonuses: ['+5% monete per livello'] },
  { id: 'xp_bonus', name: 'Bonus XP', description: 'Guadagna più esperienza', icon: '⭐', category: 'economy', maxLevel: 10, currentLevel: 5, cost: 1, unlocked: true, bonuses: ['+3% XP per livello'] },
  { id: 'shop_discount', name: 'Sconto Shop', description: 'Prezzi ridotti nello shop', icon: '🏷️', category: 'economy', maxLevel: 5, currentLevel: 2, cost: 2, unlocked: true, prerequisite: 'coin_bonus', bonuses: ['-3% prezzi per livello'] },
  { id: 'daily_bonus', name: 'Bonus Giornaliero', description: 'Ricompense giornaliere migliori', icon: '🎁', category: 'economy', maxLevel: 3, currentLevel: 1, cost: 3, unlocked: true, prerequisite: 'xp_bonus', bonuses: ['+20% ricompense giornaliere'] },
];

const ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', name: 'Primo Sangue', description: 'Elimina il tuo primo parassita', icon: '🎖️', xpReward: 100, progress: 1, target: 1, completed: true },
  { id: 'a2', name: 'Sterminatore', description: 'Elimina 1000 parassiti', icon: '💀', xpReward: 500, progress: 850, target: 1000, completed: false },
  { id: 'a3', name: 'Genetista', description: 'Crea 50 ibridi', icon: '🧬', xpReward: 750, progress: 34, target: 50, completed: false },
  { id: 'a4', name: 'Collezionista', description: 'Raccogli 100 varietà diverse', icon: '📚', xpReward: 1000, progress: 67, target: 100, completed: false },
  { id: 'a5', name: 'Boss Slayer', description: 'Sconfiggi 10 boss', icon: '👹', xpReward: 800, progress: 7, target: 10, completed: false },
];

const CATEGORY_COLORS = {
  combat: '#ef4444',
  growing: '#22c55e',
  breeding: '#a855f7',
  economy: '#f59e0b',
};

const RANK_COLORS = {
  Bronzo: '#cd7f32',
  Argento: '#c0c0c0',
  Oro: '#ffd700',
  Platino: '#00d4ff',
  Diamante: '#b9f2ff',
  Leggenda: '#ff6b6b',
};

export default function PlayerProgressionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'achievements'>('overview');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'combat' | 'growing' | 'breeding' | 'economy'>('all');
  const [stats, setStats] = useState(PLAYER_STATS);
  const [skills, setSkills] = useState(SKILLS);

  const filteredSkills = selectedCategory === 'all' 
    ? skills 
    : skills.filter(s => s.category === selectedCategory);

  const upgradeSkill = (skillId: string) => {
    const skill = skills.find(s => s.id === skillId);
    if (!skill || skill.currentLevel >= skill.maxLevel || stats.skillPoints < skill.cost) return;

    setSkills(prev => prev.map(s => 
      s.id === skillId ? { ...s, currentLevel: s.currentLevel + 1 } : s
    ));
    setStats(prev => ({ ...prev, skillPoints: prev.skillPoints - skill.cost }));
  };

  const xpProgress = (stats.currentXP / stats.nextLevelXP) * 100;

  const renderOverview = () => (
    <ScrollView style={styles.tabContent}>
      {/* Level Card */}
      <Animated.View entering={FadeIn} style={styles.levelCard}>
        <View style={styles.levelHeader}>
          <View style={styles.levelBadge}>
            <ThemedText style={styles.levelNumber}>{stats.level}</ThemedText>
          </View>
          <View style={styles.levelInfo}>
            <ThemedText style={styles.levelTitle}>{stats.title}</ThemedText>
            <View style={[styles.rankBadge, { backgroundColor: RANK_COLORS[stats.rank as keyof typeof RANK_COLORS] + '30' }]}>
              <ThemedText style={[styles.rankText, { color: RANK_COLORS[stats.rank as keyof typeof RANK_COLORS] }]}>
                {stats.rank}
              </ThemedText>
            </View>
          </View>
          <View style={styles.skillPointsBadge}>
            <ThemedText style={styles.skillPointsValue}>{stats.skillPoints}</ThemedText>
            <ThemedText style={styles.skillPointsLabel}>SP</ThemedText>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpContainer}>
          <View style={styles.xpBar}>
            <View style={[styles.xpFill, { width: `${xpProgress}%` }]} />
          </View>
          <ThemedText style={styles.xpText}>
            {stats.currentXP.toLocaleString()} / {stats.nextLevelXP.toLocaleString()} XP
          </ThemedText>
        </View>

        <ThemedText style={styles.totalXP}>
          XP Totale: {stats.totalXP.toLocaleString()}
        </ThemedText>
      </Animated.View>

      {/* Stats Summary */}
      <View style={styles.statsGrid}>
        {Object.entries(CATEGORY_COLORS).map(([category, color]) => {
          const categorySkills = skills.filter(s => s.category === category);
          const totalLevels = categorySkills.reduce((sum, s) => sum + s.currentLevel, 0);
          const maxLevels = categorySkills.reduce((sum, s) => sum + s.maxLevel, 0);
          return (
            <Pressable 
              key={category} 
              style={[styles.statCard, { borderColor: color }]}
              onPress={() => {
                setActiveTab('skills');
                setSelectedCategory(category as any);
              }}
            >
              <ThemedText style={styles.statIcon}>
                {category === 'combat' ? '⚔️' : category === 'growing' ? '🌿' : category === 'breeding' ? '🧬' : '💰'}
              </ThemedText>
              <ThemedText style={styles.statName}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </ThemedText>
              <ThemedText style={[styles.statValue, { color }]}>
                {totalLevels}/{maxLevels}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {/* Recent Achievements */}
      <View style={styles.recentSection}>
        <ThemedText style={styles.sectionTitle}>Achievement Recenti</ThemedText>
        {ACHIEVEMENTS.filter(a => a.completed).slice(0, 3).map(achievement => (
          <View key={achievement.id} style={styles.achievementMini}>
            <ThemedText style={styles.achievementMiniIcon}>{achievement.icon}</ThemedText>
            <ThemedText style={styles.achievementMiniName}>{achievement.name}</ThemedText>
            <ThemedText style={styles.achievementMiniXP}>+{achievement.xpReward} XP</ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderSkills = () => (
    <ScrollView style={styles.tabContent}>
      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
        <Pressable
          style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
          onPress={() => setSelectedCategory('all')}
        >
          <ThemedText style={styles.categoryChipText}>Tutti</ThemedText>
        </Pressable>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <Pressable
            key={cat}
            style={[
              styles.categoryChip, 
              selectedCategory === cat && styles.categoryChipActive,
              selectedCategory === cat && { borderColor: color }
            ]}
            onPress={() => setSelectedCategory(cat as any)}
          >
            <ThemedText style={[styles.categoryChipText, selectedCategory === cat && { color }]}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Skills List */}
      {filteredSkills.map((skill, index) => (
        <Animated.View key={skill.id} entering={SlideInUp.delay(index * 50)}>
          <View style={[
            styles.skillCard,
            !skill.unlocked && styles.skillCardLocked
          ]}>
            <View style={styles.skillHeader}>
              <View style={[styles.skillIcon, { backgroundColor: CATEGORY_COLORS[skill.category] + '30' }]}>
                <ThemedText style={styles.skillIconText}>{skill.icon}</ThemedText>
              </View>
              <View style={styles.skillInfo}>
                <ThemedText style={styles.skillName}>{skill.name}</ThemedText>
                <ThemedText style={styles.skillDescription}>{skill.description}</ThemedText>
              </View>
              <View style={styles.skillLevel}>
                <ThemedText style={styles.skillLevelText}>
                  {skill.currentLevel}/{skill.maxLevel}
                </ThemedText>
              </View>
            </View>

            {/* Level Progress */}
            <View style={styles.skillProgress}>
              {Array.from({ length: skill.maxLevel }).map((_, i) => (
                <View 
                  key={i} 
                  style={[
                    styles.skillProgressDot,
                    i < skill.currentLevel && { backgroundColor: CATEGORY_COLORS[skill.category] }
                  ]} 
                />
              ))}
            </View>

            {/* Bonuses */}
            <View style={styles.skillBonuses}>
              {skill.bonuses.map((bonus, i) => (
                <ThemedText key={i} style={styles.skillBonus}>• {bonus}</ThemedText>
              ))}
            </View>

            {/* Upgrade Button */}
            {skill.unlocked && skill.currentLevel < skill.maxLevel && (
              <Pressable 
                style={[
                  styles.upgradeButton,
                  stats.skillPoints < skill.cost && styles.upgradeButtonDisabled
                ]}
                onPress={() => upgradeSkill(skill.id)}
                disabled={stats.skillPoints < skill.cost}
              >
                <ThemedText style={styles.upgradeButtonText}>
                  Potenzia ({skill.cost} SP)
                </ThemedText>
              </Pressable>
            )}

            {!skill.unlocked && (
              <View style={styles.lockedOverlay}>
                <ThemedText style={styles.lockedText}>🔒 Richiede: {skill.prerequisite}</ThemedText>
              </View>
            )}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );

  const renderAchievements = () => (
    <ScrollView style={styles.tabContent}>
      {ACHIEVEMENTS.map((achievement, index) => (
        <Animated.View key={achievement.id} entering={FadeIn.delay(index * 50)}>
          <View style={[styles.achievementCard, achievement.completed && styles.achievementCardCompleted]}>
            <View style={styles.achievementIcon}>
              <ThemedText style={styles.achievementIconText}>{achievement.icon}</ThemedText>
            </View>
            <View style={styles.achievementInfo}>
              <ThemedText style={styles.achievementName}>{achievement.name}</ThemedText>
              <ThemedText style={styles.achievementDescription}>{achievement.description}</ThemedText>
              <View style={styles.achievementProgress}>
                <View style={styles.achievementProgressBar}>
                  <View style={[styles.achievementProgressFill, { width: `${(achievement.progress / achievement.target) * 100}%` }]} />
                </View>
                <ThemedText style={styles.achievementProgressText}>
                  {achievement.progress}/{achievement.target}
                </ThemedText>
              </View>
            </View>
            <View style={styles.achievementReward}>
              <ThemedText style={styles.achievementXP}>+{achievement.xpReward}</ThemedText>
              <ThemedText style={styles.achievementXPLabel}>XP</ThemedText>
            </View>
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Indietro</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>📊 Progressione</ThemedText>
        <View style={styles.spBadge}>
          <ThemedText style={styles.spText}>{stats.skillPoints} SP</ThemedText>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'skills', 'achievements'] as const).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? '📈 Panoramica' : tab === 'skills' ? '⚡ Abilità' : '🏆 Achievement'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'skills' && renderSkills()}
        {activeTab === 'achievements' && renderAchievements()}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  spBadge: { backgroundColor: 'rgba(34,197,94,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  spText: { color: '#22c55e', fontSize: 14, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4, borderRadius: 12 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabText: { color: '#a7f3d0', fontSize: 12 },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  content: { flex: 1 },
  tabContent: { flex: 1, paddingHorizontal: 20 },
  levelCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, marginBottom: 16 },
  levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  levelBadge: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  levelNumber: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  levelInfo: { flex: 1 },
  levelTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  rankBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  rankText: { fontSize: 12, fontWeight: 'bold' },
  skillPointsBadge: { alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.3)', borderRadius: 12, padding: 10 },
  skillPointsValue: { color: '#22c55e', fontSize: 24, fontWeight: 'bold' },
  skillPointsLabel: { color: '#22c55e', fontSize: 10 },
  xpContainer: { marginBottom: 8 },
  xpBar: { height: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, marginBottom: 4 },
  xpFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 6 },
  xpText: { color: '#a7f3d0', fontSize: 12, textAlign: 'center' },
  totalXP: { color: '#9ca3af', fontSize: 12, textAlign: 'center' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  statCard: { width: (width - 50) / 2, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2 },
  statIcon: { fontSize: 28, marginBottom: 8 },
  statName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  recentSection: { marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  achievementMini: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginBottom: 8 },
  achievementMiniIcon: { fontSize: 24, marginRight: 12 },
  achievementMiniName: { flex: 1, color: '#fff', fontSize: 14 },
  achievementMiniXP: { color: '#22c55e', fontSize: 12, fontWeight: 'bold' },
  categoryFilter: { maxHeight: 44, marginBottom: 16 },
  categoryChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  categoryChipActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  categoryChipText: { color: '#fff', fontSize: 13 },
  skillCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 },
  skillCardLocked: { opacity: 0.5 },
  skillHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  skillIcon: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  skillIconText: { fontSize: 24 },
  skillInfo: { flex: 1 },
  skillName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  skillDescription: { color: '#9ca3af', fontSize: 12 },
  skillLevel: {},
  skillLevelText: { color: '#22c55e', fontSize: 14, fontWeight: 'bold' },
  skillProgress: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  skillProgressDot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)' },
  skillBonuses: { marginBottom: 12 },
  skillBonus: { color: '#a7f3d0', fontSize: 12 },
  upgradeButton: { backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  upgradeButtonDisabled: { backgroundColor: '#6b7280' },
  upgradeButtonText: { color: '#fff', fontWeight: 'bold' },
  lockedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  lockedText: { color: '#fff', fontSize: 14 },
  achievementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 },
  achievementCardCompleted: { borderWidth: 1, borderColor: '#22c55e' },
  achievementIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  achievementIconText: { fontSize: 24 },
  achievementInfo: { flex: 1 },
  achievementName: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  achievementDescription: { color: '#9ca3af', fontSize: 12, marginBottom: 8 },
  achievementProgress: { flexDirection: 'row', alignItems: 'center' },
  achievementProgressBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginRight: 8 },
  achievementProgressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  achievementProgressText: { color: '#fff', fontSize: 10 },
  achievementReward: { alignItems: 'center' },
  achievementXP: { color: '#f59e0b', fontSize: 18, fontWeight: 'bold' },
  achievementXPLabel: { color: '#f59e0b', fontSize: 10 },
});
