import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';

interface PlantVariety {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  traits: string[];
  unlocked: boolean;
}

const PLANT_VARIETIES: PlantVariety[] = [
  { id: 'classic', name: 'Cannabis Classica', icon: '🌿', rarity: 'common', traits: ['Resistenza Base', 'Crescita Normale'], unlocked: true },
  { id: 'purple', name: 'Purple Haze', icon: '💜', rarity: 'rare', traits: ['Alta Resistenza', 'Crescita Lenta', 'Bonus XP'], unlocked: true },
  { id: 'golden', name: 'Golden Leaf', icon: '✨', rarity: 'epic', traits: ['Bonus Monete', 'Crescita Veloce', 'Attira Power-up'], unlocked: false },
  { id: 'crystal', name: 'Crystal Kush', icon: '💎', rarity: 'legendary', traits: ['Immunità Temporanea', 'Rigenerazione', 'Aura Protettiva'], unlocked: false },
];

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

export default function BreedingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedParent1, setSelectedParent1] = useState<PlantVariety | null>(null);
  const [selectedParent2, setSelectedParent2] = useState<PlantVariety | null>(null);
  const [isBreeding, setIsBreeding] = useState(false);
  const [breedingProgress, setBreedingProgress] = useState(0);

  const unlockedVarieties = PLANT_VARIETIES.filter(v => v.unlocked);

  const handleBreed = () => {
    if (!selectedParent1 || !selectedParent2) return;
    
    setIsBreeding(true);
    setBreedingProgress(0);
    
    const interval = setInterval(() => {
      setBreedingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBreeding(false);
          // TODO: Generate new plant variety
          return 100;
        }
        return prev + 5;
      });
    }, 100);
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

        <ThemedText style={styles.title}>Breeding Lab</ThemedText>
        <ThemedText style={styles.subtitle}>Crea nuove varietà di piante</ThemedText>

        {/* Breeding Station */}
        <View style={styles.breedingStation}>
          <View style={styles.parentSlots}>
            {/* Parent 1 */}
            <Pressable
              style={[styles.parentSlot, selectedParent1 && styles.parentSlotFilled]}
              onPress={() => setSelectedParent1(null)}
            >
              {selectedParent1 ? (
                <>
                  <ThemedText style={styles.parentIcon}>{selectedParent1.icon}</ThemedText>
                  <ThemedText style={styles.parentName}>{selectedParent1.name}</ThemedText>
                </>
              ) : (
                <ThemedText style={styles.emptySlot}>Genitore 1</ThemedText>
              )}
            </Pressable>

            <ThemedText style={styles.plusSign}>+</ThemedText>

            {/* Parent 2 */}
            <Pressable
              style={[styles.parentSlot, selectedParent2 && styles.parentSlotFilled]}
              onPress={() => setSelectedParent2(null)}
            >
              {selectedParent2 ? (
                <>
                  <ThemedText style={styles.parentIcon}>{selectedParent2.icon}</ThemedText>
                  <ThemedText style={styles.parentName}>{selectedParent2.name}</ThemedText>
                </>
              ) : (
                <ThemedText style={styles.emptySlot}>Genitore 2</ThemedText>
              )}
            </Pressable>
          </View>

          {/* Breed Button */}
          <Pressable
            style={[
              styles.breedButton,
              (!selectedParent1 || !selectedParent2 || isBreeding) && styles.breedButtonDisabled
            ]}
            onPress={handleBreed}
            disabled={!selectedParent1 || !selectedParent2 || isBreeding}
          >
            {isBreeding ? (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${breedingProgress}%` }]} />
                <ThemedText style={styles.breedButtonText}>{breedingProgress}%</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.breedButtonText}>Inizia Breeding</ThemedText>
            )}
          </Pressable>
        </View>

        {/* Available Varieties */}
        <ThemedText style={styles.sectionTitle}>Varietà Disponibili</ThemedText>
        <View style={styles.varietiesGrid}>
          {PLANT_VARIETIES.map((variety) => (
            <Pressable
              key={variety.id}
              style={[
                styles.varietyCard,
                !variety.unlocked && styles.lockedCard,
                { borderColor: RARITY_COLORS[variety.rarity] }
              ]}
              onPress={() => {
                if (!variety.unlocked) return;
                if (!selectedParent1) {
                  setSelectedParent1(variety);
                } else if (!selectedParent2 && variety.id !== selectedParent1.id) {
                  setSelectedParent2(variety);
                }
              }}
            >
              <ThemedText style={styles.varietyIcon}>{variety.icon}</ThemedText>
              <ThemedText style={styles.varietyName}>{variety.name}</ThemedText>
              <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[variety.rarity] }]}>
                <ThemedText style={styles.rarityText}>{variety.rarity.toUpperCase()}</ThemedText>
              </View>
              {!variety.unlocked && (
                <View style={styles.lockOverlay}>
                  <ThemedText style={styles.lockIcon}>🔒</ThemedText>
                </View>
              )}
            </Pressable>
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
  breedingStation: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 20, marginBottom: 24 },
  parentSlots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  parentSlot: { width: 100, height: 100, backgroundColor: '#f3f4f6', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  parentSlotFilled: { borderStyle: 'solid', borderColor: '#22c55e', backgroundColor: '#dcfce7' },
  parentIcon: { fontSize: 40 },
  parentName: { fontSize: 10, color: '#166534', textAlign: 'center', marginTop: 4 },
  emptySlot: { color: '#9ca3af', fontSize: 12 },
  plusSign: { fontSize: 32, color: '#166534', marginHorizontal: 16 },
  breedButton: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center', overflow: 'hidden' },
  breedButtonDisabled: { backgroundColor: '#9ca3af' },
  breedButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  progressContainer: { width: '100%', height: 24, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#16a34a', borderRadius: 12 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  varietiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  varietyCard: { width: (Dimensions.get('window').width - 52) / 2, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 3 },
  lockedCard: { opacity: 0.6 },
  varietyIcon: { fontSize: 48, marginBottom: 8 },
  varietyName: { fontSize: 14, fontWeight: 'bold', color: '#166534', textAlign: 'center' },
  rarityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  rarityText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  lockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  lockIcon: { fontSize: 32 },
});
