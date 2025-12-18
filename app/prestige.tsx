import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePrestige, PrestigePerk } from '@/hooks/use-prestige';
import { useSounds } from '@/hooks/use-sounds';

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#fbbf24',
};

function PrestigeOrb() {
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);
  
  React.useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 10000 }), -1, false);
    scale.value = withRepeat(withTiming(1.1, { duration: 2000 }), -1, true);
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }, { scale: scale.value }] as any,
  }));
  
  return (
    <Animated.View style={[styles.prestigeOrb, animatedStyle]}>
      <View style={styles.orbInner}>
        <ThemedText style={styles.orbIcon}>✨</ThemedText>
      </View>
    </Animated.View>
  );
}

function PerkCard({ perk, owned, canBuy, onBuy }: { perk: PrestigePerk; owned: boolean; canBuy: boolean; onBuy: () => void }) {
  const getRarity = (cost: number) => {
    if (cost >= 10) return 'legendary';
    if (cost >= 5) return 'epic';
    if (cost >= 3) return 'rare';
    return 'common';
  };
  
  const rarity = getRarity(perk.cost);
  
  return (
    <Pressable
      onPress={onBuy}
      disabled={owned || !canBuy}
      style={[
        styles.perkCard,
        { borderColor: owned ? '#22c55e' : RARITY_COLORS[rarity] },
        owned && styles.perkCardOwned,
        !canBuy && !owned && styles.perkCardDisabled,
      ]}
    >
      <View style={styles.perkHeader}>
        <ThemedText style={styles.perkIcon}>{perk.icon}</ThemedText>
        {owned && <ThemedText style={styles.ownedBadge}>✓</ThemedText>}
      </View>
      <ThemedText style={styles.perkName}>{perk.name}</ThemedText>
      <ThemedText style={styles.perkDescription}>{perk.description}</ThemedText>
      <View style={styles.perkFooter}>
        {!owned && (
          <ThemedText style={[styles.perkCost, { color: RARITY_COLORS[rarity] }]}>
            ✨ {perk.cost}
          </ThemedText>
        )}
        <ThemedText style={styles.perkRequirement}>
          Prestige {perk.requirement}+
        </ThemedText>
      </View>
    </Pressable>
  );
}

function StatRow({ label, value, icon }: { label: string; value: string | number; icon: string }) {
  return (
    <View style={styles.statRow}>
      <ThemedText style={styles.statIcon}>{icon}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
    </View>
  );
}

export default function PrestigeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  const { 
    state, 
    canPrestige, 
    performPrestige, 
    purchasePerk, 
    calculatePrestigePoints,
    getAvailablePerks,
    PRESTIGE_PERKS,
  } = usePrestige();
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPerk, setSelectedPerk] = useState<PrestigePerk | null>(null);
  
  const potentialPoints = calculatePrestigePoints(state.currentRunStats);
  
  const handlePrestige = useCallback(() => {
    if (!canPrestige()) return;
    setShowConfirmModal(true);
  }, [canPrestige]);
  
  const confirmPrestige = useCallback(() => {
    performPrestige();
    play('breed_complete' as any);
    setShowConfirmModal(false);
  }, [performPrestige, play]);
  
  const handleBuyPerk = useCallback((perk: PrestigePerk) => {
    if (state.unlockedPrestigePerks.includes(perk.id)) return;
    if (state.prestigePoints < perk.cost) return;
    if (state.prestigeLevel < perk.requirement) return;
    
    setSelectedPerk(perk);
  }, [state]);
  
  const confirmBuyPerk = useCallback(() => {
    if (selectedPerk) {
      purchasePerk(selectedPerk.id);
      play('shop_buy_rare' as any);
      setSelectedPerk(null);
    }
  }, [selectedPerk, purchasePerk, play]);
  
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>←</ThemedText>
        </Pressable>
        <ThemedText style={styles.title}>Prestige</ThemedText>
        <View style={styles.placeholder} />
      </View>
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Prestige Status */}
        <View style={styles.prestigeStatus}>
          <PrestigeOrb />
          <ThemedText style={styles.prestigeLevel}>Prestige {state.prestigeLevel}</ThemedText>
          <ThemedText style={styles.prestigePoints}>✨ {state.prestigePoints} Punti</ThemedText>
          <ThemedText style={styles.multiplierText}>
            Moltiplicatore: {state.prestigeMultiplier.toFixed(1)}x
          </ThemedText>
        </View>
        
        {/* Current Run Stats */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Statistiche Run Attuale</ThemedText>
          <View style={styles.statsGrid}>
            <StatRow icon="🏆" label="Score" value={state.currentRunStats.totalScore.toLocaleString()} />
            <StatRow icon="🐛" label="Parassiti" value={state.currentRunStats.pestsKilled} />
            <StatRow icon="👑" label="Boss" value={state.currentRunStats.bossesDefeated} />
            <StatRow icon="🪙" label="Monete" value={state.currentRunStats.coinsEarned} />
            <StatRow icon="🔥" label="Max Combo" value={state.currentRunStats.maxCombo} />
            <StatRow icon="📊" label="Livelli" value={state.currentRunStats.levelsCompleted} />
          </View>
        </View>
        
        {/* Prestige Button */}
        <View style={styles.prestigeButtonContainer}>
          <ThemedText style={styles.potentialPoints}>
            Punti ottenibili: ✨ {potentialPoints}
          </ThemedText>
          <Pressable
            onPress={handlePrestige}
            style={[styles.prestigeButton, !canPrestige() && styles.prestigeButtonDisabled]}
            disabled={!canPrestige()}
          >
            <ThemedText style={styles.prestigeButtonText}>
              {canPrestige() ? '⚡ PRESTIGE' : 'Requisiti non raggiunti'}
            </ThemedText>
          </Pressable>
          {!canPrestige() && (
            <ThemedText style={styles.requirementText}>
              Richiesto: 10 livelli, 1 boss o 50k score
            </ThemedText>
          )}
        </View>
        
        {/* Perks Shop */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Perk Permanenti</ThemedText>
          <View style={styles.perksGrid}>
            {PRESTIGE_PERKS.map(perk => (
              <PerkCard
                key={perk.id}
                perk={perk}
                owned={state.unlockedPrestigePerks.includes(perk.id)}
                canBuy={
                  state.prestigePoints >= perk.cost && 
                  state.prestigeLevel >= perk.requirement &&
                  !state.unlockedPrestigePerks.includes(perk.id)
                }
                onBuy={() => handleBuyPerk(perk)}
              />
            ))}
          </View>
        </View>
        
        {/* Best Run Stats */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Record Personali</ThemedText>
          <View style={styles.statsGrid}>
            <StatRow icon="🏆" label="Miglior Score" value={state.bestRunStats.totalScore.toLocaleString()} />
            <StatRow icon="🐛" label="Max Parassiti" value={state.bestRunStats.pestsKilled} />
            <StatRow icon="👑" label="Max Boss" value={state.bestRunStats.bossesDefeated} />
            <StatRow icon="🔥" label="Max Combo" value={state.bestRunStats.maxCombo} />
          </View>
        </View>
      </ScrollView>
      
      {/* Confirm Prestige Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>⚠️ Conferma Prestige</ThemedText>
            <ThemedText style={styles.modalText}>
              Stai per effettuare il Prestige. Questo resetterà tutti i tuoi progressi ma otterrai:
            </ThemedText>
            <View style={styles.modalRewards}>
              <ThemedText style={styles.rewardText}>✨ {potentialPoints} Punti Prestige</ThemedText>
              <ThemedText style={styles.rewardText}>📈 +10% Moltiplicatore permanente</ThemedText>
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowConfirmModal(false)} style={styles.cancelButton}>
                <ThemedText style={styles.cancelButtonText}>Annulla</ThemedText>
              </Pressable>
              <Pressable onPress={confirmPrestige} style={styles.confirmButton}>
                <ThemedText style={styles.confirmButtonText}>Prestige!</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Confirm Perk Modal */}
      <Modal visible={selectedPerk !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedPerk && (
              <>
                <ThemedText style={styles.modalIcon}>{selectedPerk.icon}</ThemedText>
                <ThemedText style={styles.modalTitle}>{selectedPerk.name}</ThemedText>
                <ThemedText style={styles.modalText}>{selectedPerk.description}</ThemedText>
                <ThemedText style={styles.perkCostModal}>Costo: ✨ {selectedPerk.cost}</ThemedText>
                <View style={styles.modalActions}>
                  <Pressable onPress={() => setSelectedPerk(null)} style={styles.cancelButton}>
                    <ThemedText style={styles.cancelButtonText}>Annulla</ThemedText>
                  </Pressable>
                  <Pressable onPress={confirmBuyPerk} style={styles.confirmButton}>
                    <ThemedText style={styles.confirmButtonText}>Acquista</ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  placeholder: { width: 44 },
  content: { flex: 1 },
  contentContainer: { padding: 16, gap: 24 },
  prestigeStatus: { alignItems: 'center', padding: 24, backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)' },
  prestigeOrb: { width: 100, height: 100, marginBottom: 16 },
  orbInner: { flex: 1, borderRadius: 50, backgroundColor: 'rgba(168,85,247,0.3)', borderWidth: 3, borderColor: '#a855f7', justifyContent: 'center', alignItems: 'center' },
  orbIcon: { fontSize: 40 },
  prestigeLevel: { fontSize: 32, fontWeight: 'bold', color: '#a855f7' },
  prestigePoints: { fontSize: 20, color: '#fbbf24', marginTop: 8 },
  multiplierText: { fontSize: 16, color: '#a1a1aa', marginTop: 4 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statsGrid: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, gap: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statIcon: { fontSize: 20, width: 30 },
  statLabel: { flex: 1, fontSize: 14, color: '#a1a1aa' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  prestigeButtonContainer: { alignItems: 'center', gap: 12 },
  potentialPoints: { fontSize: 18, color: '#fbbf24' },
  prestigeButton: { width: '100%', backgroundColor: '#a855f7', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  prestigeButtonDisabled: { backgroundColor: '#374151', opacity: 0.5 },
  prestigeButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  requirementText: { fontSize: 12, color: '#a1a1aa' },
  perksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  perkCard: { width: '47%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, borderWidth: 2, gap: 8 },
  perkCardOwned: { backgroundColor: 'rgba(34,197,94,0.1)' },
  perkCardDisabled: { opacity: 0.5 },
  perkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  perkIcon: { fontSize: 28 },
  ownedBadge: { fontSize: 16, color: '#22c55e' },
  perkName: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  perkDescription: { fontSize: 12, color: '#a1a1aa' },
  perkFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  perkCost: { fontSize: 14, fontWeight: 'bold' },
  perkRequirement: { fontSize: 10, color: '#6b7280' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24, width: '100%', maxWidth: 350, alignItems: 'center' },
  modalIcon: { fontSize: 48, marginBottom: 8 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  modalText: { fontSize: 14, color: '#a1a1aa', textAlign: 'center', marginBottom: 16 },
  modalRewards: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, width: '100%', gap: 8, marginBottom: 20 },
  rewardText: { fontSize: 16, color: '#22c55e' },
  perkCostModal: { fontSize: 18, color: '#fbbf24', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  confirmButton: { flex: 1, backgroundColor: '#a855f7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  confirmButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});
