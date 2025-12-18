import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useCrafting, CraftingRecipe, CraftingMaterial, ItemRarity } from '@/hooks/use-crafting';
import { useSounds } from '@/hooks/use-sounds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const RARITY_COLORS: Record<ItemRarity, string> = { common: '#9ca3af', rare: '#3b82f6', epic: '#a855f7', legendary: '#fbbf24' };
const CATEGORY_ICONS: Record<string, string> = { spray: '💨', potion: '🧪', equipment: '⚔️', decoration: '🏠', consumable: '📦' };

function MaterialCard({ material, amount }: { material: CraftingMaterial; amount: number }) {
  return (
    <View style={[styles.materialCard, { borderColor: RARITY_COLORS[material.rarity] }]}>
      <ThemedText style={styles.materialIcon}>{material.icon}</ThemedText>
      <ThemedText style={styles.materialName} numberOfLines={1}>{material.name}</ThemedText>
      <ThemedText style={styles.materialAmount}>{amount}</ThemedText>
    </View>
  );
}

function RecipeCard({ recipe, canCraft, onPress }: { recipe: CraftingRecipe; canCraft: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.recipeCard, { borderColor: RARITY_COLORS[recipe.rarity], opacity: canCraft ? 1 : 0.5 }]}>
      <View style={[styles.recipeIconBg, { backgroundColor: RARITY_COLORS[recipe.rarity] + '30' }]}>
        <ThemedText style={styles.recipeIcon}>{recipe.icon}</ThemedText>
      </View>
      <View style={styles.recipeInfo}>
        <ThemedText style={styles.recipeName}>{recipe.name}</ThemedText>
        <ThemedText style={styles.recipeCategory}>{CATEGORY_ICONS[recipe.category]} {recipe.category}</ThemedText>
      </View>
      <View style={styles.recipeTime}>
        <ThemedText style={styles.timeText}>{recipe.craftTime}s</ThemedText>
      </View>
    </Pressable>
  );
}

function CraftingQueueItem({ recipe, progress }: { recipe: CraftingRecipe; progress: number }) {
  const rotation = useSharedValue(0);
  useEffect(() => { rotation.value = withRepeat(withTiming(360, { duration: 2000 }), -1, false); }, []);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return (
    <View style={styles.queueItem}>
      <Animated.View style={animatedStyle}><ThemedText style={styles.queueIcon}>{recipe.icon}</ThemedText></Animated.View>
      <View style={styles.queueInfo}>
        <ThemedText style={styles.queueName}>{recipe.name}</ThemedText>
        <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
      </View>
      <ThemedText style={styles.queuePercent}>{Math.floor(progress * 100)}%</ThemedText>
    </View>
  );
}

function RecipeDetailModal({ recipe, materials, canCraft, onCraft, onClose }: { recipe: CraftingRecipe; materials: Record<string, number>; canCraft: boolean; onCraft: () => void; onClose: () => void }) {
  const { getMaterialById } = useCrafting();
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { backgroundColor: RARITY_COLORS[recipe.rarity] }]}>
            <ThemedText style={styles.modalIcon}>{recipe.icon}</ThemedText>
            <ThemedText style={styles.modalName}>{recipe.name}</ThemedText>
            <View style={styles.modalBadges}>
              <View style={styles.badge}><ThemedText style={styles.badgeText}>{recipe.rarity}</ThemedText></View>
              <View style={styles.badge}><ThemedText style={styles.badgeText}>{CATEGORY_ICONS[recipe.category]} {recipe.category}</ThemedText></View>
            </View>
          </View>
          <View style={styles.modalBody}>
            <ThemedText style={styles.description}>{recipe.description}</ThemedText>
            <View style={styles.materialsSection}>
              <ThemedText style={styles.sectionTitle}>Materiali Richiesti</ThemedText>
              {recipe.materials.map(mat => {
                const material = getMaterialById(mat.materialId);
                const owned = materials[mat.materialId] || 0;
                const hasEnough = owned >= mat.amount;
                return material ? (
                  <View key={mat.materialId} style={styles.materialRow}>
                    <ThemedText style={styles.matIcon}>{material.icon}</ThemedText>
                    <ThemedText style={styles.matName}>{material.name}</ThemedText>
                    <ThemedText style={[styles.matAmount, { color: hasEnough ? '#22c55e' : '#ef4444' }]}>{owned}/{mat.amount}</ThemedText>
                  </View>
                ) : null;
              })}
            </View>
            {recipe.stats && (
              <View style={styles.statsSection}>
                <ThemedText style={styles.sectionTitle}>Statistiche</ThemedText>
                <View style={styles.statsGrid}>
                  {Object.entries(recipe.stats).map(([key, value]) => (
                    <View key={key} style={styles.statItem}>
                      <ThemedText style={styles.statValue}>+{value}</ThemedText>
                      <ThemedText style={styles.statLabel}>{key.replace('_', ' ')}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}
            <View style={styles.timeSection}>
              <ThemedText style={styles.timeLabel}>Tempo di Crafting</ThemedText>
              <ThemedText style={styles.timeValue}>{recipe.craftTime} secondi</ThemedText>
            </View>
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={onCraft} disabled={!canCraft} style={[styles.craftButton, !canCraft && styles.craftButtonDisabled]}>
              <ThemedText style={styles.craftButtonText}>{canCraft ? '⚒️ Crafta' : '❌ Materiali Insufficienti'}</ThemedText>
            </Pressable>
            <Pressable onPress={onClose} style={styles.closeButton}><ThemedText style={styles.closeText}>Chiudi</ThemedText></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function CraftingAdvancedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  const { state, materials, recipes, canCraft, startCraft, getRecipeById, getCraftingProgress } = useCrafting();
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);
  const [activeTab, setActiveTab] = useState<'recipes' | 'materials' | 'queue'>('recipes');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');

  const filteredRecipes = categoryFilter === 'all' ? recipes.filter(r => state.unlockedRecipes.includes(r.id)) : recipes.filter(r => r.category === categoryFilter && state.unlockedRecipes.includes(r.id));
  const handleRecipePress = useCallback((recipe: CraftingRecipe) => { setSelectedRecipe(recipe); play('ui_tap_1' as any); }, [play]);
  const handleCraft = useCallback(() => { if (selectedRecipe && startCraft(selectedRecipe.id)) { play('breed_start' as any); setSelectedRecipe(null); } }, [selectedRecipe, startCraft, play]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><ThemedText style={styles.backText}>←</ThemedText></Pressable>
        <ThemedText style={styles.title}>Crafting</ThemedText>
        <View style={styles.levelBadge}><ThemedText style={styles.levelText}>Lv.{state.craftingLevel}</ThemedText></View>
      </View>
      <View style={styles.tabs}>
        {(['recipes', 'materials', 'queue'] as const).map(tab => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tab, activeTab === tab && styles.tabActive]}>
            <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'recipes' ? '📜 Ricette' : tab === 'materials' ? '🎒 Materiali' : `⏳ Coda (${state.craftingQueue.length})`}</ThemedText>
          </Pressable>
        ))}
      </View>
      {activeTab === 'recipes' && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            <Pressable onPress={() => setCategoryFilter('all')} style={[styles.categoryButton, categoryFilter === 'all' && styles.categoryActive]}><ThemedText style={styles.categoryText}>Tutti</ThemedText></Pressable>
            {Object.entries(CATEGORY_ICONS).map(([cat, icon]) => (
              <Pressable key={cat} onPress={() => setCategoryFilter(cat)} style={[styles.categoryButton, categoryFilter === cat && styles.categoryActive]}><ThemedText style={styles.categoryText}>{icon}</ThemedText></Pressable>
            ))}
          </ScrollView>
          <ScrollView style={styles.content} contentContainerStyle={[styles.contentPadding, { paddingBottom: insets.bottom + 20 }]}>
            {filteredRecipes.map(recipe => (<RecipeCard key={recipe.id} recipe={recipe} canCraft={canCraft(recipe.id)} onPress={() => handleRecipePress(recipe)} />))}
          </ScrollView>
        </>
      )}
      {activeTab === 'materials' && (
        <ScrollView style={styles.content} contentContainerStyle={[styles.materialsGrid, { paddingBottom: insets.bottom + 20 }]}>
          {materials.map(mat => (<MaterialCard key={mat.id} material={mat} amount={state.materials[mat.id] || 0} />))}
        </ScrollView>
      )}
      {activeTab === 'queue' && (
        <ScrollView style={styles.content} contentContainerStyle={[styles.contentPadding, { paddingBottom: insets.bottom + 20 }]}>
          {state.craftingQueue.length === 0 ? (
            <View style={styles.emptyQueue}><ThemedText style={styles.emptyText}>Nessun oggetto in coda</ThemedText><ThemedText style={styles.emptySubtext}>Seleziona una ricetta per iniziare</ThemedText></View>
          ) : (
            state.craftingQueue.map((item, idx) => { const recipe = getRecipeById(item.recipeId); return recipe ? <CraftingQueueItem key={idx} recipe={recipe} progress={getCraftingProgress(item)} /> : null; })
          )}
        </ScrollView>
      )}
      {selectedRecipe && (<RecipeDetailModal recipe={selectedRecipe} materials={state.materials} canCraft={canCraft(selectedRecipe.id)} onCraft={handleCraft} onClose={() => setSelectedRecipe(null)} />)}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  levelBadge: { backgroundColor: '#a855f7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  levelText: { fontSize: 14, color: '#fff', fontWeight: 'bold' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 },
  tabActive: { backgroundColor: '#a855f7' },
  tabText: { fontSize: 12, color: '#a1a1aa' },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  categoryScroll: { maxHeight: 50, paddingHorizontal: 16, marginTop: 12 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8 },
  categoryActive: { backgroundColor: 'rgba(168,85,247,0.3)' },
  categoryText: { fontSize: 16, color: '#fff' },
  content: { flex: 1 },
  contentPadding: { padding: 16, gap: 12 },
  materialsGrid: { padding: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  materialCard: { width: (SCREEN_WIDTH - 56) / 3, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 2 },
  materialIcon: { fontSize: 32 },
  materialName: { fontSize: 10, color: '#fff', marginTop: 4, textAlign: 'center' },
  materialAmount: { fontSize: 16, fontWeight: 'bold', color: '#22c55e', marginTop: 4 },
  recipeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, borderWidth: 2, gap: 12 },
  recipeIconBg: { width: 50, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  recipeIcon: { fontSize: 28 },
  recipeInfo: { flex: 1 },
  recipeName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  recipeCategory: { fontSize: 12, color: '#a1a1aa', marginTop: 2 },
  recipeTime: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timeText: { fontSize: 12, color: '#fbbf24' },
  queueItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 12, gap: 12 },
  queueIcon: { fontSize: 32 },
  queueInfo: { flex: 1 },
  queueName: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  progressBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 4 },
  queuePercent: { fontSize: 14, fontWeight: 'bold', color: '#22c55e' },
  emptyQueue: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#fff' },
  emptySubtext: { fontSize: 14, color: '#a1a1aa', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 20, width: '100%', maxHeight: '90%', overflow: 'hidden' },
  modalHeader: { padding: 20, alignItems: 'center' },
  modalIcon: { fontSize: 64 },
  modalName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  modalBadges: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: '#fff' },
  modalBody: { padding: 16, gap: 16 },
  description: { fontSize: 14, color: '#a1a1aa', textAlign: 'center' },
  materialsSection: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  materialRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8, gap: 12 },
  matIcon: { fontSize: 24 },
  matName: { flex: 1, fontSize: 14, color: '#fff' },
  matAmount: { fontSize: 14, fontWeight: 'bold' },
  statsSection: { gap: 8 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statItem: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#22c55e' },
  statLabel: { fontSize: 10, color: '#a1a1aa', textTransform: 'capitalize' },
  timeSection: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8 },
  timeLabel: { fontSize: 14, color: '#a1a1aa' },
  timeValue: { fontSize: 14, fontWeight: 'bold', color: '#fbbf24' },
  modalActions: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  craftButton: { backgroundColor: '#22c55e', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  craftButtonDisabled: { backgroundColor: '#374151' },
  craftButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  closeButton: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  closeText: { fontSize: 14, color: '#a1a1aa' },
});
