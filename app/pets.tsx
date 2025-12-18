import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePets, Pet, OwnedPet, PetRarity, PetElement } from '@/hooks/use-pets';
import { useSounds } from '@/hooks/use-sounds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RARITY_COLORS: Record<PetRarity, string> = { common: '#9ca3af', rare: '#3b82f6', epic: '#a855f7', legendary: '#fbbf24', mythic: '#ef4444' };
const ELEMENT_COLORS: Record<PetElement, string> = { nature: '#22c55e', fire: '#ef4444', water: '#3b82f6', earth: '#a16207', void: '#7c3aed' };
const ELEMENT_ICONS: Record<PetElement, string> = { nature: '🌿', fire: '🔥', water: '💧', earth: '🪨', void: '🌀' };

function PetCard({ pet, owned, isActive, onPress }: { pet: Pet; owned?: OwnedPet; isActive: boolean; onPress: () => void }) {
  const bounce = useSharedValue(0);
  React.useEffect(() => { if (isActive) bounce.value = withRepeat(withTiming(10, { duration: 500 }), -1, true); else bounce.value = 0; }, [isActive]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -bounce.value }] }));
  return (
    <Pressable onPress={onPress} style={[styles.petCard, { borderColor: RARITY_COLORS[pet.rarity] }, isActive && styles.petCardActive]}>
      <Animated.View style={animatedStyle}><ThemedText style={styles.petIcon}>{pet.icon}</ThemedText></Animated.View>
      <ThemedText style={styles.petName} numberOfLines={1}>{pet.name}</ThemedText>
      {owned && <ThemedText style={styles.petLevel}>Lv.{owned.level}</ThemedText>}
      {!owned && <ThemedText style={styles.petLocked}>🔒</ThemedText>}
      <View style={[styles.elementBadge, { backgroundColor: ELEMENT_COLORS[pet.element] }]}><ThemedText style={styles.elementIcon}>{ELEMENT_ICONS[pet.element]}</ThemedText></View>
    </Pressable>
  );
}

function PetDetailModal({ pet, owned, onClose, onFeed, onSetActive, onEvolve, canEvolve }: { pet: Pet; owned?: OwnedPet; onClose: () => void; onFeed: () => void; onSetActive: () => void; onEvolve: () => void; canEvolve: boolean }) {
  const xpProgress = owned ? (owned.xp / (owned.level * 500)) * 100 : 0;
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { backgroundColor: RARITY_COLORS[pet.rarity] }]}>
            <ThemedText style={styles.modalIcon}>{pet.icon}</ThemedText>
            <ThemedText style={styles.modalName}>{owned?.nickname || pet.name}</ThemedText>
            <View style={styles.modalBadges}>
              <View style={[styles.badge, { backgroundColor: ELEMENT_COLORS[pet.element] }]}><ThemedText style={styles.badgeText}>{ELEMENT_ICONS[pet.element]} {pet.element}</ThemedText></View>
              <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.3)' }]}><ThemedText style={styles.badgeText}>{pet.rarity}</ThemedText></View>
            </View>
          </View>
          <View style={styles.modalBody}>
            <ThemedText style={styles.description}>{pet.description}</ThemedText>
            {owned && (
              <>
                <View style={styles.levelSection}>
                  <ThemedText style={styles.levelText}>Livello {owned.level}</ThemedText>
                  <View style={styles.xpBar}><View style={[styles.xpFill, { width: `${xpProgress}%` }]} /></View>
                  <ThemedText style={styles.xpText}>{owned.xp}/{owned.level * 500} XP</ThemedText>
                </View>
                <View style={styles.happinessSection}>
                  <ThemedText style={styles.happinessLabel}>Felicità</ThemedText>
                  <View style={styles.happinessBar}><View style={[styles.happinessFill, { width: `${owned.happiness}%`, backgroundColor: owned.happiness > 50 ? '#22c55e' : owned.happiness > 25 ? '#fbbf24' : '#ef4444' }]} /></View>
                  <ThemedText style={styles.happinessText}>{owned.happiness}%</ThemedText>
                </View>
                <View style={styles.statsGrid}>
                  <View style={styles.statItem}><ThemedText style={styles.statValue}>{owned.stats.health}</ThemedText><ThemedText style={styles.statLabel}>❤️ HP</ThemedText></View>
                  <View style={styles.statItem}><ThemedText style={styles.statValue}>{owned.stats.attack}</ThemedText><ThemedText style={styles.statLabel}>⚔️ ATK</ThemedText></View>
                  <View style={styles.statItem}><ThemedText style={styles.statValue}>{owned.stats.defense}</ThemedText><ThemedText style={styles.statLabel}>🛡️ DEF</ThemedText></View>
                  <View style={styles.statItem}><ThemedText style={styles.statValue}>{owned.stats.speed}</ThemedText><ThemedText style={styles.statLabel}>💨 SPD</ThemedText></View>
                </View>
              </>
            )}
            <View style={styles.abilitiesSection}>
              <ThemedText style={styles.abilitiesTitle}>Abilità</ThemedText>
              {pet.abilities.map(ability => (<View key={ability.id} style={styles.abilityItem}><ThemedText style={styles.abilityIcon}>{ability.icon}</ThemedText><View style={styles.abilityInfo}><ThemedText style={styles.abilityName}>{ability.name}</ThemedText><ThemedText style={styles.abilityDesc}>{ability.description}</ThemedText></View><ThemedText style={styles.abilityCooldown}>{ability.cooldown}s</ThemedText></View>))}
            </View>
          </View>
          <View style={styles.modalActions}>
            {owned && (<><Pressable onPress={onFeed} style={styles.actionButton}><ThemedText style={styles.actionText}>🍖 Nutri</ThemedText></Pressable><Pressable onPress={onSetActive} style={[styles.actionButton, owned.isActive && styles.actionButtonActive]}><ThemedText style={styles.actionText}>{owned.isActive ? '✓ Attivo' : '⭐ Attiva'}</ThemedText></Pressable>{canEvolve && <Pressable onPress={onEvolve} style={[styles.actionButton, styles.evolveButton]}><ThemedText style={styles.actionText}>✨ Evolvi</ThemedText></Pressable>}</>)}
            <Pressable onPress={onClose} style={styles.closeButton}><ThemedText style={styles.closeText}>Chiudi</ThemedText></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function PetsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  const { state, allPets, getPetById, getOwnedPet, setActivePet, feedPet, evolvePet } = usePets();
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [filter, setFilter] = useState<PetElement | 'all'>('all');
  
  const filteredPets = filter === 'all' ? allPets : allPets.filter(p => p.element === filter);
  const handlePetPress = useCallback((pet: Pet) => { setSelectedPet(pet); play('ui_tap_1' as any); }, [play]);
  const handleFeed = useCallback(() => { if (selectedPet) { feedPet(selectedPet.id); play('shop_buy' as any); } }, [selectedPet, feedPet, play]);
  const handleSetActive = useCallback(() => { if (selectedPet) { const owned = getOwnedPet(selectedPet.id); setActivePet(owned?.isActive ? null : selectedPet.id); play('ui_success' as any); } }, [selectedPet, getOwnedPet, setActivePet, play]);
  const handleEvolve = useCallback(() => { if (selectedPet) { evolvePet(selectedPet.id); play('breed_complete' as any); setSelectedPet(null); } }, [selectedPet, evolvePet, play]);
  const canEvolve = useCallback((pet: Pet) => { const owned = getOwnedPet(pet.id); return !!owned && !!pet.evolutionId && !!pet.evolutionLevel && owned.level >= pet.evolutionLevel; }, [getOwnedPet]);
  
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><ThemedText style={styles.backText}>←</ThemedText></Pressable>
        <ThemedText style={styles.title}>I Miei Pet</ThemedText>
        <View style={styles.foodBadge}><ThemedText style={styles.foodText}>🍖 {state.petFood}</ThemedText></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <Pressable onPress={() => setFilter('all')} style={[styles.filterButton, filter === 'all' && styles.filterActive]}><ThemedText style={styles.filterText}>Tutti</ThemedText></Pressable>
        {(['nature', 'fire', 'water', 'earth', 'void'] as PetElement[]).map(el => (<Pressable key={el} onPress={() => setFilter(el)} style={[styles.filterButton, filter === el && styles.filterActive, { borderColor: ELEMENT_COLORS[el] }]}><ThemedText style={styles.filterText}>{ELEMENT_ICONS[el]}</ThemedText></Pressable>))}
      </ScrollView>
      <ScrollView style={styles.petsGrid} contentContainerStyle={[styles.petsGridContent, { paddingBottom: insets.bottom + 20 }]}>
        <View style={styles.gridRow}>{filteredPets.map(pet => { const owned = getOwnedPet(pet.id); return (<PetCard key={pet.id} pet={pet} owned={owned} isActive={state.activePetId === pet.id} onPress={() => handlePetPress(pet)} />); })}</View>
      </ScrollView>
      {selectedPet && (<PetDetailModal pet={selectedPet} owned={getOwnedPet(selectedPet.id)} onClose={() => setSelectedPet(null)} onFeed={handleFeed} onSetActive={handleSetActive} onEvolve={handleEvolve} canEvolve={canEvolve(selectedPet)} />)}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  foodBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  foodText: { fontSize: 14, color: '#fff' },
  filterScroll: { maxHeight: 50, paddingHorizontal: 16 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  filterActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  filterText: { fontSize: 16, color: '#fff' },
  petsGrid: { flex: 1 },
  petsGridContent: { padding: 16 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  petCard: { width: (SCREEN_WIDTH - 56) / 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2, position: 'relative' },
  petCardActive: { backgroundColor: 'rgba(251,191,36,0.1)' },
  petIcon: { fontSize: 40 },
  petName: { fontSize: 12, color: '#fff', marginTop: 8, textAlign: 'center' },
  petLevel: { fontSize: 10, color: '#a1a1aa', marginTop: 4 },
  petLocked: { fontSize: 16, marginTop: 4 },
  elementBadge: { position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  elementIcon: { fontSize: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 20, width: '100%', maxHeight: '90%', overflow: 'hidden' },
  modalHeader: { padding: 20, alignItems: 'center' },
  modalIcon: { fontSize: 64 },
  modalName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  modalBadges: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: '#fff' },
  modalBody: { padding: 16, gap: 16 },
  description: { fontSize: 14, color: '#a1a1aa', textAlign: 'center' },
  levelSection: { alignItems: 'center', gap: 4 },
  levelText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  xpBar: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: '#3b82f6', borderRadius: 4 },
  xpText: { fontSize: 12, color: '#a1a1aa' },
  happinessSection: { alignItems: 'center', gap: 4 },
  happinessLabel: { fontSize: 14, color: '#fff' },
  happinessBar: { width: '100%', height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  happinessFill: { height: '100%', borderRadius: 4 },
  happinessText: { fontSize: 12, color: '#a1a1aa' },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 10, color: '#a1a1aa' },
  abilitiesSection: { gap: 8 },
  abilitiesTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  abilityItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, gap: 12 },
  abilityIcon: { fontSize: 24 },
  abilityInfo: { flex: 1 },
  abilityName: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  abilityDesc: { fontSize: 12, color: '#a1a1aa' },
  abilityCooldown: { fontSize: 12, color: '#fbbf24' },
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  actionButton: { flex: 1, minWidth: '30%', backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  actionButtonActive: { backgroundColor: '#22c55e' },
  evolveButton: { backgroundColor: '#a855f7' },
  actionText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  closeButton: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  closeText: { fontSize: 14, color: '#a1a1aa' },
});
