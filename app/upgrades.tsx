import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';

interface Upgrade {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'plant' | 'spray' | 'defense' | 'economy';
  level: number;
  maxLevel: number;
  cost: number;
  effect: string;
}

const UPGRADES: Upgrade[] = [
  { id: 'plant_health', name: 'Salute Pianta', description: 'Aumenta la salute massima della pianta', icon: '❤️', category: 'plant', level: 3, maxLevel: 10, cost: 500, effect: '+10% salute' },
  { id: 'plant_regen', name: 'Rigenerazione', description: 'La pianta rigenera salute nel tempo', icon: '💚', category: 'plant', level: 1, maxLevel: 5, cost: 800, effect: '+1 HP/sec' },
  { id: 'spray_damage', name: 'Potenza Spray', description: 'Aumenta il danno dello spray', icon: '💪', category: 'spray', level: 5, maxLevel: 10, cost: 400, effect: '+15% danno' },
  { id: 'spray_capacity', name: 'Capacità Spray', description: 'Aumenta le munizioni massime', icon: '🔋', category: 'spray', level: 2, maxLevel: 10, cost: 350, effect: '+20 munizioni' },
  { id: 'spray_speed', name: 'Velocità Spray', description: 'Ricarica più veloce dello spray', icon: '⚡', category: 'spray', level: 0, maxLevel: 5, cost: 600, effect: '-10% tempo ricarica' },
  { id: 'shield', name: 'Scudo Protettivo', description: 'Chance di bloccare danni', icon: '🛡️', category: 'defense', level: 1, maxLevel: 5, cost: 1000, effect: '+5% chance blocco' },
  { id: 'thorns', name: 'Spine Difensive', description: 'I parassiti subiscono danni al contatto', icon: '🌵', category: 'defense', level: 0, maxLevel: 5, cost: 750, effect: '+5 danno riflesso' },
  { id: 'coin_bonus', name: 'Bonus Monete', description: 'Guadagna più monete', icon: '🪙', category: 'economy', level: 2, maxLevel: 10, cost: 300, effect: '+10% monete' },
  { id: 'xp_bonus', name: 'Bonus XP', description: 'Guadagna più esperienza', icon: '⭐', category: 'economy', level: 1, maxLevel: 10, cost: 450, effect: '+10% XP' },
];

const CATEGORY_COLORS = {
  plant: '#22c55e',
  spray: '#3b82f6',
  defense: '#a855f7',
  economy: '#f59e0b',
};

export default function UpgradesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [upgrades, setUpgrades] = useState<Upgrade[]>(UPGRADES);
  const [coins, setCoins] = useState(5000);
  const [activeCategory, setActiveCategory] = useState<'all' | 'plant' | 'spray' | 'defense' | 'economy'>('all');

  const filteredUpgrades = activeCategory === 'all'
    ? upgrades
    : upgrades.filter(u => u.category === activeCategory);

  const handleUpgrade = async (upgradeId: string) => {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (!upgrade || upgrade.level >= upgrade.maxLevel || coins < upgrade.cost) return;

    setCoins(prev => prev - upgrade.cost);
    setUpgrades(prev => prev.map(u =>
      u.id === upgradeId
        ? { ...u, level: u.level + 1, cost: Math.floor(u.cost * 1.5) }
        : u
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
          <View style={styles.coinsDisplay}>
            <ThemedText style={styles.coinsIcon}>🪙</ThemedText>
            <ThemedText style={styles.coinsText}>{coins.toLocaleString()}</ThemedText>
          </View>
        </View>

        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
        />

        <ThemedText style={styles.title}>Potenziamenti</ThemedText>
        <ThemedText style={styles.subtitle}>Migliora le tue abilità</ThemedText>

        {/* Category Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          <View style={styles.categoryContainer}>
            {(['all', 'plant', 'spray', 'defense', 'economy'] as const).map((cat) => (
              <Pressable
                key={cat}
                style={[styles.categoryTab, activeCategory === cat && styles.activeCategoryTab]}
                onPress={() => setActiveCategory(cat)}
              >
                <ThemedText style={[styles.categoryText, activeCategory === cat && styles.activeCategoryText]}>
                  {cat === 'all' ? 'Tutti' : cat === 'plant' ? '🌿 Pianta' : cat === 'spray' ? '💧 Spray' : cat === 'defense' ? '🛡️ Difesa' : '💰 Economia'}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {/* Upgrades List */}
        <View style={styles.upgradesList}>
          {filteredUpgrades.map((upgrade) => (
            <View key={upgrade.id} style={[styles.upgradeCard, { borderLeftColor: CATEGORY_COLORS[upgrade.category] }]}>
              <View style={styles.upgradeHeader}>
                <ThemedText style={styles.upgradeIcon}>{upgrade.icon}</ThemedText>
                <View style={styles.upgradeInfo}>
                  <ThemedText style={styles.upgradeName}>{upgrade.name}</ThemedText>
                  <ThemedText style={styles.upgradeDesc}>{upgrade.description}</ThemedText>
                </View>
              </View>

              {/* Level Progress */}
              <View style={styles.levelContainer}>
                <View style={styles.levelBar}>
                  {Array.from({ length: upgrade.maxLevel }).map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.levelSegment,
                        i < upgrade.level && { backgroundColor: CATEGORY_COLORS[upgrade.category] }
                      ]}
                    />
                  ))}
                </View>
                <ThemedText style={styles.levelText}>
                  Lv. {upgrade.level}/{upgrade.maxLevel}
                </ThemedText>
              </View>

              {/* Effect & Upgrade Button */}
              <View style={styles.upgradeFooter}>
                <View style={styles.effectContainer}>
                  <ThemedText style={styles.effectLabel}>Prossimo:</ThemedText>
                  <ThemedText style={styles.effectText}>{upgrade.effect}</ThemedText>
                </View>
                {upgrade.level < upgrade.maxLevel ? (
                  <Pressable
                    style={[styles.upgradeButton, coins < upgrade.cost && styles.upgradeButtonDisabled]}
                    onPress={() => handleUpgrade(upgrade.id)}
                    disabled={coins < upgrade.cost}
                  >
                    <ThemedText style={styles.upgradeButtonText}>🪙 {upgrade.cost}</ThemedText>
                  </Pressable>
                ) : (
                  <ThemedText style={styles.maxedText}>MAX</ThemedText>
                )}
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
  coinsDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  coinsIcon: { fontSize: 20, marginRight: 4 },
  coinsText: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold' },
  logo: { width: 200, height: 80, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a7f3d0', textAlign: 'center', marginBottom: 24 },
  categoryScroll: { marginBottom: 20 },
  categoryContainer: { flexDirection: 'row', gap: 8 },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 20 },
  activeCategoryTab: { backgroundColor: '#22c55e' },
  categoryText: { color: '#a7f3d0', fontSize: 14, fontWeight: '600' },
  activeCategoryText: { color: '#fff' },
  upgradesList: { gap: 12 },
  upgradeCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16, borderLeftWidth: 4 },
  upgradeHeader: { flexDirection: 'row', marginBottom: 12 },
  upgradeIcon: { fontSize: 36, marginRight: 12 },
  upgradeInfo: { flex: 1 },
  upgradeName: { fontSize: 18, fontWeight: 'bold', color: '#166534' },
  upgradeDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  levelContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  levelBar: { flex: 1, flexDirection: 'row', gap: 2, marginRight: 8 },
  levelSegment: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4 },
  levelText: { fontSize: 12, color: '#6b7280', fontWeight: 'bold' },
  upgradeFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  effectContainer: { flexDirection: 'row', alignItems: 'center' },
  effectLabel: { fontSize: 12, color: '#6b7280', marginRight: 4 },
  effectText: { fontSize: 14, color: '#166534', fontWeight: 'bold' },
  upgradeButton: { backgroundColor: '#22c55e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  upgradeButtonDisabled: { backgroundColor: '#9ca3af' },
  upgradeButtonText: { color: '#fff', fontWeight: 'bold' },
  maxedText: { color: '#22c55e', fontWeight: 'bold', fontSize: 16 },
});
