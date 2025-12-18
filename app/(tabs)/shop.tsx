// @ts-nocheck
import React, { useState, useEffect, useRef, Suspense } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  ScrollView,
  FlatList,
  Modal,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const { width } = Dimensions.get('window');

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "nutrients" | "powerups" | "marketplace" | "badges";
  icon: string;
  modelPath?: string;
  rarity: "common" | "rare" | "epic" | "legendary";
}

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const SHOP_ITEMS: ShopItem[] = [
  // Nutrienti
  { id: "water_bottle", name: "Bottiglia Acqua", description: "Acqua pura per irrigazione", price: 50, category: "nutrients", icon: "💧", modelPath: require('@/assets/models/items/water_bottle.glb'), rarity: "common" },
  { id: "fertilizer_bag", name: "Sacco Fertilizzante", description: "Fertilizzante organico premium", price: 100, category: "nutrients", icon: "🌿", modelPath: require('@/assets/models/items/fertilizer_bag.glb'), rarity: "common" },
  { id: "crystal_green", name: "Cristallo Verde", description: "Nutriente cristallizzato", price: 200, category: "nutrients", icon: "💎", modelPath: require('@/assets/models/items/nutrient_crystal_green.glb'), rarity: "rare" },
  { id: "crystal_blue", name: "Cristallo Blu", description: "Nutriente avanzato", price: 300, category: "nutrients", icon: "💎", modelPath: require('@/assets/models/items/nutrient_crystal_blue.glb'), rarity: "rare" },
  { id: "crystal_gold", name: "Cristallo Oro", description: "Nutriente leggendario", price: 500, category: "nutrients", icon: "💎", modelPath: require('@/assets/models/items/nutrient_crystal_gold.glb'), rarity: "legendary" },
  { id: "magic_essence", name: "Essenza Magica", description: "Potenzia la crescita", price: 400, category: "nutrients", icon: "✨", modelPath: require('@/assets/models/items/magic_essence.glb'), rarity: "epic" },
  { id: "golden_powder", name: "Polvere Dorata", description: "Ingrediente raro per crafting", price: 350, category: "nutrients", icon: "🌟", modelPath: require('@/assets/models/items/golden_powder.glb'), rarity: "epic" },
  
  // Power-ups
  { id: "super_spray", name: "Super Spray", description: "Spray potenziato 2x danno", price: 250, category: "powerups", icon: "🔫", modelPath: require('@/assets/models/powerups/super_spray.glb'), rarity: "rare" },
  { id: "health_potion", name: "Pozione Salute", description: "Ripristina 100 HP", price: 150, category: "powerups", icon: "❤️", modelPath: require('@/assets/models/powerups/health_potion.glb'), rarity: "common" },
  { id: "shield_barrier", name: "Scudo Barriera", description: "Protezione 60 secondi", price: 300, category: "powerups", icon: "🛡️", modelPath: require('@/assets/models/powerups/shield_barrier.glb'), rarity: "rare" },
  { id: "growth_elixir", name: "Elisir Crescita", description: "Crescita 200% più veloce", price: 400, category: "powerups", icon: "📈", modelPath: require('@/assets/models/powerups/growth_elixir.glb'), rarity: "epic" },
  { id: "ultimate_serum", name: "Siero Definitivo", description: "Il più potente potenziamento", price: 800, category: "powerups", icon: "⚡", modelPath: require('@/assets/models/powerups/ultimate_serum.glb'), rarity: "legendary" },
  { id: "insecticide_bomb", name: "Bomba Insetticida", description: "Elimina tutti i parassiti", price: 500, category: "powerups", icon: "💣", modelPath: require('@/assets/models/powerups/insecticide_bomb.glb'), rarity: "epic" },
  
  // Marketplace/Decorazioni
  { id: "pot_basic", name: "Vaso Base", description: "Vaso decorativo semplice", price: 100, category: "marketplace", icon: "🏺", modelPath: require('@/assets/models/marketplace/pot_basic.glb'), rarity: "common" },
  { id: "pot_premium", name: "Vaso Premium", description: "Vaso elegante blu", price: 250, category: "marketplace", icon: "🏺", modelPath: require('@/assets/models/marketplace/pot_premium.glb'), rarity: "rare" },
  { id: "pot_legendary", name: "Vaso Leggendario", description: "Vaso dorato esclusivo", price: 600, category: "marketplace", icon: "🏺", modelPath: require('@/assets/models/marketplace/pot_legendary.glb'), rarity: "legendary" },
  { id: "grow_lamp", name: "Lampada Crescita", description: "Luce UV per crescita", price: 350, category: "marketplace", icon: "💡", modelPath: require('@/assets/models/marketplace/grow_lamp.glb'), rarity: "rare" },
  { id: "irrigation", name: "Sistema Irrigazione", description: "Irrigazione automatica", price: 400, category: "marketplace", icon: "🚿", modelPath: require('@/assets/models/marketplace/irrigation_system.glb'), rarity: "epic" },
  { id: "greenhouse", name: "Mini Serra", description: "Protegge le piante", price: 500, category: "marketplace", icon: "🏠", modelPath: require('@/assets/models/marketplace/mini_greenhouse.glb'), rarity: "epic" },
  { id: "fence", name: "Recinzione Garden", description: "Decorazione giardino", price: 150, category: "marketplace", icon: "🪵", modelPath: require('@/assets/models/marketplace/garden_fence.glb'), rarity: "common" },
  { id: "fountain", name: "Fontana Decorativa", description: "Fontana con acqua", price: 450, category: "marketplace", icon: "⛲", modelPath: require('@/assets/models/marketplace/decorative_fountain.glb'), rarity: "epic" },
  
  // Badges
  { id: "badge_bronze", name: "Badge Bronzo", description: "Achievement base", price: 200, category: "badges", icon: "🥉", modelPath: require('@/assets/models/badges/badge_bronze.glb'), rarity: "common" },
  { id: "badge_silver", name: "Badge Argento", description: "Achievement intermedio", price: 400, category: "badges", icon: "🥈", modelPath: require('@/assets/models/badges/badge_silver.glb'), rarity: "rare" },
  { id: "badge_gold", name: "Badge Oro", description: "Achievement avanzato", price: 600, category: "badges", icon: "🥇", modelPath: require('@/assets/models/badges/badge_gold.glb'), rarity: "epic" },
  { id: "trophy", name: "Trofeo Campione", description: "Per i veri campioni", price: 1000, category: "badges", icon: "🏆", modelPath: require('@/assets/models/badges/trophy_champion.glb'), rarity: "legendary" },
  { id: "crown", name: "Corona Premium", description: "Corona esclusiva", price: 1500, category: "badges", icon: "👑", modelPath: require('@/assets/models/badges/crown_premium.glb'), rarity: "legendary" },
];

const CATEGORIES = [
  { id: "all", name: "Tutti", icon: "🛒" },
  { id: "nutrients", name: "Nutrienti", icon: "💧" },
  { id: "powerups", name: "Power-ups", icon: "⚡" },
  { id: "marketplace", name: "Decorazioni", icon: "🏠" },
  { id: "badges", name: "Badge", icon: "🏆" },
];

// 3D Model Preview Component
function ModelPreview3D({ modelPath }: { modelPath: any }) {
  const modelRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (modelRef.current) {
      modelRef.current.rotation.y += 0.01;
    }
  });

  try {
    const { scene } = useGLTF(modelPath);
    return (
      <group ref={modelRef}>
        <primitive object={scene.clone()} scale={2} />
      </group>
    );
  } catch (e) {
    // Fallback se il modello non carica
    return (
      <mesh ref={modelRef}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    );
  }
}

// Item Card with 3D Preview
function ShopItemCard({ 
  item, 
  isOwned, 
  canAfford, 
  onPurchase,
  onPreview,
  colors 
}: { 
  item: ShopItem; 
  isOwned: boolean; 
  canAfford: boolean; 
  onPurchase: () => void;
  onPreview: () => void;
  colors: any;
}) {
  return (
    <Pressable
      style={[
        styles.itemCard,
        { 
          backgroundColor: colors.card,
          borderColor: RARITY_COLORS[item.rarity],
          borderWidth: 2,
        },
        isOwned && styles.itemOwned,
      ]}
      onPress={onPreview}
      onLongPress={onPurchase}
    >
      {/* Rarity indicator */}
      <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[item.rarity] }]}>
        <ThemedText style={styles.rarityText}>{item.rarity.toUpperCase()}</ThemedText>
      </View>
      
      {/* 3D Preview */}
      <View style={styles.preview3D}>
        <Canvas>
          <ambientLight intensity={0.6} />
          <pointLight position={[5, 5, 5]} intensity={1} />
          <PerspectiveCamera makeDefault position={[0, 0, 3]} />
          <Suspense fallback={null}>
            {item.modelPath && <ModelPreview3D modelPath={item.modelPath} />}
          </Suspense>
        </Canvas>
      </View>
      
      <View style={styles.itemInfo}>
        <ThemedText type="defaultSemiBold" style={styles.itemName}>{item.name}</ThemedText>
        <ThemedText style={[styles.itemDesc, { color: colors.textSecondary }]}>
          {item.description}
        </ThemedText>
      </View>
      
      <View style={styles.itemPrice}>
        {isOwned ? (
          <View style={[styles.ownedBadge, { backgroundColor: colors.success + "30" }]}>
            <IconSymbol name="checkmark" size={16} color={colors.success} />
            <ThemedText style={{ color: colors.success, fontSize: 12 }}>Posseduto</ThemedText>
          </View>
        ) : (
          <Pressable 
            style={[
              styles.buyButton, 
              { backgroundColor: canAfford ? RARITY_COLORS[item.rarity] : colors.error + "30" }
            ]}
            onPress={onPurchase}
          >
            <IconSymbol name="leaf.fill" size={14} color={canAfford ? "#FFF" : colors.error} />
            <ThemedText style={[
              styles.priceText, 
              { color: canAfford ? "#FFF" : colors.error }
            ]}>
              {item.price}
            </ThemedText>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

// Full 3D Preview Modal
function PreviewModal({ 
  item, 
  visible, 
  onClose,
  onPurchase,
  isOwned,
  canAfford,
}: { 
  item: ShopItem | null; 
  visible: boolean; 
  onClose: () => void;
  onPurchase: () => void;
  isOwned: boolean;
  canAfford: boolean;
}) {
  if (!item) return null;
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <LinearGradient 
            colors={['#1a1a2e', '#16213e', '#0f3460']} 
            style={styles.modalGradient}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalRarity, { backgroundColor: RARITY_COLORS[item.rarity] }]}>
                <ThemedText style={styles.modalRarityText}>{item.rarity.toUpperCase()}</ThemedText>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <ThemedText style={styles.closeText}>✕</ThemedText>
              </Pressable>
            </View>
            
            {/* 3D View */}
            <View style={styles.modal3DView}>
              <Canvas>
                <ambientLight intensity={0.5} />
                <pointLight position={[5, 5, 5]} intensity={1} />
                <pointLight position={[-5, 3, -5]} intensity={0.5} color={RARITY_COLORS[item.rarity]} />
                <PerspectiveCamera makeDefault position={[0, 0, 4]} />
                <OrbitControls enableZoom={true} enablePan={false} />
                <Suspense fallback={null}>
                  {item.modelPath && <ModelPreview3D modelPath={item.modelPath} />}
                </Suspense>
              </Canvas>
            </View>
            
            {/* Info */}
            <View style={styles.modalInfo}>
              <ThemedText style={styles.modalTitle}>{item.icon} {item.name}</ThemedText>
              <ThemedText style={styles.modalDesc}>{item.description}</ThemedText>
              
              {/* Stats */}
              <View style={styles.modalStats}>
                <View style={styles.modalStat}>
                  <ThemedText style={styles.modalStatLabel}>Categoria</ThemedText>
                  <ThemedText style={styles.modalStatValue}>{item.category}</ThemedText>
                </View>
                <View style={styles.modalStat}>
                  <ThemedText style={styles.modalStatLabel}>Rarità</ThemedText>
                  <ThemedText style={[styles.modalStatValue, { color: RARITY_COLORS[item.rarity] }]}>
                    {item.rarity}
                  </ThemedText>
                </View>
              </View>
              
              {/* Purchase Button */}
              {isOwned ? (
                <View style={[styles.modalOwnedBadge]}>
                  <ThemedText style={styles.modalOwnedText}>✓ Già Posseduto</ThemedText>
                </View>
              ) : (
                <Pressable 
                  style={[
                    styles.modalBuyButton, 
                    { backgroundColor: canAfford ? RARITY_COLORS[item.rarity] : '#6b7280' }
                  ]}
                  onPress={onPurchase}
                  disabled={!canAfford}
                >
                  <IconSymbol name="leaf.fill" size={20} color="#FFF" />
                  <ThemedText style={styles.modalBuyText}>
                    {canAfford ? `Acquista per ${item.price}` : `Servono ${item.price} GLeaf`}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  
  const [gleaf, setGleaf] = useState(1000); // Starting with some GLeaf for testing
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [ownedItems, setOwnedItems] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<ShopItem | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stats = await AsyncStorage.getItem("gameStats");
      if (stats) {
        const parsed = JSON.parse(stats);
        setGleaf(parsed.gleaf || 1000);
      }
      const owned = await AsyncStorage.getItem("ownedItems");
      if (owned) {
        setOwnedItems(JSON.parse(owned));
      }
    } catch (error) {
      console.error("Error loading shop data:", error);
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    if (gleaf < item.price) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (ownedItems.includes(item.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newGleaf = gleaf - item.price;
    const newOwnedItems = [...ownedItems, item.id];

    setGleaf(newGleaf);
    setOwnedItems(newOwnedItems);
    setShowPreview(false);

    // Save to storage
    const stats = await AsyncStorage.getItem("gameStats");
    const parsed = stats ? JSON.parse(stats) : {};
    await AsyncStorage.setItem("gameStats", JSON.stringify({ ...parsed, gleaf: newGleaf }));
    await AsyncStorage.setItem("ownedItems", JSON.stringify(newOwnedItems));
  };

  const filteredItems = selectedCategory === "all" 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === selectedCategory);

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.headerTitle}>Shop 3D</ThemedText>
          <View style={styles.gleafBadge}>
            <IconSymbol name="leaf.fill" size={20} color="#22c55e" />
            <ThemedText style={styles.gleafText}>{gleaf.toLocaleString()}</ThemedText>
          </View>
        </View>

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map(cat => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory === cat.id && styles.categoryButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedCategory(cat.id);
              }}
            >
              <ThemedText style={styles.categoryIcon}>{cat.icon}</ThemedText>
              <ThemedText style={[
                styles.categoryText,
                selectedCategory === cat.id && styles.categoryTextActive,
              ]}>
                {cat.name}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Items Grid */}
        <FlatList
          data={filteredItems}
          keyExtractor={item => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <ShopItemCard
              item={item}
              isOwned={ownedItems.includes(item.id)}
              canAfford={gleaf >= item.price}
              onPurchase={() => handlePurchase(item)}
              onPreview={() => {
                setPreviewItem(item);
                setShowPreview(true);
              }}
              colors={colors}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          columnWrapperStyle={styles.columnWrapper}
        />
      </View>
      
      {/* Preview Modal */}
      <PreviewModal
        item={previewItem}
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        onPurchase={() => previewItem && handlePurchase(previewItem)}
        isOwned={previewItem ? ownedItems.includes(previewItem.id) : false}
        canAfford={previewItem ? gleaf >= previewItem.price : false}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { color: '#fff', fontSize: 28 },
  gleafBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  gleafText: { fontSize: 18, fontWeight: "700", color: '#166534' },
  categoriesContainer: { maxHeight: 60, marginBottom: 8 },
  categoriesContent: { paddingHorizontal: 16, gap: 8 },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  categoryButtonActive: { backgroundColor: 'rgba(255,255,255,0.95)' },
  categoryIcon: { fontSize: 16 },
  categoryText: { fontSize: 14, fontWeight: "600", color: '#fff' },
  categoryTextActive: { color: '#166534' },
  listContent: { padding: 12, paddingBottom: 100 },
  columnWrapper: { justifyContent: 'space-between' },
  itemCard: {
    width: (width - 36) / 2,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
  },
  itemOwned: { opacity: 0.7 },
  rarityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    zIndex: 10,
  },
  rarityText: { fontSize: 8, fontWeight: 'bold', color: '#fff' },
  preview3D: { height: 100, backgroundColor: 'rgba(0,0,0,0.2)' },
  itemInfo: { padding: 12 },
  itemName: { fontSize: 14, color: '#fff' },
  itemDesc: { fontSize: 11, marginTop: 4 },
  itemPrice: { paddingHorizontal: 12, paddingBottom: 12 },
  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  priceText: { fontSize: 14, fontWeight: "700" },
  ownedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 12,
    gap: 6,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalGradient: { flex: 1, padding: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalRarity: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  modalRarityText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  closeButton: { padding: 8 },
  closeText: { color: '#fff', fontSize: 24 },
  modal3DView: { height: 250, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, marginBottom: 20 },
  modalInfo: { flex: 1 },
  modalTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  modalDesc: { fontSize: 16, color: '#94a3b8', marginBottom: 20 },
  modalStats: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  modalStat: {},
  modalStatLabel: { fontSize: 12, color: '#64748b' },
  modalStatValue: { fontSize: 16, fontWeight: 'bold', color: '#fff', textTransform: 'capitalize' },
  modalOwnedBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalOwnedText: { color: '#22c55e', fontSize: 18, fontWeight: 'bold' },
  modalBuyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  modalBuyText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
