import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useGacha, CollectibleItem, Rarity } from '@/hooks/use-gacha';
import { useSounds } from '@/hooks/use-sounds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_SIZE = (SCREEN_WIDTH - 64) / 4;

const RARITY_COLORS: Record<Rarity, string> = { common: '#9ca3af', rare: '#3b82f6', epic: '#a855f7', legendary: '#fbbf24', mythic: '#ef4444' };
const RARITY_NAMES: Record<Rarity, string> = { common: 'Comune', rare: 'Raro', epic: 'Epico', legendary: 'Leggendario', mythic: 'Mitico' };
const CATEGORY_NAMES: Record<string, string> = { plant: '🌱 Piante', spray: '💨 Spray', decoration: '🏠 Decorazioni', badge: '🏅 Badge', skin: '🎨 Skin', pet: '🐾 Pet' };

type Category = 'all' | 'plant' | 'spray' | 'decoration' | 'badge' | 'skin' | 'pet';

function CollectionItem({ item, count, owned, onPress }: { item: CollectibleItem; count: number; owned: boolean; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const handlePress = () => { if (owned) { scale.value = withSequence(withSpring(0.9), withSpring(1)); onPress(); } };
  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={handlePress} style={[styles.collectionItem, { borderColor: owned ? RARITY_COLORS[item.rarity] : '#374151' }, !owned && styles.collectionItemLocked]}>
        <ThemedText style={[styles.itemIcon, !owned && styles.itemIconLocked]}>{owned ? item.icon : '❓'}</ThemedText>
        {owned && count > 1 && <View style={styles.countBadge}><ThemedText style={styles.countText}>x{count}</ThemedText></View>}
        <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[item.rarity] }]} />
      </Pressable>
    </Animated.View>
  );
}

function ItemDetailModal({ item, count, onClose }: { item: CollectibleItem | null; count: number; onClose: () => void }) {
  if (!item) return null;
  return (
    <Modal visible={true} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { backgroundColor: RARITY_COLORS[item.rarity] }]}>
            <ThemedText style={styles.modalIcon}>{item.icon}</ThemedText>
            <ThemedText style={styles.modalName}>{item.name}</ThemedText>
            <ThemedText style={styles.modalRarity}>{RARITY_NAMES[item.rarity]}</ThemedText>
          </View>
          <View style={styles.modalBody}>
            <ThemedText style={styles.modalDescription}>{item.description}</ThemedText>
            <View style={styles.modalInfo}>
              <View style={styles.infoRow}><ThemedText style={styles.infoLabel}>Categoria</ThemedText><ThemedText style={styles.infoValue}>{CATEGORY_NAMES[item.category]}</ThemedText></View>
              <View style={styles.infoRow}><ThemedText style={styles.infoLabel}>Posseduti</ThemedText><ThemedText style={styles.infoValue}>x{count}</ThemedText></View>
            </View>
            {item.stats && Object.keys(item.stats).length > 0 && (
              <View style={styles.statsSection}>
                <ThemedText style={styles.statsTitle}>Statistiche</ThemedText>
                <View style={styles.statsGrid}>{Object.entries(item.stats).map(([key, value]) => (<View key={key} style={styles.statItem}><ThemedText style={styles.statValue}>+{value}</ThemedText><ThemedText style={styles.statLabel}>{key}</ThemedText></View>))}</View>
              </View>
            )}
          </View>
          <Pressable onPress={onClose} style={styles.closeButton}><ThemedText style={styles.closeButtonText}>Chiudi</ThemedText></Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function CollectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  const { state, allItems, getCollectionProgress } = useGacha();
  const [selectedCategory, setSelectedCategory] = useState<Category>('all');
  const [selectedItem, setSelectedItem] = useState<{ item: CollectibleItem; count: number } | null>(null);
  const progress = getCollectionProgress();
  
  const getFilteredItems = useCallback(() => selectedCategory === 'all' ? allItems : allItems.filter(item => item.category === selectedCategory), [selectedCategory, allItems]);
  const handleItemPress = useCallback((item: CollectibleItem) => { const entry = state.collection[item.id]; if (entry) { setSelectedItem({ item, count: entry.count }); play('ui_tap_1' as any); } }, [state.collection, play]);
  const filteredItems = getFilteredItems();
  const categoryProgress = useCallback((category: Category) => { const items = category === 'all' ? allItems : allItems.filter(i => i.category === category); const owned = items.filter(i => state.collection[i.id]).length; return { owned, total: items.length }; }, [allItems, state.collection]);
  
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><ThemedText style={styles.backText}>←</ThemedText></Pressable>
        <View style={styles.headerCenter}><ThemedText style={styles.title}>Collezione</ThemedText><ThemedText style={styles.progressText}>{progress.owned}/{progress.total} ({progress.percentage.toFixed(1)}%)</ThemedText></View>
        <Pressable onPress={() => router.push('/gacha' as any)} style={styles.gachaButton}><ThemedText style={styles.gachaButtonText}>🎰</ThemedText></Pressable>
      </View>
      <View style={styles.progressBarContainer}><View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress.percentage}%` }]} /></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <Pressable onPress={() => setSelectedCategory('all')} style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryButtonActive]}><ThemedText style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>📚 Tutti ({categoryProgress('all').owned}/{categoryProgress('all').total})</ThemedText></Pressable>
        {(['plant', 'spray', 'decoration', 'badge', 'skin', 'pet'] as const).map(cat => { const prog = categoryProgress(cat); return (<Pressable key={cat} onPress={() => setSelectedCategory(cat)} style={[styles.categoryButton, selectedCategory === cat && styles.categoryButtonActive]}><ThemedText style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{CATEGORY_NAMES[cat]} ({prog.owned}/{prog.total})</ThemedText></Pressable>); })}
      </ScrollView>
      <ScrollView style={styles.collectionGrid} contentContainerStyle={[styles.collectionGridContent, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.gridRow}>{filteredItems.map(item => { const entry = state.collection[item.id]; return (<CollectionItem key={item.id} item={item} count={entry?.count || 0} owned={!!entry} onPress={() => handleItemPress(item)} />); })}</View>
      </ScrollView>
      {selectedItem && <ItemDetailModal item={selectedItem.item} count={selectedItem.count} onClose={() => setSelectedItem(null)} />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: '#fff' },
  headerCenter: { alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  progressText: { fontSize: 14, color: '#a1a1aa' },
  gachaButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 22 },
  gachaButtonText: { fontSize: 20 },
  progressBarContainer: { paddingHorizontal: 16, marginBottom: 16 },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fbbf24', borderRadius: 4 },
  categoryScroll: { maxHeight: 50, paddingHorizontal: 16 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8 },
  categoryButtonActive: { backgroundColor: '#fbbf24' },
  categoryText: { fontSize: 12, color: '#a1a1aa' },
  categoryTextActive: { color: '#000', fontWeight: 'bold' },
  collectionGrid: { flex: 1 },
  collectionGridContent: { padding: 16 },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  collectionItem: { width: ITEM_SIZE, height: ITEM_SIZE, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, position: 'relative' },
  collectionItemLocked: { backgroundColor: 'rgba(0,0,0,0.3)' },
  itemIcon: { fontSize: 32 },
  itemIconLocked: { opacity: 0.3 },
  countBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  countText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  rarityDot: { position: 'absolute', bottom: 4, width: 8, height: 8, borderRadius: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 20, width: '100%', maxWidth: 350, overflow: 'hidden' },
  modalHeader: { padding: 24, alignItems: 'center' },
  modalIcon: { fontSize: 64 },
  modalName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  modalRarity: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  modalBody: { padding: 20 },
  modalDescription: { fontSize: 16, color: '#a1a1aa', textAlign: 'center', marginBottom: 20 },
  modalInfo: { gap: 8, marginBottom: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 14, color: '#a1a1aa' },
  infoValue: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  statsSection: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12 },
  statsTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statItem: { alignItems: 'center', minWidth: 60 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#22c55e' },
  statLabel: { fontSize: 12, color: '#a1a1aa', textTransform: 'capitalize' },
  closeButton: { backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  closeButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});
