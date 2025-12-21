// @ts-nocheck
import React, { useState, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import Animated, { FadeIn, SlideInUp, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface PlantUpgrade {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'growth' | 'defense' | 'yield' | 'special';
  tier: number;
  maxTier: number;
  cost: { coins: number; materials: { name: string; icon: string; amount: number }[] };
  effects: string[];
  unlocked: boolean;
  equipped: boolean;
}

interface UpgradeMaterial {
  id: string;
  name: string;
  icon: string;
  quantity: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const UPGRADES: PlantUpgrade[] = [
  // Growth
  { id: 'fast_growth', name: 'Crescita Rapida', icon: '⚡', description: 'Accelera la crescita della pianta', category: 'growth', tier: 2, maxTier: 5, cost: { coins: 500, materials: [{ name: 'Cristallo Verde', icon: '💎', amount: 3 }] }, effects: ['+10% velocità crescita per tier', 'Riduce tempo tra stadi'], unlocked: true, equipped: true },
  { id: 'root_boost', name: 'Radici Potenziate', icon: '🌱', description: 'Radici più forti e resistenti', category: 'growth', tier: 1, maxTier: 5, cost: { coins: 300, materials: [{ name: 'Fertilizzante', icon: '🧪', amount: 5 }] }, effects: ['+5% assorbimento nutrienti', 'Resistenza siccità'], unlocked: true, equipped: false },
  { id: 'photosynthesis', name: 'Super Fotosintesi', icon: '☀️', description: 'Migliore utilizzo della luce', category: 'growth', tier: 0, maxTier: 3, cost: { coins: 800, materials: [{ name: 'Essenza Solare', icon: '🌟', amount: 2 }] }, effects: ['+15% efficienza luce', 'Bonus crescita diurna'], unlocked: false, equipped: false },
  
  // Defense
  { id: 'thick_leaves', name: 'Foglie Corazzate', icon: '🛡️', description: 'Foglie più resistenti ai parassiti', category: 'defense', tier: 3, maxTier: 5, cost: { coins: 400, materials: [{ name: 'Resina', icon: '🍯', amount: 4 }] }, effects: ['+20% resistenza parassiti', 'Riduce danno ricevuto'], unlocked: true, equipped: true },
  { id: 'toxic_sap', name: 'Linfa Tossica', icon: '☠️', description: 'La linfa danneggia i parassiti', category: 'defense', tier: 1, maxTier: 4, cost: { coins: 600, materials: [{ name: 'Veleno', icon: '🧫', amount: 3 }] }, effects: ['Danno passivo ai nemici', 'Effetto avvelenamento'], unlocked: true, equipped: false },
  { id: 'thorns', name: 'Spine Affilate', icon: '🌵', description: 'Spine che feriscono chi attacca', category: 'defense', tier: 0, maxTier: 3, cost: { coins: 1000, materials: [{ name: 'Spina Rara', icon: '📍', amount: 5 }] }, effects: ['Riflette 10% danno', 'Rallenta nemici'], unlocked: false, equipped: false },
  
  // Yield
  { id: 'mega_buds', name: 'Mega Cime', icon: '🌸', description: 'Cime più grandi e dense', category: 'yield', tier: 2, maxTier: 5, cost: { coins: 700, materials: [{ name: 'Ormone Crescita', icon: '💉', amount: 2 }] }, effects: ['+15% dimensione cime', '+10% THC'], unlocked: true, equipped: true },
  { id: 'multi_harvest', name: 'Raccolto Multiplo', icon: '🌾', description: 'Possibilità di raccolti extra', category: 'yield', tier: 1, maxTier: 3, cost: { coins: 1200, materials: [{ name: 'Semi Dorati', icon: '🌰', amount: 3 }] }, effects: ['20% chance raccolto doppio', 'Bonus materiali'], unlocked: true, equipped: false },
  { id: 'terpene_boost', name: 'Boost Terpeni', icon: '🍋', description: 'Aumenta la produzione di terpeni', category: 'yield', tier: 0, maxTier: 4, cost: { coins: 900, materials: [{ name: 'Estratto Aromatico', icon: '🧴', amount: 4 }] }, effects: ['+25% terpeni', 'Migliore qualità'], unlocked: false, equipped: false },
  
  // Special
  { id: 'mutation_gene', name: 'Gene Mutante', icon: '🧬', description: 'Aumenta probabilità mutazioni positive', category: 'special', tier: 1, maxTier: 3, cost: { coins: 1500, materials: [{ name: 'DNA Raro', icon: '🔬', amount: 1 }] }, effects: ['+30% mutazioni positive', 'Nuovi tratti possibili'], unlocked: true, equipped: false },
  { id: 'legendary_aura', name: 'Aura Leggendaria', icon: '✨', description: 'Bonus a tutte le statistiche', category: 'special', tier: 0, maxTier: 1, cost: { coins: 5000, materials: [{ name: 'Essenza Leggendaria', icon: '👑', amount: 1 }] }, effects: ['+10% a tutte le stat', 'Effetto visivo speciale'], unlocked: false, equipped: false },
  { id: 'auto_defense', name: 'Difesa Automatica', icon: '🤖', description: 'La pianta si difende da sola', category: 'special', tier: 0, maxTier: 2, cost: { coins: 2000, materials: [{ name: 'Chip AI', icon: '💾', amount: 2 }] }, effects: ['Attacco automatico', 'Targeting intelligente'], unlocked: false, equipped: false },
];

const MATERIALS: UpgradeMaterial[] = [
  { id: 'm1', name: 'Cristallo Verde', icon: '💎', quantity: 15, rarity: 'rare' },
  { id: 'm2', name: 'Fertilizzante', icon: '🧪', quantity: 42, rarity: 'common' },
  { id: 'm3', name: 'Resina', icon: '🍯', quantity: 28, rarity: 'common' },
  { id: 'm4', name: 'Veleno', icon: '🧫', quantity: 8, rarity: 'rare' },
  { id: 'm5', name: 'Ormone Crescita', icon: '💉', quantity: 5, rarity: 'epic' },
  { id: 'm6', name: 'Semi Dorati', icon: '🌰', quantity: 3, rarity: 'epic' },
  { id: 'm7', name: 'DNA Raro', icon: '🔬', quantity: 1, rarity: 'legendary' },
];

const CATEGORY_COLORS = {
  growth: '#22c55e',
  defense: '#3b82f6',
  yield: '#f59e0b',
  special: '#a855f7',
};

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

// 3D Upgrade Preview
function UpgradePreview3D({ category }: { category: string }) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#22c55e';
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 3]} intensity={1} color={color} />
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <mesh key={i} position={[
          Math.sin(i * 0.5) * 1.5,
          Math.cos(i * 0.3) * 1.5,
          Math.sin(i * 0.7) * 1.5
        ]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

export default function PlantUpgradesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [upgrades, setUpgrades] = useState(UPGRADES);
  const [materials] = useState(MATERIALS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedUpgrade, setSelectedUpgrade] = useState<PlantUpgrade | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [coins] = useState(15000);

  const filteredUpgrades = selectedCategory 
    ? upgrades.filter(u => u.category === selectedCategory)
    : upgrades;

  const equippedCount = upgrades.filter(u => u.equipped).length;
  const maxEquipped = 5;

  const canAfford = (upgrade: PlantUpgrade) => {
    if (coins < upgrade.cost.coins) return false;
    for (const mat of upgrade.cost.materials) {
      const owned = materials.find(m => m.name === mat.name);
      if (!owned || owned.quantity < mat.amount) return false;
    }
    return true;
  };

  const upgradeItem = (upgradeId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUpgrades(prev => prev.map(u => 
      u.id === upgradeId ? { ...u, tier: Math.min(u.tier + 1, u.maxTier) } : u
    ));
    setShowUpgradeModal(false);
  };

  const toggleEquip = (upgradeId: string) => {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade) return;

    if (!upgrade.equipped && equippedCount >= maxEquipped) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setUpgrades(prev => prev.map(u => 
      u.id === upgradeId ? { ...u, equipped: !u.equipped } : u
    ));
  };

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Indietro</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>⬆️ Potenziamenti</ThemedText>
        <View style={styles.coinsBadge}>
          <ThemedText style={styles.coinsText}>💰 {coins.toLocaleString()}</ThemedText>
        </View>
      </View>

      {/* 3D Preview */}
      <View style={styles.preview3D}>
        <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
          <Suspense fallback={null}>
            <UpgradePreview3D category={selectedCategory || 'growth'} />
          </Suspense>
        </Canvas>
      </View>

      {/* Equipped Slots */}
      <View style={styles.equippedSection}>
        <ThemedText style={styles.sectionTitle}>Equipaggiati ({equippedCount}/{maxEquipped})</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.equippedSlots}>
          {upgrades.filter(u => u.equipped).map(upgrade => (
            <Pressable 
              key={upgrade.id} 
              style={[styles.equippedSlot, { borderColor: CATEGORY_COLORS[upgrade.category] }]}
              onPress={() => toggleEquip(upgrade.id)}
            >
              <ThemedText style={styles.equippedIcon}>{upgrade.icon}</ThemedText>
              <ThemedText style={styles.equippedTier}>T{upgrade.tier}</ThemedText>
            </Pressable>
          ))}
          {Array.from({ length: maxEquipped - equippedCount }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.emptySlot}>
              <ThemedText style={styles.emptySlotText}>+</ThemedText>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
        <Pressable
          style={[styles.categoryChip, !selectedCategory && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
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
            onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
          >
            <ThemedText style={[styles.categoryChipText, selectedCategory === cat && { color }]}>
              {cat === 'growth' ? '🌱 Crescita' : cat === 'defense' ? '🛡️ Difesa' : cat === 'yield' ? '🌾 Resa' : '✨ Speciali'}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Upgrades List */}
      <ScrollView 
        style={styles.upgradesList}
        contentContainerStyle={[styles.upgradesContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
      >
        {filteredUpgrades.map((upgrade, index) => (
          <Animated.View key={upgrade.id} entering={SlideInUp.delay(index * 50)}>
            <Pressable 
              style={[
                styles.upgradeCard,
                !upgrade.unlocked && styles.upgradeCardLocked,
                upgrade.equipped && styles.upgradeCardEquipped
              ]}
              onPress={() => {
                if (upgrade.unlocked) {
                  setSelectedUpgrade(upgrade);
                  setShowUpgradeModal(true);
                }
              }}
            >
              <View style={[styles.upgradeIcon, { backgroundColor: CATEGORY_COLORS[upgrade.category] + '30' }]}>
                <ThemedText style={styles.upgradeIconText}>{upgrade.icon}</ThemedText>
                {upgrade.equipped && <View style={styles.equippedBadge}><ThemedText style={styles.equippedBadgeText}>✓</ThemedText></View>}
              </View>
              
              <View style={styles.upgradeInfo}>
                <ThemedText style={styles.upgradeName}>{upgrade.name}</ThemedText>
                <ThemedText style={styles.upgradeDescription}>{upgrade.description}</ThemedText>
                
                {/* Tier Progress */}
                <View style={styles.tierProgress}>
                  {Array.from({ length: upgrade.maxTier }).map((_, i) => (
                    <View 
                      key={i} 
                      style={[
                        styles.tierDot,
                        i < upgrade.tier && { backgroundColor: CATEGORY_COLORS[upgrade.category] }
                      ]} 
                    />
                  ))}
                  <ThemedText style={styles.tierText}>Tier {upgrade.tier}/{upgrade.maxTier}</ThemedText>
                </View>
              </View>

              {!upgrade.unlocked && (
                <View style={styles.lockedOverlay}>
                  <ThemedText style={styles.lockedText}>🔒</ThemedText>
                </View>
              )}
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Materials Bar */}
      <View style={[styles.materialsBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {materials.map(mat => (
            <View key={mat.id} style={[styles.materialBadge, { borderColor: RARITY_COLORS[mat.rarity] }]}>
              <ThemedText style={styles.materialIcon}>{mat.icon}</ThemedText>
              <ThemedText style={styles.materialQuantity}>{mat.quantity}</ThemedText>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Upgrade Modal */}
      <Modal visible={showUpgradeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedUpgrade && (
              <>
                <View style={[styles.modalIcon, { backgroundColor: CATEGORY_COLORS[selectedUpgrade.category] + '30' }]}>
                  <ThemedText style={styles.modalIconText}>{selectedUpgrade.icon}</ThemedText>
                </View>
                <ThemedText style={styles.modalTitle}>{selectedUpgrade.name}</ThemedText>
                <ThemedText style={styles.modalDescription}>{selectedUpgrade.description}</ThemedText>

                <View style={styles.modalEffects}>
                  <ThemedText style={styles.effectsTitle}>Effetti:</ThemedText>
                  {selectedUpgrade.effects.map((effect, i) => (
                    <ThemedText key={i} style={styles.effectText}>• {effect}</ThemedText>
                  ))}
                </View>

                <View style={styles.modalCost}>
                  <ThemedText style={styles.costTitle}>Costo Potenziamento:</ThemedText>
                  <View style={styles.costRow}>
                    <ThemedText style={styles.costItem}>💰 {selectedUpgrade.cost.coins}</ThemedText>
                    {selectedUpgrade.cost.materials.map((mat, i) => (
                      <ThemedText key={i} style={styles.costItem}>{mat.icon} {mat.amount}</ThemedText>
                    ))}
                  </View>
                </View>

                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelButton} onPress={() => setShowUpgradeModal(false)}>
                    <ThemedText style={styles.cancelButtonText}>Chiudi</ThemedText>
                  </Pressable>
                  {selectedUpgrade.tier < selectedUpgrade.maxTier && (
                    <Pressable 
                      style={[styles.upgradeButton, !canAfford(selectedUpgrade) && styles.upgradeButtonDisabled]}
                      onPress={() => canAfford(selectedUpgrade) && upgradeItem(selectedUpgrade.id)}
                    >
                      <ThemedText style={styles.upgradeButtonText}>Potenzia</ThemedText>
                    </Pressable>
                  )}
                  <Pressable 
                    style={[styles.equipButton, selectedUpgrade.equipped && styles.unequipButton]}
                    onPress={() => {
                      toggleEquip(selectedUpgrade.id);
                      setShowUpgradeModal(false);
                    }}
                  >
                    <ThemedText style={styles.equipButtonText}>
                      {selectedUpgrade.equipped ? 'Rimuovi' : 'Equipaggia'}
                    </ThemedText>
                  </Pressable>
                </View>
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
  coinsBadge: { backgroundColor: 'rgba(245,158,11,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  coinsText: { color: '#f59e0b', fontSize: 14, fontWeight: 'bold' },
  preview3D: { height: 120, marginHorizontal: 20, borderRadius: 16, overflow: 'hidden', marginBottom: 10 },
  equippedSection: { paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  equippedSlots: { flexDirection: 'row' },
  equippedSlot: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  equippedIcon: { fontSize: 24 },
  equippedTier: { position: 'absolute', bottom: 2, right: 2, color: '#fff', fontSize: 10, fontWeight: 'bold' },
  emptySlot: { width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  emptySlotText: { color: 'rgba(255,255,255,0.3)', fontSize: 24 },
  categoryFilter: { maxHeight: 44, paddingHorizontal: 15, marginBottom: 10 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  categoryChipActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  categoryChipText: { color: '#fff', fontSize: 13 },
  upgradesList: { flex: 1 },
  upgradesContent: { paddingHorizontal: 20 },
  upgradeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 10 },
  upgradeCardLocked: { opacity: 0.5 },
  upgradeCardEquipped: { borderWidth: 2, borderColor: '#22c55e' },
  upgradeIcon: { width: 56, height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  upgradeIconText: { fontSize: 28 },
  equippedBadge: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
  equippedBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  upgradeInfo: { flex: 1 },
  upgradeName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  upgradeDescription: { color: '#9ca3af', fontSize: 12, marginBottom: 8 },
  tierProgress: { flexDirection: 'row', alignItems: 'center' },
  tierDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)', marginRight: 4 },
  tierText: { color: '#9ca3af', fontSize: 11, marginLeft: 8 },
  lockedOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  lockedText: { fontSize: 32 },
  materialsBar: { backgroundColor: 'rgba(0,0,0,0.3)', paddingVertical: 10, paddingHorizontal: 20 },
  materialBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, borderWidth: 1 },
  materialIcon: { fontSize: 16, marginRight: 4 },
  materialQuantity: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#166534', borderRadius: 24, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' },
  modalIcon: { width: 80, height: 80, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalIconText: { fontSize: 40 },
  modalTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  modalDescription: { color: '#a7f3d0', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  modalEffects: { width: '100%', marginBottom: 16 },
  effectsTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  effectText: { color: '#a7f3d0', fontSize: 13, marginBottom: 4 },
  modalCost: { width: '100%', marginBottom: 20 },
  costTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  costRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  costItem: { color: '#f59e0b', fontSize: 14, backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%' },
  cancelButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 14 },
  upgradeButton: { flex: 1, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  upgradeButtonDisabled: { backgroundColor: '#6b7280' },
  upgradeButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  equipButton: { flex: 1, backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  unequipButton: { backgroundColor: '#ef4444' },
  equipButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
