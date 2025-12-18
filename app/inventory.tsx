import { useRouter } from "expo-router";
import React, { useState, useEffect, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, FlatList, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { useSounds } from '@/hooks/use-sounds';

const { width } = Dimensions.get('window');

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'nutrients' | 'powerups' | 'marketplace' | 'badges' | 'crafted';
  quantity: number;
  modelPath?: any;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  usable: boolean;
  effect?: { type: string; value: number; duration?: number };
}

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const CATEGORY_ICONS = {
  nutrients: '🧪',
  powerups: '⚡',
  marketplace: '🏠',
  badges: '🏆',
  crafted: '🔮',
};

// 3D Model Preview
function ItemModel3D({ modelPath }: { modelPath: any }) {
  const groupRef = React.useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  try {
    const gltf = useGLTF(modelPath);
    const scene = Array.isArray(gltf) ? gltf[0].scene : gltf.scene;
    return (
      <group ref={groupRef}>
        <primitive object={scene.clone()} scale={1.5} />
      </group>
    );
  } catch {
    return (
      <mesh ref={groupRef as any}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    );
  }
}

// Inventory Item Card
function InventoryItemCard({ 
  item, 
  isSelected,
  onSelect,
  onUse,
}: { 
  item: InventoryItem;
  isSelected: boolean;
  onSelect: () => void;
  onUse: () => void;
}) {
  return (
    <Pressable 
      style={[
        styles.itemCard,
        { borderColor: isSelected ? RARITY_COLORS[item.rarity] : 'transparent' },
        isSelected && styles.itemCardSelected,
      ]}
      onPress={onSelect}
    >
      <View style={[styles.itemIconBg, { backgroundColor: RARITY_COLORS[item.rarity] + '30' }]}>
        <ThemedText style={styles.itemIcon}>{item.icon}</ThemedText>
        {item.quantity > 1 && (
          <View style={styles.quantityBadge}>
            <ThemedText style={styles.quantityText}>x{item.quantity}</ThemedText>
          </View>
        )}
      </View>
      <ThemedText style={styles.itemName} numberOfLines={1}>{item.name}</ThemedText>
      <View style={[styles.rarityDot, { backgroundColor: RARITY_COLORS[item.rarity] }]} />
    </Pressable>
  );
}

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const ownedItems = await AsyncStorage.getItem('ownedItems');
      const craftedItems = await AsyncStorage.getItem('craftedItems');
      
      const owned = ownedItems ? JSON.parse(ownedItems) : [];
      const crafted = craftedItems ? JSON.parse(craftedItems) : [];
      
      // Convert owned items to inventory format
      const inventoryItems: InventoryItem[] = [];
      
      // Add shop items
      const shopItemsMap: Record<string, Partial<InventoryItem>> = {
        'water_bottle': { name: 'Bottiglia Acqua', icon: '💧', category: 'nutrients', rarity: 'common', usable: true, effect: { type: 'water', value: 30 } },
        'fertilizer_bag': { name: 'Sacco Fertilizzante', icon: '🌿', category: 'nutrients', rarity: 'common', usable: true, effect: { type: 'nutrients', value: 25 } },
        'crystal_green': { name: 'Cristallo Verde', icon: '💎', category: 'nutrients', rarity: 'rare', usable: true, effect: { type: 'nutrients', value: 40 } },
        'crystal_blue': { name: 'Cristallo Blu', icon: '💎', category: 'nutrients', rarity: 'rare', usable: true, effect: { type: 'water', value: 50 } },
        'crystal_gold': { name: 'Cristallo Oro', icon: '💎', category: 'nutrients', rarity: 'legendary', usable: true, effect: { type: 'all', value: 60 } },
        'super_spray': { name: 'Super Spray', icon: '🔫', category: 'powerups', rarity: 'rare', usable: true, effect: { type: 'damage', value: 200, duration: 30 } },
        'health_potion': { name: 'Pozione Salute', icon: '❤️', category: 'powerups', rarity: 'common', usable: true, effect: { type: 'health', value: 100 } },
        'shield_barrier': { name: 'Scudo Barriera', icon: '🛡️', category: 'powerups', rarity: 'rare', usable: true, effect: { type: 'shield', value: 60, duration: 60 } },
        'growth_elixir': { name: 'Elisir Crescita', icon: '📈', category: 'powerups', rarity: 'epic', usable: true, effect: { type: 'growth', value: 200, duration: 120 } },
        'ultimate_serum': { name: 'Siero Definitivo', icon: '⚡', category: 'powerups', rarity: 'legendary', usable: true, effect: { type: 'all', value: 300, duration: 60 } },
        'pot_basic': { name: 'Vaso Base', icon: '🏺', category: 'marketplace', rarity: 'common', usable: false },
        'pot_premium': { name: 'Vaso Premium', icon: '🏺', category: 'marketplace', rarity: 'rare', usable: false },
        'pot_legendary': { name: 'Vaso Leggendario', icon: '🏺', category: 'marketplace', rarity: 'legendary', usable: false },
        'badge_bronze': { name: 'Badge Bronzo', icon: '🥉', category: 'badges', rarity: 'common', usable: false },
        'badge_silver': { name: 'Badge Argento', icon: '🥈', category: 'badges', rarity: 'rare', usable: false },
        'badge_gold': { name: 'Badge Oro', icon: '🥇', category: 'badges', rarity: 'epic', usable: false },
        'trophy': { name: 'Trofeo Campione', icon: '🏆', category: 'badges', rarity: 'legendary', usable: false },
        'crown': { name: 'Corona Premium', icon: '👑', category: 'badges', rarity: 'legendary', usable: false },
      };

      // Count quantities
      const itemCounts: Record<string, number> = {};
      owned.forEach((id: string) => {
        itemCounts[id] = (itemCounts[id] || 0) + 1;
      });

      Object.entries(itemCounts).forEach(([id, quantity]) => {
        const itemData = shopItemsMap[id];
        if (itemData) {
          inventoryItems.push({
            id,
            name: itemData.name || id,
            description: `${itemData.category} item`,
            icon: itemData.icon || '📦',
            category: itemData.category || 'powerups',
            quantity,
            rarity: itemData.rarity || 'common',
            usable: itemData.usable || false,
            effect: itemData.effect,
          });
        }
      });

      // Add crafted items
      crafted.forEach((id: string) => {
        const existing = inventoryItems.find(i => i.id === id);
        if (existing) {
          existing.quantity++;
        } else {
          inventoryItems.push({
            id,
            name: id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            description: 'Oggetto craftato',
            icon: '🔮',
            category: 'crafted',
            quantity: 1,
            rarity: 'epic',
            usable: true,
          });
        }
      });

      setInventory(inventoryItems);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setIsLoading(false);
    }
  };

  const handleUseItem = async (item: InventoryItem) => {
    if (!item.usable || item.quantity <= 0) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    play('inv_equip');

    // Decrease quantity
    const newInventory = inventory.map(i => {
      if (i.id === item.id) {
        return { ...i, quantity: i.quantity - 1 };
      }
      return i;
    }).filter(i => i.quantity > 0);

    setInventory(newInventory);
    setSelectedItem(null);

    // Apply effect
    if (item.effect) {
      Alert.alert(
        'Oggetto Usato!',
        `${item.name} attivato!\n${item.effect.type}: +${item.effect.value}${item.effect.duration ? ` per ${item.effect.duration}s` : ''}`
      );
    }

    // Update storage
    const ownedItems = await AsyncStorage.getItem('ownedItems');
    if (ownedItems) {
      const owned = JSON.parse(ownedItems);
      const index = owned.indexOf(item.id);
      if (index > -1) {
        owned.splice(index, 1);
        await AsyncStorage.setItem('ownedItems', JSON.stringify(owned));
      }
    }
  };

  const filteredInventory = selectedCategory === 'all' 
    ? inventory 
    : inventory.filter(item => item.category === selectedCategory);

  const categories = [
    { id: 'all', name: 'Tutti', icon: '📦' },
    { id: 'nutrients', name: 'Nutrienti', icon: '🧪' },
    { id: 'powerups', name: 'Power-up', icon: '⚡' },
    { id: 'marketplace', name: 'Decorazioni', icon: '🏠' },
    { id: 'badges', name: 'Badge', icon: '🏆' },
    { id: 'crafted', name: 'Craftati', icon: '🔮' },
  ];

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        </View>

        <ThemedText style={styles.title}>Inventario 3D</ThemedText>
        <ThemedText style={styles.subtitle}>{inventory.length} oggetti totali</ThemedText>

        {/* 3D Preview */}
        {selectedItem && (
          <View style={styles.preview3D}>
            <Canvas>
              <ambientLight intensity={0.5} />
              <pointLight position={[5, 5, 5]} intensity={1} />
              <pointLight position={[-5, 3, -5]} intensity={0.5} color={RARITY_COLORS[selectedItem.rarity]} />
              <PerspectiveCamera makeDefault position={[0, 0, 3]} />
              <OrbitControls enableZoom={false} enablePan={false} />
              <Suspense fallback={null}>
                {selectedItem.modelPath ? (
                  <ItemModel3D modelPath={selectedItem.modelPath} />
                ) : (
                  <mesh>
                    <boxGeometry args={[0.8, 0.8, 0.8]} />
                    <meshStandardMaterial color={RARITY_COLORS[selectedItem.rarity]} />
                  </mesh>
                )}
              </Suspense>
            </Canvas>
            
            {/* Item Info */}
            <View style={styles.itemInfo}>
              <ThemedText style={styles.itemInfoName}>{selectedItem.icon} {selectedItem.name}</ThemedText>
              <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[selectedItem.rarity] }]}>
                <ThemedText style={styles.rarityText}>{selectedItem.rarity.toUpperCase()}</ThemedText>
              </View>
              <ThemedText style={styles.itemInfoQuantity}>Quantità: {selectedItem.quantity}</ThemedText>
              
              {selectedItem.usable && (
                <Pressable 
                  style={[styles.useButton, { backgroundColor: RARITY_COLORS[selectedItem.rarity] }]}
                  onPress={() => handleUseItem(selectedItem)}
                >
                  <ThemedText style={styles.useButtonText}>Usa Oggetto</ThemedText>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Categories */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map(cat => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoryButton,
                selectedCategory === cat.id && styles.categoryButtonActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                play('ui_tab_switch');
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

        {/* Inventory Grid */}
        {filteredInventory.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyIcon}>📦</ThemedText>
            <ThemedText style={styles.emptyText}>Inventario vuoto</ThemedText>
            <ThemedText style={styles.emptySubtext}>Acquista oggetti nello Shop!</ThemedText>
            <Pressable 
              style={styles.shopButton}
              onPress={() => router.push('/(tabs)/shop')}
            >
              <ThemedText style={styles.shopButtonText}>Vai allo Shop</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={filteredInventory}
            keyExtractor={item => item.id}
            numColumns={3}
            renderItem={({ item }) => (
              <InventoryItemCard
                item={item}
                isSelected={selectedItem?.id === item.id}
                onSelect={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  play('ui_tap_light');
                  setSelectedItem(item);
                }}
                onUse={() => handleUseItem(item)}
              />
            )}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  logo: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16,
  },
  preview3D: {
    height: 200,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  itemInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemInfoName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  rarityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemInfoQuantity: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  useButton: {
    marginLeft: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  useButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoriesContainer: {
    maxHeight: 50,
    marginBottom: 16,
  },
  categoriesContent: {
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    gap: 6,
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  categoryTextActive: {
    color: '#22c55e',
    fontWeight: 'bold',
  },
  gridContent: {
    paddingBottom: 100,
  },
  itemCard: {
    width: (width - 64) / 3,
    aspectRatio: 1,
    margin: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  itemIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  itemIcon: {
    fontSize: 24,
  },
  quantityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  quantityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemName: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
