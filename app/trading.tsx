import { useRouter } from "expo-router";
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, FlatList, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { useSounds } from '@/hooks/use-sounds';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface TradeItem {
  id: string;
  name: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  type: 'nutrient' | 'powerup' | 'decoration' | 'seed' | 'tool';
  quantity: number;
}

interface TradeOffer {
  id: string;
  seller: { id: string; name: string; avatar: string; rating: number };
  offering: TradeItem[];
  wanting: TradeItem[];
  price?: number;
  createdAt: string;
  expiresAt: string;
  status: 'active' | 'pending' | 'completed' | 'cancelled';
}

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

// 3D Trade Animation
function TradeAnimation3D({ isTrading }: { isTrading: boolean }) {
  const leftRef = React.useRef<THREE.Group>(null);
  const rightRef = React.useRef<THREE.Group>(null);
  const arrowRef = React.useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (leftRef.current && rightRef.current) {
      leftRef.current.rotation.y += 0.02;
      rightRef.current.rotation.y -= 0.02;
      
      if (isTrading) {
        const t = state.clock.elapsedTime;
        leftRef.current.position.x = -0.8 + Math.sin(t * 3) * 0.3;
        rightRef.current.position.x = 0.8 - Math.sin(t * 3) * 0.3;
      }
    }
    if (arrowRef.current) {
      arrowRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.2;
    }
  });

  return (
    <group>
      {/* Left item (offering) */}
      <group ref={leftRef} position={[-0.8, 0, 0]}>
        <mesh>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
        </mesh>
      </group>
      
      {/* Arrows */}
      <group ref={arrowRef} position={[0, 0, 0]}>
        <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.2, 8]} />
          <meshStandardMaterial color="#ffd700" />
        </mesh>
        <mesh position={[0, -0.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.1, 0.2, 8]} />
          <meshStandardMaterial color="#ffd700" />
        </mesh>
      </group>
      
      {/* Right item (wanting) */}
      <group ref={rightRef} position={[0.8, 0, 0]}>
        <mesh>
          <octahedronGeometry args={[0.25]} />
          <meshStandardMaterial color="#a855f7" />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </group>
  );
}

// Trade Offer Card
function TradeOfferCard({ 
  offer, 
  onAccept, 
  onDecline,
  isOwn 
}: { 
  offer: TradeOffer;
  onAccept: () => void;
  onDecline: () => void;
  isOwn: boolean;
}) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.98),
      withSpring(1)
    );
  };

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[styles.offerCard, animatedStyle]}>
        {/* Seller Info */}
        <View style={styles.sellerInfo}>
          <ThemedText style={styles.sellerAvatar}>{offer.seller.avatar}</ThemedText>
          <View style={styles.sellerDetails}>
            <ThemedText style={styles.sellerName}>{offer.seller.name}</ThemedText>
            <View style={styles.ratingContainer}>
              {Array.from({ length: 5 }).map((_, i) => (
                <ThemedText key={i} style={styles.ratingStar}>
                  {i < offer.seller.rating ? '⭐' : '☆'}
                </ThemedText>
              ))}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: offer.status === 'active' ? '#22c55e' : '#6b7280' }]}>
            <ThemedText style={styles.statusText}>
              {offer.status === 'active' ? 'Attivo' : offer.status}
            </ThemedText>
          </View>
        </View>
        
        {/* Trade Items */}
        <View style={styles.tradeItems}>
          {/* Offering */}
          <View style={styles.tradeColumn}>
            <ThemedText style={styles.tradeLabel}>Offre</ThemedText>
            {offer.offering.map((item, i) => (
              <View key={i} style={[styles.itemBadge, { borderColor: RARITY_COLORS[item.rarity] }]}>
                <ThemedText style={styles.itemIcon}>{item.icon}</ThemedText>
                <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                <ThemedText style={styles.itemQty}>x{item.quantity}</ThemedText>
              </View>
            ))}
          </View>
          
          {/* Arrow */}
          <View style={styles.tradeArrow}>
            <ThemedText style={styles.arrowIcon}>⇄</ThemedText>
          </View>
          
          {/* Wanting */}
          <View style={styles.tradeColumn}>
            <ThemedText style={styles.tradeLabel}>Vuole</ThemedText>
            {offer.wanting.map((item, i) => (
              <View key={i} style={[styles.itemBadge, { borderColor: RARITY_COLORS[item.rarity] }]}>
                <ThemedText style={styles.itemIcon}>{item.icon}</ThemedText>
                <ThemedText style={styles.itemName}>{item.name}</ThemedText>
                <ThemedText style={styles.itemQty}>x{item.quantity}</ThemedText>
              </View>
            ))}
            {offer.price && (
              <View style={styles.priceBadge}>
                <ThemedText style={styles.priceIcon}>🪙</ThemedText>
                <ThemedText style={styles.priceText}>{offer.price}</ThemedText>
              </View>
            )}
          </View>
        </View>
        
        {/* Actions */}
        {!isOwn && offer.status === 'active' && (
          <View style={styles.offerActions}>
            <Pressable style={styles.declineButton} onPress={onDecline}>
              <ThemedText style={styles.declineText}>Rifiuta</ThemedText>
            </Pressable>
            <Pressable style={styles.acceptButton} onPress={onAccept}>
              <ThemedText style={styles.acceptText}>Accetta</ThemedText>
            </Pressable>
          </View>
        )}
        
        {isOwn && (
          <View style={styles.ownBadge}>
            <ThemedText style={styles.ownText}>La tua offerta</ThemedText>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// Mock data
const MOCK_OFFERS: TradeOffer[] = [
  {
    id: '1',
    seller: { id: 'u1', name: 'GreenMaster', avatar: '👨‍🌾', rating: 5 },
    offering: [{ id: 'i1', name: 'Cristallo Verde', icon: '💎', rarity: 'rare', type: 'nutrient', quantity: 3 }],
    wanting: [{ id: 'i2', name: 'Super Spray', icon: '🔫', rarity: 'epic', type: 'powerup', quantity: 1 }],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    status: 'active',
  },
  {
    id: '2',
    seller: { id: 'u2', name: 'PlantLover', avatar: '👩‍🌾', rating: 4 },
    offering: [{ id: 'i3', name: 'Semi Rari', icon: '🌱', rarity: 'rare', type: 'seed', quantity: 5 }],
    wanting: [],
    price: 500,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    status: 'active',
  },
  {
    id: '3',
    seller: { id: 'u3', name: 'BugSlayer', avatar: '🧑‍🌾', rating: 5 },
    offering: [
      { id: 'i4', name: 'Pozione Salute', icon: '❤️', rarity: 'common', type: 'powerup', quantity: 10 },
      { id: 'i5', name: 'Scudo', icon: '🛡️', rarity: 'rare', type: 'powerup', quantity: 2 },
    ],
    wanting: [{ id: 'i6', name: 'Vaso Leggendario', icon: '🏺', rarity: 'legendary', type: 'decoration', quantity: 1 }],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    status: 'active',
  },
];

export default function TradingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  
  const [offers, setOffers] = useState<TradeOffer[]>(MOCK_OFFERS);
  const [activeTab, setActiveTab] = useState<'browse' | 'my_offers' | 'create'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTrading, setIsTrading] = useState(false);

  const handleAcceptOffer = useCallback((offerId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    play('shop_buy');
    
    Alert.alert(
      '✅ Scambio Completato!',
      'Lo scambio è stato completato con successo. Gli oggetti sono stati aggiunti al tuo inventario.',
      [{ text: 'OK' }]
    );
    
    setOffers(prev => prev.filter(o => o.id !== offerId));
  }, [play]);

  const handleDeclineOffer = useCallback((offerId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    play('ui_back');
    
    Alert.alert(
      'Rifiuta Offerta',
      'Sei sicuro di voler rifiutare questa offerta?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Rifiuta', style: 'destructive', onPress: () => {
          setOffers(prev => prev.filter(o => o.id !== offerId));
        }},
      ]
    );
  }, [play]);

  const handleCreateOffer = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    play('ui_open');
    
    Alert.alert(
      'Crea Offerta',
      'Seleziona gli oggetti che vuoi scambiare dal tuo inventario.',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Vai all\'Inventario', onPress: () => router.push('/inventory' as any) },
      ]
    );
  }, [play, router]);

  const filteredOffers = offers.filter(o => 
    searchQuery === '' || 
    o.seller.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.offering.some(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.title}>🔄 Trading</ThemedText>

        {/* 3D Animation */}
        <View style={styles.animation3D}>
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[3, 3, 3]} intensity={1} />
            <PerspectiveCamera makeDefault position={[0, 0, 3]} />
            <Suspense fallback={null}>
              <TradeAnimation3D isTrading={isTrading} />
            </Suspense>
          </Canvas>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(['browse', 'my_offers', 'create'] as const).map(tab => (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                play('ui_tab_switch');
                setActiveTab(tab);
              }}
            >
              <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'browse' ? '🔍 Sfoglia' : tab === 'my_offers' ? '📦 Le Mie' : '➕ Crea'}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        {/* Search */}
        {activeTab === 'browse' && (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Cerca oggetti o venditori..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        )}

        {/* Content */}
        {activeTab === 'browse' && (
          <FlatList
            data={filteredOffers}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TradeOfferCard
                offer={item}
                onAccept={() => handleAcceptOffer(item.id)}
                onDecline={() => handleDeclineOffer(item.id)}
                isOwn={item.seller.id === 'current_user'}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyIcon}>📭</ThemedText>
                <ThemedText style={styles.emptyText}>Nessuna offerta trovata</ThemedText>
              </View>
            }
          />
        )}

        {activeTab === 'my_offers' && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyIcon}>📦</ThemedText>
            <ThemedText style={styles.emptyText}>Non hai offerte attive</ThemedText>
            <Pressable style={styles.createButton} onPress={handleCreateOffer}>
              <ThemedText style={styles.createButtonText}>Crea la tua prima offerta</ThemedText>
            </Pressable>
          </View>
        )}

        {activeTab === 'create' && (
          <View style={styles.createContainer}>
            <ThemedText style={styles.createTitle}>Crea Nuova Offerta</ThemedText>
            <ThemedText style={styles.createDescription}>
              Seleziona gli oggetti dal tuo inventario che vuoi scambiare e specifica cosa vuoi in cambio.
            </ThemedText>
            <Pressable style={styles.createButton} onPress={handleCreateOffer}>
              <ThemedText style={styles.createButtonText}>Seleziona Oggetti</ThemedText>
            </Pressable>
          </View>
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
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  animation3D: {
    height: 100,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 100,
  },
  offerCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sellerAvatar: {
    fontSize: 32,
    marginRight: 12,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  ratingStar: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tradeItems: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tradeColumn: {
    flex: 1,
  },
  tradeLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  tradeArrow: {
    paddingHorizontal: 12,
    justifyContent: 'center',
    paddingTop: 24,
  },
  arrowIcon: {
    fontSize: 24,
    color: '#ffd700',
  },
  itemBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    borderWidth: 1,
  },
  itemIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  itemName: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
  },
  itemQty: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  priceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  priceIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  priceText: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  offerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineText: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  ownBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  ownText: {
    color: '#3b82f6',
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    marginBottom: 24,
  },
  createContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  createTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  createDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
