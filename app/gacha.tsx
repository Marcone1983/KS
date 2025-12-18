import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, withRepeat } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useGacha, GachaBanner, CollectibleItem, Rarity } from '@/hooks/use-gacha';
import { useSounds } from '@/hooks/use-sounds';

const RARITY_COLORS: Record<Rarity, string> = { common: '#9ca3af', rare: '#3b82f6', epic: '#a855f7', legendary: '#fbbf24', mythic: '#ef4444' };
const RARITY_NAMES: Record<Rarity, string> = { common: 'Comune', rare: 'Raro', epic: 'Epico', legendary: 'Leggendario', mythic: 'Mitico' };

function BannerCard({ banner, selected, onSelect }: { banner: GachaBanner; selected: boolean; onSelect: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePress = () => { scale.value = withSequence(withSpring(0.95), withSpring(1)); onSelect(); };
  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={handlePress} style={[styles.bannerCard, selected && styles.bannerCardSelected]}>
        <ThemedText style={styles.bannerIcon}>{banner.icon}</ThemedText>
        <ThemedText style={styles.bannerName}>{banner.name}</ThemedText>
        <ThemedText style={styles.bannerCost}>{banner.cost.type === 'gems' ? '💎' : '🎟️'} {banner.cost.amount}</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

function PullAnimation({ items, onComplete }: { items: CollectibleItem[]; onComplete: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);
  
  useEffect(() => {
    if (currentIndex < items.length) {
      scale.value = 0; rotation.value = 0; opacity.value = 0;
      rotation.value = withRepeat(withTiming(360, { duration: 500 }), 2, false);
      scale.value = withSequence(withTiming(1.5, { duration: 300 }), withSpring(1, { damping: 10 }));
      opacity.value = withTiming(1, { duration: 200 });
      const timer = setTimeout(() => { if (currentIndex < items.length - 1) setCurrentIndex(prev => prev + 1); else onComplete(); }, items.length > 1 ? 800 : 1500);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, items.length]);
  
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }] as any, opacity: opacity.value }));
  const currentItem = items[currentIndex];
  if (!currentItem) return null;
  
  return (
    <View style={styles.pullAnimationOverlay}>
      <Animated.View style={[styles.pullAnimationContent, animatedStyle]}>
        <View style={[styles.pullItemGlow, { backgroundColor: RARITY_COLORS[currentItem.rarity] }]} />
        <ThemedText style={styles.pullItemIcon}>{currentItem.icon}</ThemedText>
        <ThemedText style={styles.pullItemName}>{currentItem.name}</ThemedText>
        <ThemedText style={[styles.pullItemRarity, { color: RARITY_COLORS[currentItem.rarity] }]}>{RARITY_NAMES[currentItem.rarity]}</ThemedText>
        {currentItem.isNew && <View style={styles.newBadge}><ThemedText style={styles.newBadgeText}>NUOVO!</ThemedText></View>}
      </Animated.View>
      <ThemedText style={styles.pullCounter}>{currentIndex + 1}/{items.length}</ThemedText>
      <Pressable onPress={onComplete} style={styles.skipButton}><ThemedText style={styles.skipButtonText}>Salta</ThemedText></Pressable>
    </View>
  );
}

function ResultsModal({ items, onClose }: { items: CollectibleItem[]; onClose: () => void }) {
  const groupedByRarity = items.reduce((acc, item) => { acc[item.rarity] = acc[item.rarity] || []; acc[item.rarity].push(item); return acc; }, {} as Record<Rarity, CollectibleItem[]>);
  const sortedRarities: Rarity[] = ['mythic', 'legendary', 'epic', 'rare', 'common'];
  return (
    <View style={styles.resultsOverlay}>
      <View style={styles.resultsContent}>
        <ThemedText style={styles.resultsTitle}>🎉 Risultati</ThemedText>
        <ScrollView style={styles.resultsScroll} showsVerticalScrollIndicator={false}>
          {sortedRarities.map(rarity => { const rarityItems = groupedByRarity[rarity]; if (!rarityItems || rarityItems.length === 0) return null; return (
            <View key={rarity} style={styles.rarityGroup}>
              <ThemedText style={[styles.rarityGroupTitle, { color: RARITY_COLORS[rarity] }]}>{RARITY_NAMES[rarity]} ({rarityItems.length})</ThemedText>
              <View style={styles.rarityItemsGrid}>{rarityItems.map((item, i) => (<View key={`${item.id}-${i}`} style={[styles.resultItem, { borderColor: RARITY_COLORS[item.rarity] }]}><ThemedText style={styles.resultItemIcon}>{item.icon}</ThemedText><ThemedText style={styles.resultItemName} numberOfLines={1}>{item.name}</ThemedText>{item.isNew && <View style={styles.newDot} />}</View>))}</View>
            </View>
          ); })}
        </ScrollView>
        <Pressable onPress={onClose} style={styles.closeResultsButton}><ThemedText style={styles.closeResultsText}>Chiudi</ThemedText></Pressable>
      </View>
    </View>
  );
}

export default function GachaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  const { state, pull, banners, getCollectionProgress } = useGacha();
  const [selectedBanner, setSelectedBanner] = useState<GachaBanner>(banners[0]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullResults, setPullResults] = useState<CollectibleItem[]>([]);
  const [showResults, setShowResults] = useState(false);
  const progress = getCollectionProgress();
  
  const handlePull = useCallback((count: number) => { const results = pull(selectedBanner.id, count); if (results.length > 0) { setPullResults(results); setIsPulling(true); play('shop_buy_rare' as any); } }, [selectedBanner, pull, play]);
  const handleAnimationComplete = useCallback(() => { setIsPulling(false); setShowResults(true); }, []);
  const handleCloseResults = useCallback(() => { setShowResults(false); setPullResults([]); }, []);
  const canPull = (count: number) => { const cost = count === 10 ? selectedBanner.cost10x : selectedBanner.cost; const totalCost = count === 10 ? cost.amount : cost.amount * count; return cost.type === 'gems' ? state.gems >= totalCost : state.tickets >= totalCost; };
  
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><ThemedText style={styles.backText}>←</ThemedText></Pressable>
        <ThemedText style={styles.title}>Gacha</ThemedText>
        <Pressable onPress={() => router.push('/collection' as any)} style={styles.collectionButton}><ThemedText style={styles.collectionButtonText}>📚</ThemedText></Pressable>
      </View>
      <View style={styles.currencyRow}>
        <View style={styles.currencyItem}><ThemedText style={styles.currencyIcon}>💎</ThemedText><ThemedText style={styles.currencyAmount}>{state.gems}</ThemedText></View>
        <View style={styles.currencyItem}><ThemedText style={styles.currencyIcon}>🎟️</ThemedText><ThemedText style={styles.currencyAmount}>{state.tickets}</ThemedText></View>
        <View style={styles.currencyItem}><ThemedText style={styles.currencyIcon}>📊</ThemedText><ThemedText style={styles.currencyAmount}>{progress.owned}/{progress.total}</ThemedText></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannerScroll}>{banners.map(banner => (<BannerCard key={banner.id} banner={banner} selected={selectedBanner.id === banner.id} onSelect={() => setSelectedBanner(banner)} />))}</ScrollView>
      <View style={styles.bannerDetails}>
        <View style={styles.bannerHeader}><ThemedText style={styles.bannerDetailIcon}>{selectedBanner.icon}</ThemedText><View style={styles.bannerDetailInfo}><ThemedText style={styles.bannerDetailName}>{selectedBanner.name}</ThemedText><ThemedText style={styles.bannerDetailDesc}>{selectedBanner.description}</ThemedText></View></View>
        {selectedBanner.rateUp && selectedBanner.rateUp.length > 0 && <View style={styles.rateUpSection}><ThemedText style={styles.rateUpTitle}>⬆️ Rate Up</ThemedText><ThemedText style={styles.rateUpText}>Probabilità aumentata!</ThemedText></View>}
        <View style={styles.pityInfo}><ThemedText style={styles.pityText}>Pity: {state.pity[selectedBanner.id] || 0}/90</ThemedText><ThemedText style={styles.pityHint}>Leggendario garantito a 90 pull</ThemedText></View>
      </View>
      <View style={[styles.pullButtons, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable onPress={() => handlePull(1)} disabled={!canPull(1)} style={[styles.pullButton, !canPull(1) && styles.pullButtonDisabled]}><ThemedText style={styles.pullButtonText}>Pull x1</ThemedText><ThemedText style={styles.pullButtonCost}>{selectedBanner.cost.type === 'gems' ? '💎' : '🎟️'} {selectedBanner.cost.amount}</ThemedText></Pressable>
        <Pressable onPress={() => handlePull(10)} disabled={!canPull(10)} style={[styles.pullButton, styles.pullButton10, !canPull(10) && styles.pullButtonDisabled]}><ThemedText style={styles.pullButtonText}>Pull x10</ThemedText><ThemedText style={styles.pullButtonCost}>{selectedBanner.cost10x.type === 'gems' ? '💎' : '🎟️'} {selectedBanner.cost10x.amount}</ThemedText><View style={styles.discountBadge}><ThemedText style={styles.discountText}>-10%</ThemedText></View></Pressable>
      </View>
      {isPulling && <PullAnimation items={pullResults} onComplete={handleAnimationComplete} />}
      {showResults && <ResultsModal items={pullResults} onClose={handleCloseResults} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  collectionButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22 },
  collectionButtonText: { fontSize: 20 },
  currencyRow: { flexDirection: 'row', justifyContent: 'space-around', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 16, borderRadius: 12 },
  currencyItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  currencyIcon: { fontSize: 20 },
  currencyAmount: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  bannerScroll: { maxHeight: 120, paddingHorizontal: 16, marginTop: 16 },
  bannerCard: { width: 100, height: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 2, borderColor: 'transparent' },
  bannerCardSelected: { borderColor: '#fbbf24', backgroundColor: 'rgba(251,191,36,0.1)' },
  bannerIcon: { fontSize: 32 },
  bannerName: { fontSize: 12, color: '#fff', marginTop: 4, textAlign: 'center' },
  bannerCost: { fontSize: 10, color: '#a1a1aa', marginTop: 2 },
  bannerDetails: { flex: 1, padding: 16, gap: 16 },
  bannerHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12 },
  bannerDetailIcon: { fontSize: 48 },
  bannerDetailInfo: { flex: 1 },
  bannerDetailName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  bannerDetailDesc: { fontSize: 14, color: '#a1a1aa', marginTop: 4 },
  rateUpSection: { backgroundColor: 'rgba(251,191,36,0.1)', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#fbbf24' },
  rateUpTitle: { fontSize: 14, fontWeight: 'bold', color: '#fbbf24' },
  rateUpText: { fontSize: 12, color: '#a1a1aa', marginTop: 4 },
  pityInfo: { alignItems: 'center', padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  pityText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  pityHint: { fontSize: 12, color: '#a1a1aa', marginTop: 4 },
  pullButtons: { flexDirection: 'row', padding: 16, gap: 12 },
  pullButton: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  pullButton10: { backgroundColor: '#fbbf24', position: 'relative' },
  pullButtonDisabled: { backgroundColor: '#374151', opacity: 0.5 },
  pullButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  pullButtonCost: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  discountBadge: { position: 'absolute', top: -8, right: -8, backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  discountText: { fontSize: 10, fontWeight: 'bold', color: '#fff' },
  pullAnimationOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  pullAnimationContent: { alignItems: 'center' },
  pullItemGlow: { position: 'absolute', width: 200, height: 200, borderRadius: 100, opacity: 0.3 },
  pullItemIcon: { fontSize: 80 },
  pullItemName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 16 },
  pullItemRarity: { fontSize: 16, marginTop: 8 },
  newBadge: { position: 'absolute', top: -20, backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  newBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  pullCounter: { position: 'absolute', bottom: 100, fontSize: 16, color: '#a1a1aa' },
  skipButton: { position: 'absolute', bottom: 40, paddingHorizontal: 24, paddingVertical: 12 },
  skipButtonText: { fontSize: 16, color: '#a1a1aa' },
  resultsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  resultsContent: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 20, width: '100%', maxHeight: '80%' },
  resultsTitle: { fontSize: 24, fontWeight: 'bold', color: '#fbbf24', textAlign: 'center', marginBottom: 16 },
  resultsScroll: { maxHeight: 400 },
  rarityGroup: { marginBottom: 16 },
  rarityGroupTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  rarityItemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  resultItem: { width: '30%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 8, alignItems: 'center', borderWidth: 2, position: 'relative' },
  resultItemIcon: { fontSize: 28 },
  resultItemName: { fontSize: 10, color: '#fff', marginTop: 4, textAlign: 'center' },
  newDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  closeResultsButton: { backgroundColor: '#fbbf24', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  closeResultsText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
});
