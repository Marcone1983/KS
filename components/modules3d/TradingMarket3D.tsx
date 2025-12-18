import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert, Dimensions } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const COLORS = {
  background: '#1a1a2e',
  primary: '#228B22',
  accent: '#FFD700',
  text: '#FFFFFF',
  subtleText: '#a9a9a9',
  cardBg: '#2a2a3e',
};

interface MarketItem {
  id: string;
  name: string;
  price: number;
  modelType: 'sword' | 'rifle' | 'armor' | 'boots';
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface Bid {
  itemId: string;
  amount: number;
  timestamp: number;
}

const RARITY_COLORS = {
  common: '#FFFFFF',
  rare: '#4169E1',
  epic: '#9932CC',
  legendary: '#FFD700',
};

const marketItems: MarketItem[] = [
  { id: '1', name: 'Cyber Sword', price: 150, modelType: 'sword', description: 'A sharp blade from the future.', rarity: 'rare' },
  { id: '2', name: 'Plasma Rifle', price: 300, modelType: 'rifle', description: 'Shoots bolts of pure energy.', rarity: 'epic' },
  { id: '3', name: 'Stealth Armor', price: 500, modelType: 'armor', description: 'Become invisible to your foes.', rarity: 'legendary' },
  { id: '4', name: 'Gravity Boots', price: 250, modelType: 'boots', description: 'Defy gravity with every step.', rarity: 'rare' },
];

function ItemModel3D({ modelType }: { modelType: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const geometry = useMemo(() => {
    switch (modelType) {
      case 'sword':
        return <boxGeometry args={[0.1, 1.5, 0.1]} />;
      case 'rifle':
        return <boxGeometry args={[0.2, 0.3, 1.2]} />;
      case 'armor':
        return <boxGeometry args={[0.8, 1, 0.4]} />;
      case 'boots':
        return <boxGeometry args={[0.4, 0.3, 0.6]} />;
      default:
        return <boxGeometry args={[0.5, 0.5, 0.5]} />;
    }
  }, [modelType]);

  return (
    <mesh ref={meshRef}>
      {geometry}
      <meshStandardMaterial color={COLORS.accent} metalness={0.8} roughness={0.2} />
    </mesh>
  );
}

function ItemCard({ item, onSelect }: { item: MarketItem; onSelect: () => void }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <TouchableOpacity
      onPress={onSelect}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={[styles.itemCard, animatedStyle]}>
        <View style={styles.item3DPreview}>
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <PerspectiveCamera makeDefault position={[0, 0, 3]} />
            <ItemModel3D modelType={item.modelType} />
          </Canvas>
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: RARITY_COLORS[item.rarity] }]}>{item.name}</Text>
          <Text style={styles.itemPrice}>{item.price} G-Leaf</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

function ItemDetail({ item, onClose, onBuy, onBid }: { 
  item: MarketItem; 
  onClose: () => void; 
  onBuy: () => void; 
  onBid: () => void;
}) {
  return (
    <View style={styles.detailContainer}>
      <View style={styles.detail3DView}>
        <Canvas>
          <ambientLight intensity={0.6} />
          <pointLight position={[5, 5, 5]} intensity={1} />
          <PerspectiveCamera makeDefault position={[0, 0, 4]} />
          <OrbitControls enableZoom={false} />
          <ItemModel3D modelType={item.modelType} />
        </Canvas>
      </View>
      <View style={styles.detailInfo}>
        <Text style={[styles.detailName, { color: RARITY_COLORS[item.rarity] }]}>{item.name}</Text>
        <Text style={styles.detailDescription}>{item.description}</Text>
        <Text style={styles.detailPrice}>{item.price} G-Leaf</Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.button} onPress={onBuy}>
            <Text style={styles.buttonText}>Buy Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.bidButton]} onPress={onBid}>
            <Text style={styles.buttonText}>Place Bid</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function TradingMarket3D() {
  const [selectedItem, setSelectedItem] = useState<MarketItem | null>(null);
  const [cart, setCart] = useState<string[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedCart = await AsyncStorage.getItem('@TradingMarket3D:cart');
        if (savedCart) setCart(JSON.parse(savedCart));
        const savedBids = await AsyncStorage.getItem('@TradingMarket3D:bids');
        if (savedBids) setBids(JSON.parse(savedBids));
      } catch (e) {
        console.error('Failed to load data');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const saveData = async () => {
      try {
        await AsyncStorage.setItem('@TradingMarket3D:cart', JSON.stringify(cart));
        await AsyncStorage.setItem('@TradingMarket3D:bids', JSON.stringify(bids));
      } catch (e) {
        console.error('Failed to save data');
      }
    };
    saveData();
  }, [cart, bids]);

  const handleBuy = (item: MarketItem) => {
    setCart([...cart, item.id]);
    Alert.alert('Success', `${item.name} added to cart!`);
    setSelectedItem(null);
  };

  const handleBid = (item: MarketItem) => {
    const newBid: Bid = {
      itemId: item.id,
      amount: item.price + 10,
      timestamp: Date.now(),
    };
    setBids([...bids, newBid]);
    Alert.alert('Bid Placed', `Bid of ${newBid.amount} G-Leaf placed on ${item.name}`);
    setSelectedItem(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trading Market</Text>
        <Text style={styles.cartCount}>Cart: {cart.length}</Text>
      </View>

      <FlatList
        data={marketItems}
        keyExtractor={(item) => item.id}
        numColumns={2}
        renderItem={({ item }) => (
          <ItemCard item={item} onSelect={() => setSelectedItem(item)} />
        )}
        contentContainerStyle={styles.listContainer}
      />

      {selectedItem && (
        <ItemDetail
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onBuy={() => handleBuy(selectedItem)}
          onBid={() => handleBid(selectedItem)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  cartCount: {
    fontSize: 16,
    color: COLORS.accent,
  },
  listContainer: {
    padding: 10,
  },
  itemCard: {
    flex: 1,
    margin: 8,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    maxWidth: (width - 36) / 2,
  },
  item3DPreview: {
    height: 150,
    backgroundColor: '#1a1a2e',
  },
  itemInfo: {
    padding: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 4,
  },
  detailContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.98)',
    zIndex: 10,
  },
  detail3DView: {
    flex: 1,
  },
  detailInfo: {
    padding: 20,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  detailName: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 16,
    color: COLORS.subtleText,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailPrice: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 24,
  },
  bidButton: {
    backgroundColor: COLORS.accent,
  },
  buttonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    alignSelf: 'center',
    padding: 12,
  },
  closeButtonText: {
    color: COLORS.subtleText,
    fontSize: 16,
  },
});
