// @ts-nocheck
import React, { useState, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import Animated, { FadeIn, SlideInUp, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'combat' | 'growing' | 'breeding' | 'collection' | 'social' | 'special';
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  unlockedAt?: Date;
  reward: { type: 'coins' | 'gems' | 'item'; amount: number; name?: string };
  secret?: boolean;
}

const RARITY_COLORS = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#e5e4e2',
  diamond: '#b9f2ff',
};

const CATEGORY_ICONS = {
  combat: '⚔️',
  growing: '🌱',
  breeding: '🧬',
  collection: '📚',
  social: '👥',
  special: '✨',
};

const ACHIEVEMENTS: Achievement[] = [
  // Combat
  { id: 'first_kill', name: 'Prima Vittoria', description: 'Elimina il tuo primo parassita', icon: '🎯', category: 'combat', rarity: 'bronze', progress: 1, maxProgress: 1, unlocked: true, unlockedAt: new Date(), reward: { type: 'coins', amount: 100 } },
  { id: 'bug_slayer', name: 'Sterminatore', description: 'Elimina 100 parassiti', icon: '💀', category: 'combat', rarity: 'silver', progress: 87, maxProgress: 100, unlocked: false, reward: { type: 'coins', amount: 500 } },
  { id: 'boss_hunter', name: 'Cacciatore di Boss', description: 'Sconfiggi 10 boss', icon: '👑', category: 'combat', rarity: 'gold', progress: 3, maxProgress: 10, unlocked: false, reward: { type: 'gems', amount: 50 } },
  { id: 'perfect_run', name: 'Corsa Perfetta', description: 'Completa un livello senza danni', icon: '⭐', category: 'combat', rarity: 'platinum', progress: 0, maxProgress: 1, unlocked: false, reward: { type: 'item', amount: 1, name: 'Spray Leggendario' } },
  
  // Growing
  { id: 'first_harvest', name: 'Primo Raccolto', description: 'Raccogli la tua prima pianta', icon: '🌿', category: 'growing', rarity: 'bronze', progress: 1, maxProgress: 1, unlocked: true, unlockedAt: new Date(), reward: { type: 'coins', amount: 100 } },
  { id: 'green_thumb', name: 'Pollice Verde', description: 'Coltiva 50 piante', icon: '🌳', category: 'growing', rarity: 'silver', progress: 23, maxProgress: 50, unlocked: false, reward: { type: 'coins', amount: 500 } },
  { id: 'master_grower', name: 'Maestro Coltivatore', description: 'Raggiungi lo stadio 8 con 10 piante', icon: '🏆', category: 'growing', rarity: 'gold', progress: 4, maxProgress: 10, unlocked: false, reward: { type: 'gems', amount: 100 } },
  { id: 'thc_king', name: 'Re del THC', description: 'Coltiva una pianta con THC 95+', icon: '💎', category: 'growing', rarity: 'diamond', progress: 0, maxProgress: 1, unlocked: false, reward: { type: 'item', amount: 1, name: 'Semi Leggendari' } },
  
  // Breeding
  { id: 'first_hybrid', name: 'Primo Ibrido', description: 'Crea il tuo primo ibrido', icon: '🧪', category: 'breeding', rarity: 'bronze', progress: 1, maxProgress: 1, unlocked: true, unlockedAt: new Date(), reward: { type: 'coins', amount: 200 } },
  { id: 'geneticist', name: 'Genetista', description: 'Crea 25 ibridi unici', icon: '🔬', category: 'breeding', rarity: 'silver', progress: 12, maxProgress: 25, unlocked: false, reward: { type: 'coins', amount: 1000 } },
  { id: 'legendary_breeder', name: 'Allevatore Leggendario', description: 'Crea un ibrido leggendario', icon: '👑', category: 'breeding', rarity: 'gold', progress: 0, maxProgress: 1, unlocked: false, reward: { type: 'gems', amount: 200 } },
  { id: 'gen_master', name: 'Maestro Generazioni', description: 'Raggiungi Gen 20', icon: '🧬', category: 'breeding', rarity: 'platinum', progress: 5, maxProgress: 20, unlocked: false, reward: { type: 'item', amount: 1, name: 'DNA Perfetto' } },
  
  // Collection
  { id: 'collector', name: 'Collezionista', description: 'Colleziona 10 varietà diverse', icon: '📖', category: 'collection', rarity: 'bronze', progress: 8, maxProgress: 10, unlocked: false, reward: { type: 'coins', amount: 300 } },
  { id: 'encyclopedia', name: 'Enciclopedia Vivente', description: 'Sblocca tutte le voci dell\'enciclopedia', icon: '📚', category: 'collection', rarity: 'gold', progress: 45, maxProgress: 100, unlocked: false, reward: { type: 'gems', amount: 150 } },
  { id: 'rare_finder', name: 'Cercatore di Rarità', description: 'Trova 5 oggetti leggendari', icon: '💎', category: 'collection', rarity: 'platinum', progress: 2, maxProgress: 5, unlocked: false, reward: { type: 'item', amount: 1, name: 'Chiave Misteriosa' } },
  
  // Social
  { id: 'first_friend', name: 'Primo Amico', description: 'Aggiungi il tuo primo amico', icon: '🤝', category: 'social', rarity: 'bronze', progress: 1, maxProgress: 1, unlocked: true, unlockedAt: new Date(), reward: { type: 'coins', amount: 100 } },
  { id: 'trader', name: 'Commerciante', description: 'Completa 10 scambi', icon: '🔄', category: 'social', rarity: 'silver', progress: 3, maxProgress: 10, unlocked: false, reward: { type: 'coins', amount: 500 } },
  { id: 'guild_leader', name: 'Leader di Gilda', description: 'Diventa leader di una gilda', icon: '👑', category: 'social', rarity: 'gold', progress: 0, maxProgress: 1, unlocked: false, reward: { type: 'gems', amount: 100 } },
  
  // Special
  { id: 'early_bird', name: 'Mattiniero', description: 'Gioca alle 6 del mattino', icon: '🌅', category: 'special', rarity: 'silver', progress: 0, maxProgress: 1, unlocked: false, secret: true, reward: { type: 'coins', amount: 500 } },
  { id: 'night_owl', name: 'Nottambulo', description: 'Gioca a mezzanotte', icon: '🦉', category: 'special', rarity: 'silver', progress: 1, maxProgress: 1, unlocked: true, unlockedAt: new Date(), secret: true, reward: { type: 'coins', amount: 500 } },
  { id: 'completionist', name: 'Completista', description: 'Sblocca tutti gli achievement', icon: '🏅', category: 'special', rarity: 'diamond', progress: 6, maxProgress: 20, unlocked: false, reward: { type: 'item', amount: 1, name: 'Titolo Esclusivo' } },
];

// 3D Trophy
function Trophy3D({ rarity, unlocked }: { rarity: string; unlocked: boolean }) {
  const groupRef = React.useRef<THREE.Group>(null);
  const color = RARITY_COLORS[rarity as keyof typeof RARITY_COLORS] || '#ffd700';
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
      if (unlocked) {
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
      }
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.4} />
      <pointLight position={[2, 3, 2]} intensity={1} color={color} />
      <spotLight position={[0, 5, 0]} angle={0.3} penumbra={1} intensity={unlocked ? 2 : 0.5} color={color} />
      
      {/* Base */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.2, 32]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Stem */}
      <mesh position={[0, -0.4, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.6, 16]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Cup */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.5, 0.3, 0.8, 32]} />
        <meshStandardMaterial 
          color={unlocked ? color : '#4a4a4a'} 
          metalness={unlocked ? 0.9 : 0.3} 
          roughness={unlocked ? 0.1 : 0.7}
          emissive={unlocked ? color : '#000000'}
          emissiveIntensity={unlocked ? 0.3 : 0}
        />
      </mesh>
      
      {/* Handles */}
      {[-1, 1].map(side => (
        <mesh key={side} position={[side * 0.55, 0.2, 0]} rotation={[0, 0, side * Math.PI / 6]}>
          <torusGeometry args={[0.15, 0.04, 8, 16, Math.PI]} />
          <meshStandardMaterial color={unlocked ? color : '#4a4a4a'} metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      
      {/* Star on top */}
      {unlocked && (
        <mesh position={[0, 0.8, 0]}>
          <octahedronGeometry args={[0.15]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
        </mesh>
      )}
      
      {/* Particles for unlocked */}
      {unlocked && Array.from({ length: 15 }).map((_, i) => (
        <mesh key={i} position={[
          Math.sin(i * 0.8) * (0.8 + Math.sin(i) * 0.3),
          Math.cos(i * 0.5) * 0.5 + 0.2,
          Math.cos(i * 0.8) * (0.8 + Math.cos(i) * 0.3)
        ]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export default function Achievements3DScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [achievements] = useState(ACHIEVEMENTS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filteredAchievements = selectedCategory 
    ? achievements.filter(a => a.category === selectedCategory)
    : achievements;

  const totalUnlocked = achievements.filter(a => a.unlocked).length;
  const totalPoints = achievements.filter(a => a.unlocked).reduce((sum, a) => {
    const points = { bronze: 10, silver: 25, gold: 50, platinum: 100, diamond: 200 };
    return sum + points[a.rarity];
  }, 0);

  const categories = Object.keys(CATEGORY_ICONS) as (keyof typeof CATEGORY_ICONS)[];

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Indietro</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>🏆 Achievement</ThemedText>
        <View style={styles.pointsBadge}>
          <ThemedText style={styles.pointsText}>{totalPoints} pts</ThemedText>
        </View>
      </View>

      {/* 3D Trophy Preview */}
      <View style={styles.trophyPreview}>
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <Suspense fallback={null}>
            <Trophy3D 
              rarity={selectedAchievement?.rarity || 'gold'} 
              unlocked={selectedAchievement?.unlocked ?? true} 
            />
          </Suspense>
        </Canvas>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{totalUnlocked}</ThemedText>
          <ThemedText style={styles.statLabel}>Sbloccati</ThemedText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{achievements.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Totali</ThemedText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{Math.round(totalUnlocked / achievements.length * 100)}%</ThemedText>
          <ThemedText style={styles.statLabel}>Completato</ThemedText>
        </View>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
        <Pressable
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <ThemedText style={styles.categoryChipText}>🏅 Tutti</ThemedText>
        </Pressable>
        {categories.map(cat => (
          <Pressable
            key={cat}
            style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            <ThemedText style={styles.categoryChipText}>
              {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Achievements List */}
      <ScrollView 
        style={styles.achievementsList}
        contentContainerStyle={[styles.achievementsContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
      >
        {filteredAchievements.map((achievement, index) => (
          <Animated.View key={achievement.id} entering={SlideInUp.delay(index * 30)}>
            <Pressable 
              style={[
                styles.achievementCard,
                !achievement.unlocked && styles.achievementCardLocked,
                achievement.secret && !achievement.unlocked && styles.achievementCardSecret
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedAchievement(achievement);
                setShowModal(true);
              }}
            >
              <View style={[styles.achievementIcon, { backgroundColor: RARITY_COLORS[achievement.rarity] + '30' }]}>
                <ThemedText style={styles.achievementIconText}>
                  {achievement.secret && !achievement.unlocked ? '❓' : achievement.icon}
                </ThemedText>
                {achievement.unlocked && (
                  <View style={[styles.unlockedBadge, { backgroundColor: RARITY_COLORS[achievement.rarity] }]}>
                    <ThemedText style={styles.unlockedBadgeText}>✓</ThemedText>
                  </View>
                )}
              </View>
              
              <View style={styles.achievementInfo}>
                <ThemedText style={styles.achievementName}>
                  {achievement.secret && !achievement.unlocked ? '???' : achievement.name}
                </ThemedText>
                <ThemedText style={styles.achievementDescription}>
                  {achievement.secret && !achievement.unlocked ? 'Achievement segreto' : achievement.description}
                </ThemedText>
                
                {/* Progress Bar */}
                {!achievement.unlocked && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${(achievement.progress / achievement.maxProgress) * 100}%`,
                            backgroundColor: RARITY_COLORS[achievement.rarity]
                          }
                        ]} 
                      />
                    </View>
                    <ThemedText style={styles.progressText}>
                      {achievement.progress}/{achievement.maxProgress}
                    </ThemedText>
                  </View>
                )}
              </View>

              <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[achievement.rarity] }]}>
                <ThemedText style={styles.rarityText}>{achievement.rarity}</ThemedText>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Achievement Detail Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedAchievement && (
              <>
                <View style={styles.modalTrophy}>
                  <Canvas camera={{ position: [0, 0, 2.5], fov: 50 }}>
                    <Suspense fallback={null}>
                      <Trophy3D rarity={selectedAchievement.rarity} unlocked={selectedAchievement.unlocked} />
                    </Suspense>
                  </Canvas>
                </View>

                <ThemedText style={styles.modalTitle}>
                  {selectedAchievement.secret && !selectedAchievement.unlocked ? '???' : selectedAchievement.name}
                </ThemedText>
                
                <View style={[styles.modalRarityBadge, { backgroundColor: RARITY_COLORS[selectedAchievement.rarity] }]}>
                  <ThemedText style={styles.modalRarityText}>{selectedAchievement.rarity.toUpperCase()}</ThemedText>
                </View>

                <ThemedText style={styles.modalDescription}>
                  {selectedAchievement.secret && !selectedAchievement.unlocked 
                    ? 'Completa azioni segrete per sbloccare questo achievement'
                    : selectedAchievement.description}
                </ThemedText>

                {!selectedAchievement.unlocked && (
                  <View style={styles.modalProgress}>
                    <View style={styles.modalProgressBar}>
                      <View 
                        style={[
                          styles.modalProgressFill, 
                          { 
                            width: `${(selectedAchievement.progress / selectedAchievement.maxProgress) * 100}%`,
                            backgroundColor: RARITY_COLORS[selectedAchievement.rarity]
                          }
                        ]} 
                      />
                    </View>
                    <ThemedText style={styles.modalProgressText}>
                      {selectedAchievement.progress} / {selectedAchievement.maxProgress}
                    </ThemedText>
                  </View>
                )}

                <View style={styles.rewardSection}>
                  <ThemedText style={styles.rewardTitle}>Ricompensa:</ThemedText>
                  <View style={styles.rewardBadge}>
                    <ThemedText style={styles.rewardIcon}>
                      {selectedAchievement.reward.type === 'coins' ? '💰' : selectedAchievement.reward.type === 'gems' ? '💎' : '🎁'}
                    </ThemedText>
                    <ThemedText style={styles.rewardText}>
                      {selectedAchievement.reward.name || `${selectedAchievement.reward.amount} ${selectedAchievement.reward.type}`}
                    </ThemedText>
                  </View>
                </View>

                {selectedAchievement.unlocked && selectedAchievement.unlockedAt && (
                  <ThemedText style={styles.unlockedDate}>
                    Sbloccato il {selectedAchievement.unlockedAt.toLocaleDateString()}
                  </ThemedText>
                )}

                <Pressable style={styles.closeButton} onPress={() => setShowModal(false)}>
                  <ThemedText style={styles.closeButtonText}>Chiudi</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  pointsBadge: { backgroundColor: 'rgba(255,215,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  pointsText: { color: '#ffd700', fontSize: 14, fontWeight: 'bold' },
  trophyPreview: { height: 150, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  statsBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20, borderRadius: 16, paddingVertical: 12, marginBottom: 10 },
  statItem: { alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  statLabel: { color: '#9ca3af', fontSize: 12 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },
  categoryFilter: { maxHeight: 44, paddingHorizontal: 15, marginBottom: 10 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8 },
  categoryChipActive: { backgroundColor: 'rgba(255,215,0,0.3)' },
  categoryChipText: { color: '#fff', fontSize: 13 },
  achievementsList: { flex: 1 },
  achievementsContent: { paddingHorizontal: 20 },
  achievementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14, marginBottom: 10 },
  achievementCardLocked: { opacity: 0.7 },
  achievementCardSecret: { backgroundColor: 'rgba(168,85,247,0.2)' },
  achievementIcon: { width: 54, height: 54, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  achievementIconText: { fontSize: 26 },
  unlockedBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  unlockedBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  achievementInfo: { flex: 1 },
  achievementName: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  achievementDescription: { color: '#9ca3af', fontSize: 12, marginBottom: 6 },
  progressContainer: { flexDirection: 'row', alignItems: 'center' },
  progressBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginRight: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { color: '#9ca3af', fontSize: 11 },
  rarityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rarityText: { color: '#fff', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#16213e', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center' },
  modalTrophy: { width: 150, height: 150, marginBottom: 16 },
  modalTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' },
  modalRarityBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginBottom: 12 },
  modalRarityText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  modalDescription: { color: '#9ca3af', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  modalProgress: { width: '100%', marginBottom: 16 },
  modalProgressBar: { height: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 5, marginBottom: 6 },
  modalProgressFill: { height: '100%', borderRadius: 5 },
  modalProgressText: { color: '#fff', fontSize: 14, textAlign: 'center' },
  rewardSection: { width: '100%', marginBottom: 16 },
  rewardTitle: { color: '#9ca3af', fontSize: 12, marginBottom: 8 },
  rewardBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,215,0,0.2)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  rewardIcon: { fontSize: 20, marginRight: 8 },
  rewardText: { color: '#ffd700', fontSize: 16, fontWeight: 'bold' },
  unlockedDate: { color: '#22c55e', fontSize: 12, marginBottom: 16 },
  closeButton: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40 },
  closeButtonText: { color: '#fff', fontSize: 16 },
});
