import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';

interface GrowingSlot {
  id: string;
  plant: { name: string; icon: string; stage: number; maxStage: number; timeLeft: number } | null;
  unlocked: boolean;
}

const INITIAL_SLOTS: GrowingSlot[] = [
  { id: '1', plant: { name: 'Cannabis Classica', icon: '🌿', stage: 3, maxStage: 5, timeLeft: 3600 }, unlocked: true },
  { id: '2', plant: { name: 'Purple Haze', icon: '💜', stage: 1, maxStage: 5, timeLeft: 7200 }, unlocked: true },
  { id: '3', plant: null, unlocked: true },
  { id: '4', plant: null, unlocked: false },
  { id: '5', plant: null, unlocked: false },
  { id: '6', plant: null, unlocked: false },
];

const SEEDS = [
  { id: 'classic', name: 'Seme Classico', icon: '🌱', growTime: '2h', rarity: 'common' },
  { id: 'purple', name: 'Seme Purple', icon: '💜', growTime: '4h', rarity: 'rare' },
  { id: 'golden', name: 'Seme Dorato', icon: '✨', growTime: '6h', rarity: 'epic' },
];

export default function GrowingLabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [slots, setSlots] = useState<GrowingSlot[]>(INITIAL_SLOTS);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getStageEmoji = (stage: number, maxStage: number) => {
    const progress = stage / maxStage;
    if (progress < 0.25) return '🌱';
    if (progress < 0.5) return '🌿';
    if (progress < 0.75) return '🪴';
    if (progress < 1) return '🌳';
    return '🌲';
  };

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        </View>

        <ThemedText style={styles.title}>Growing Lab</ThemedText>
        <ThemedText style={styles.subtitle}>Coltiva le tue piante</ThemedText>

        {/* Growing Slots */}
        <View style={styles.slotsGrid}>
          {slots.map((slot) => (
            <Pressable
              key={slot.id}
              style={[styles.slotCard, !slot.unlocked && styles.lockedSlot, selectedSlot === slot.id && styles.selectedSlot]}
              onPress={() => slot.unlocked && setSelectedSlot(slot.id)}
            >
              {!slot.unlocked ? (
                <>
                  <ThemedText style={styles.lockIcon}>🔒</ThemedText>
                  <ThemedText style={styles.unlockText}>500 🪙</ThemedText>
                </>
              ) : slot.plant ? (
                <>
                  <ThemedText style={styles.plantEmoji}>{getStageEmoji(slot.plant.stage, slot.plant.maxStage)}</ThemedText>
                  <ThemedText style={styles.plantName}>{slot.plant.name}</ThemedText>
                  <View style={styles.stageBar}>
                    {Array.from({ length: slot.plant.maxStage }).map((_, i) => (
                      <View key={i} style={[styles.stageSegment, i < slot.plant!.stage && styles.stageActive]} />
                    ))}
                  </View>
                  <ThemedText style={styles.timeLeft}>⏱️ {formatTime(slot.plant.timeLeft)}</ThemedText>
                </>
              ) : (
                <>
                  <ThemedText style={styles.emptyIcon}>➕</ThemedText>
                  <ThemedText style={styles.emptyText}>Vuoto</ThemedText>
                </>
              )}
            </Pressable>
          ))}
        </View>

        {/* Seeds Section */}
        <ThemedText style={styles.sectionTitle}>Semi Disponibili</ThemedText>
        <View style={styles.seedsList}>
          {SEEDS.map((seed) => (
            <View key={seed.id} style={styles.seedCard}>
              <ThemedText style={styles.seedIcon}>{seed.icon}</ThemedText>
              <View style={styles.seedInfo}>
                <ThemedText style={styles.seedName}>{seed.name}</ThemedText>
                <ThemedText style={styles.seedTime}>Tempo: {seed.growTime}</ThemedText>
              </View>
              <Pressable style={styles.plantButton}>
                <ThemedText style={styles.plantButtonText}>Pianta</ThemedText>
              </Pressable>
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
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
  slotCard: { width: (Dimensions.get('window').width - 64) / 3, aspectRatio: 1, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 8, alignItems: 'center', justifyContent: 'center' },
  lockedSlot: { backgroundColor: 'rgba(0,0,0,0.3)' },
  selectedSlot: { borderWidth: 3, borderColor: '#22c55e' },
  lockIcon: { fontSize: 24 },
  unlockText: { fontSize: 10, color: '#fff', marginTop: 4 },
  plantEmoji: { fontSize: 32 },
  plantName: { fontSize: 10, color: '#166534', textAlign: 'center', marginTop: 4 },
  stageBar: { flexDirection: 'row', gap: 2, marginTop: 4 },
  stageSegment: { width: 12, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2 },
  stageActive: { backgroundColor: '#22c55e' },
  timeLeft: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  emptyIcon: { fontSize: 24, color: '#9ca3af' },
  emptyText: { fontSize: 10, color: '#9ca3af' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  seedsList: { gap: 12 },
  seedCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 12 },
  seedIcon: { fontSize: 32, marginRight: 12 },
  seedInfo: { flex: 1 },
  seedName: { fontSize: 16, fontWeight: 'bold', color: '#166534' },
  seedTime: { fontSize: 12, color: '#6b7280' },
  plantButton: { backgroundColor: '#22c55e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  plantButtonText: { color: '#fff', fontWeight: 'bold' },
});
