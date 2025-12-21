// @ts-nocheck
import React, { useState, useRef, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { FadeIn, SlideInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

type ItemCategory = 'plants' | 'decorations' | 'structures' | 'lighting';

interface GardenItem {
  id: string;
  name: string;
  category: ItemCategory;
  icon: string;
  price: number;
  size: { width: number; depth: number };
  color: string;
}

interface PlacedItem {
  id: string;
  itemId: string;
  position: { x: number; y: number; z: number };
  rotation: number;
}

const GARDEN_ITEMS: GardenItem[] = [
  // Plants
  { id: 'plant_small', name: 'Pianta Piccola', category: 'plants', icon: '🌱', price: 50, size: { width: 1, depth: 1 }, color: '#22c55e' },
  { id: 'plant_medium', name: 'Pianta Media', category: 'plants', icon: '🌿', price: 100, size: { width: 1.5, depth: 1.5 }, color: '#16a34a' },
  { id: 'plant_large', name: 'Pianta Grande', category: 'plants', icon: '🌳', price: 200, size: { width: 2, depth: 2 }, color: '#15803d' },
  { id: 'flower_red', name: 'Fiore Rosso', category: 'plants', icon: '🌹', price: 75, size: { width: 0.5, depth: 0.5 }, color: '#ef4444' },
  { id: 'flower_yellow', name: 'Fiore Giallo', category: 'plants', icon: '🌻', price: 75, size: { width: 0.5, depth: 0.5 }, color: '#eab308' },
  
  // Decorations
  { id: 'rock_small', name: 'Roccia Piccola', category: 'decorations', icon: '🪨', price: 30, size: { width: 0.8, depth: 0.8 }, color: '#6b7280' },
  { id: 'rock_large', name: 'Roccia Grande', category: 'decorations', icon: '⛰️', price: 80, size: { width: 1.5, depth: 1.5 }, color: '#4b5563' },
  { id: 'gnome', name: 'Gnomo', category: 'decorations', icon: '🧙', price: 150, size: { width: 0.5, depth: 0.5 }, color: '#dc2626' },
  { id: 'fountain', name: 'Fontana', category: 'decorations', icon: '⛲', price: 500, size: { width: 2, depth: 2 }, color: '#0ea5e9' },
  { id: 'bench', name: 'Panchina', category: 'decorations', icon: '🪑', price: 120, size: { width: 2, depth: 0.8 }, color: '#78350f' },
  
  // Structures
  { id: 'fence', name: 'Recinzione', category: 'structures', icon: '🚧', price: 40, size: { width: 2, depth: 0.2 }, color: '#a16207' },
  { id: 'path', name: 'Sentiero', category: 'structures', icon: '🛤️', price: 25, size: { width: 1, depth: 2 }, color: '#d6d3d1' },
  { id: 'greenhouse', name: 'Serra', category: 'structures', icon: '🏠', price: 1000, size: { width: 4, depth: 4 }, color: '#a3e635' },
  { id: 'shed', name: 'Capanno', category: 'structures', icon: '🏚️', price: 750, size: { width: 3, depth: 3 }, color: '#92400e' },
  
  // Lighting
  { id: 'lamp_post', name: 'Lampione', category: 'lighting', icon: '🏮', price: 100, size: { width: 0.5, depth: 0.5 }, color: '#fbbf24' },
  { id: 'string_lights', name: 'Lucine', category: 'lighting', icon: '✨', price: 80, size: { width: 3, depth: 0.1 }, color: '#fef08a' },
  { id: 'solar_light', name: 'Luce Solare', category: 'lighting', icon: '☀️', price: 60, size: { width: 0.3, depth: 0.3 }, color: '#facc15' },
];

const CATEGORY_ICONS = {
  plants: '🌿',
  decorations: '🎨',
  structures: '🏗️',
  lighting: '💡',
};

const GRID_SIZE = 10;
const CELL_SIZE = 1;

// 3D Garden Item
function GardenItem3D({ item, position, rotation, isSelected, onSelect }: { 
  item: GardenItem; 
  position: { x: number; y: number; z: number }; 
  rotation: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.position.y = position.y + Math.sin(state.clock.elapsedTime * 3) * 0.1;
    }
  });

  const getGeometry = () => {
    switch (item.category) {
      case 'plants':
        return <coneGeometry args={[item.size.width / 2, item.size.width * 1.5, 8]} />;
      case 'decorations':
        return <dodecahedronGeometry args={[item.size.width / 2, 0]} />;
      case 'structures':
        return <boxGeometry args={[item.size.width, item.size.width * 0.8, item.size.depth]} />;
      case 'lighting':
        return <sphereGeometry args={[item.size.width / 2, 16, 16]} />;
      default:
        return <boxGeometry args={[item.size.width, 1, item.size.depth]} />;
    }
  };

  return (
    <group position={[position.x, position.y, position.z]} rotation={[0, rotation, 0]}>
      <mesh ref={meshRef} onClick={onSelect}>
        {getGeometry()}
        <meshStandardMaterial 
          color={item.color} 
          emissive={isSelected ? item.color : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : 0}
          metalness={item.category === 'lighting' ? 0.8 : 0.2}
          roughness={item.category === 'lighting' ? 0.2 : 0.6}
        />
      </mesh>
      
      {/* Selection indicator */}
      {isSelected && (
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[item.size.width * 0.6, item.size.width * 0.7, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.5} />
        </mesh>
      )}
    </group>
  );
}

// Ground Grid
function GroundGrid() {
  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <planeGeometry args={[GRID_SIZE, GRID_SIZE]} />
        <meshStandardMaterial color="#166534" />
      </mesh>
      
      {/* Grid lines */}
      <gridHelper args={[GRID_SIZE, GRID_SIZE, '#22c55e', '#15803d']} position={[0, 0, 0]} />
    </group>
  );
}

export default function GardenBuilderScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<ItemCategory>('plants');
  const [selectedItem, setSelectedItem] = useState<GardenItem | null>(null);
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [selectedPlacedItem, setSelectedPlacedItem] = useState<string | null>(null);
  const [playerCoins, setPlayerCoins] = useState(5000);
  const [showInventory, setShowInventory] = useState(true);
  const [isPlacingMode, setIsPlacingMode] = useState(false);

  const filteredItems = GARDEN_ITEMS.filter(item => item.category === activeCategory);

  const placeItem = (gridX: number, gridZ: number) => {
    if (!selectedItem) return;
    if (playerCoins < selectedItem.price) return;

    const newPlacedItem: PlacedItem = {
      id: Date.now().toString(),
      itemId: selectedItem.id,
      position: { x: gridX - GRID_SIZE / 2 + 0.5, y: selectedItem.size.width / 2, z: gridZ - GRID_SIZE / 2 + 0.5 },
      rotation: 0,
    };

    setPlacedItems(prev => [...prev, newPlacedItem]);
    setPlayerCoins(prev => prev - selectedItem.price);
    setSelectedItem(null);
    setIsPlacingMode(false);
  };

  const deleteSelectedItem = () => {
    if (!selectedPlacedItem) return;
    
    const itemToDelete = placedItems.find(p => p.id === selectedPlacedItem);
    if (itemToDelete) {
      const gardenItem = GARDEN_ITEMS.find(g => g.id === itemToDelete.itemId);
      if (gardenItem) {
        setPlayerCoins(prev => prev + Math.floor(gardenItem.price * 0.5)); // 50% refund
      }
    }
    
    setPlacedItems(prev => prev.filter(p => p.id !== selectedPlacedItem));
    setSelectedPlacedItem(null);
  };

  const rotateSelectedItem = () => {
    if (!selectedPlacedItem) return;
    setPlacedItems(prev => prev.map(p => 
      p.id === selectedPlacedItem 
        ? { ...p, rotation: p.rotation + Math.PI / 4 }
        : p
    ));
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <ThemedText style={styles.headerTitle}>Garden Builder</ThemedText>
          <View style={styles.coinsContainer}>
            <ThemedText style={styles.coinsText}>💰 {playerCoins}</ThemedText>
          </View>
        </View>

        {/* 3D Canvas */}
        <View style={styles.canvasContainer}>
          <Canvas camera={{ position: [8, 8, 8], fov: 50 }}>
            <ambientLight intensity={0.4} />
            <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
            <pointLight position={[-10, 10, -10]} intensity={0.3} color="#22c55e" />
            
            <OrbitControls 
              enableZoom={true} 
              enablePan={true}
              minDistance={5}
              maxDistance={20}
              maxPolarAngle={Math.PI / 2.2}
            />
            
            <Suspense fallback={null}>
              <GroundGrid />
              
              {/* Placed items */}
              {placedItems.map(placed => {
                const gardenItem = GARDEN_ITEMS.find(g => g.id === placed.itemId);
                if (!gardenItem) return null;
                return (
                  <GardenItem3D
                    key={placed.id}
                    item={gardenItem}
                    position={placed.position}
                    rotation={placed.rotation}
                    isSelected={selectedPlacedItem === placed.id}
                    onSelect={() => setSelectedPlacedItem(placed.id)}
                  />
                );
              })}
            </Suspense>
          </Canvas>

          {/* Placement Grid Overlay */}
          {isPlacingMode && selectedItem && (
            <View style={styles.placementOverlay}>
              <ThemedText style={styles.placementText}>
                Tocca sulla griglia per posizionare {selectedItem.name}
              </ThemedText>
              <View style={styles.placementGrid}>
                {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, index) => {
                  const x = index % GRID_SIZE;
                  const z = Math.floor(index / GRID_SIZE);
                  return (
                    <Pressable
                      key={index}
                      style={styles.gridCell}
                      onPress={() => placeItem(x, z)}
                    />
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Selected Item Actions */}
        {selectedPlacedItem && (
          <Animated.View entering={SlideInUp} style={styles.actionsBar}>
            <Pressable style={styles.actionButton} onPress={rotateSelectedItem}>
              <ThemedText style={styles.actionIcon}>🔄</ThemedText>
              <ThemedText style={styles.actionText}>Ruota</ThemedText>
            </Pressable>
            <Pressable style={[styles.actionButton, styles.deleteButton]} onPress={deleteSelectedItem}>
              <ThemedText style={styles.actionIcon}>🗑️</ThemedText>
              <ThemedText style={styles.actionText}>Elimina</ThemedText>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => setSelectedPlacedItem(null)}>
              <ThemedText style={styles.actionIcon}>✓</ThemedText>
              <ThemedText style={styles.actionText}>Deseleziona</ThemedText>
            </Pressable>
          </Animated.View>
        )}

        {/* Inventory Panel */}
        {showInventory && !selectedPlacedItem && (
          <Animated.View entering={SlideInUp} style={styles.inventoryPanel}>
            {/* Category Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
              {(Object.keys(CATEGORY_ICONS) as ItemCategory[]).map(cat => (
                <Pressable
                  key={cat}
                  style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
                  onPress={() => setActiveCategory(cat)}
                >
                  <ThemedText style={styles.categoryIcon}>{CATEGORY_ICONS[cat]}</ThemedText>
                  <ThemedText style={[styles.categoryName, activeCategory === cat && styles.categoryNameActive]}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>

            {/* Items Grid */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
              {filteredItems.map(item => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.itemCard,
                    selectedItem?.id === item.id && styles.itemCardSelected,
                    playerCoins < item.price && styles.itemCardDisabled
                  ]}
                  onPress={() => {
                    if (playerCoins >= item.price) {
                      setSelectedItem(item);
                      setIsPlacingMode(true);
                    }
                  }}
                >
                  <ThemedText style={styles.itemIcon}>{item.icon}</ThemedText>
                  <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                  <ThemedText style={[
                    styles.itemPrice,
                    playerCoins < item.price && styles.itemPriceDisabled
                  ]}>
                    💰 {item.price}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Toggle Inventory Button */}
        <Pressable 
          style={[styles.toggleButton, { bottom: Math.max(insets.bottom, 10) + (showInventory ? 180 : 10) }]}
          onPress={() => setShowInventory(!showInventory)}
        >
          <ThemedText style={styles.toggleButtonText}>
            {showInventory ? '▼ Nascondi' : '▲ Inventario'}
          </ThemedText>
        </Pressable>

        {/* Stats */}
        <View style={styles.statsBar}>
          <ThemedText style={styles.statsText}>
            Oggetti: {placedItems.length} | Valore: 💰{placedItems.reduce((sum, p) => {
              const item = GARDEN_ITEMS.find(g => g.id === p.itemId);
              return sum + (item?.price || 0);
            }, 0)}
          </ThemedText>
        </View>
      </LinearGradient>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  coinsContainer: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  coinsText: { color: '#f59e0b', fontSize: 14, fontWeight: 'bold' },
  canvasContainer: { flex: 1, marginHorizontal: 10, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)' },
  placementOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  placementText: { color: '#fff', fontSize: 14, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 10 },
  placementGrid: { flexDirection: 'row', flexWrap: 'wrap', width: width - 40, aspectRatio: 1 },
  gridCell: { width: `${100 / GRID_SIZE}%`, aspectRatio: 1, borderWidth: 0.5, borderColor: 'rgba(34,197,94,0.3)' },
  actionsBar: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 10, gap: 20 },
  actionButton: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  deleteButton: { backgroundColor: 'rgba(239,68,68,0.2)' },
  actionIcon: { fontSize: 24 },
  actionText: { color: '#fff', fontSize: 12, marginTop: 4 },
  inventoryPanel: { backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  categoryTabs: { paddingHorizontal: 10, marginBottom: 10 },
  categoryTab: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, marginRight: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  categoryTabActive: { backgroundColor: 'rgba(34,197,94,0.3)' },
  categoryIcon: { fontSize: 20 },
  categoryName: { color: '#9ca3af', fontSize: 11, marginTop: 2 },
  categoryNameActive: { color: '#22c55e' },
  itemsScroll: { paddingHorizontal: 10 },
  itemCard: { width: 90, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, marginRight: 10 },
  itemCardSelected: { backgroundColor: 'rgba(34,197,94,0.3)', borderWidth: 2, borderColor: '#22c55e' },
  itemCardDisabled: { opacity: 0.5 },
  itemIcon: { fontSize: 32, marginBottom: 4 },
  itemName: { color: '#fff', fontSize: 11, textAlign: 'center', marginBottom: 4 },
  itemPrice: { color: '#f59e0b', fontSize: 12, fontWeight: 'bold' },
  itemPriceDisabled: { color: '#ef4444' },
  toggleButton: { position: 'absolute', left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
  toggleButtonText: { color: '#a7f3d0', fontSize: 14 },
  statsBar: { position: 'absolute', top: 100, right: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statsText: { color: '#a7f3d0', fontSize: 12 },
});
