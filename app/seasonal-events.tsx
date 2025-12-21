// @ts-nocheck
import React, { useState, useEffect, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import Animated, { FadeIn, SlideInUp, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  theme: 'winter' | 'spring' | 'summer' | 'autumn' | 'halloween' | 'easter';
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  rewards: EventReward[];
  challenges: EventChallenge[];
  shop: EventShopItem[];
  currency: { name: string; icon: string; amount: number };
}

interface EventReward {
  id: string;
  name: string;
  icon: string;
  description: string;
  requirement: number;
  claimed: boolean;
}

interface EventChallenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: { icon: string; amount: number };
}

interface EventShopItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  purchased: boolean;
}

const THEME_COLORS = {
  winter: { primary: '#60a5fa', secondary: '#1e3a5f', accent: '#93c5fd', gradient: ['#1e3a5f', '#3b82f6', '#60a5fa'] },
  spring: { primary: '#f472b6', secondary: '#831843', accent: '#fbcfe8', gradient: ['#831843', '#db2777', '#f472b6'] },
  summer: { primary: '#fbbf24', secondary: '#78350f', accent: '#fde68a', gradient: ['#78350f', '#f59e0b', '#fbbf24'] },
  autumn: { primary: '#f97316', secondary: '#7c2d12', accent: '#fed7aa', gradient: ['#7c2d12', '#ea580c', '#f97316'] },
  halloween: { primary: '#a855f7', secondary: '#3b0764', accent: '#e9d5ff', gradient: ['#3b0764', '#7c3aed', '#a855f7'] },
  easter: { primary: '#34d399', secondary: '#064e3b', accent: '#a7f3d0', gradient: ['#064e3b', '#10b981', '#34d399'] },
};

const CURRENT_EVENT: SeasonalEvent = {
  id: 'winter_2024',
  name: 'Festival Invernale',
  description: 'Celebra l\'inverno con ricompense esclusive e sfide speciali!',
  theme: 'winter',
  startDate: new Date('2024-12-15'),
  endDate: new Date('2025-01-15'),
  isActive: true,
  currency: { name: 'Fiocchi di Neve', icon: '❄️', amount: 450 },
  rewards: [
    { id: 'r1', name: 'Avatar Pupazzo', icon: '⛄', description: 'Avatar esclusivo invernale', requirement: 100, claimed: true },
    { id: 'r2', name: 'Spray Ghiaccio', icon: '🧊', description: 'Spray con effetto ghiaccio', requirement: 300, claimed: true },
    { id: 'r3', name: 'Vaso Cristallo', icon: '💎', description: 'Vaso decorativo di cristallo', requirement: 500, claimed: false },
    { id: 'r4', name: 'Pianta Invernale', icon: '🌲', description: 'Varietà esclusiva invernale', requirement: 800, claimed: false },
    { id: 'r5', name: 'Titolo Leggendario', icon: '👑', description: '"Signore dell\'Inverno"', requirement: 1500, claimed: false },
  ],
  challenges: [
    { id: 'c1', title: 'Cacciatore di Neve', description: 'Raccogli 50 fiocchi di neve', progress: 45, target: 50, reward: { icon: '❄️', amount: 50 } },
    { id: 'c2', title: 'Difensore Gelido', description: 'Completa 10 livelli invernali', progress: 7, target: 10, reward: { icon: '❄️', amount: 100 } },
    { id: 'c3', title: 'Boss Invernale', description: 'Sconfiggi il Yeti 3 volte', progress: 1, target: 3, reward: { icon: '❄️', amount: 200 } },
    { id: 'c4', title: 'Breeder Stagionale', description: 'Crea un ibrido invernale', progress: 0, target: 1, reward: { icon: '❄️', amount: 150 } },
  ],
  shop: [
    { id: 's1', name: 'Skin Spray Neve', icon: '🌨️', price: 200, rarity: 'rare', purchased: false },
    { id: 's2', name: 'Effetto Particelle', icon: '✨', price: 350, rarity: 'epic', purchased: false },
    { id: 's3', name: 'Cornice Profilo', icon: '🖼️', price: 150, rarity: 'common', purchased: true },
    { id: 's4', name: 'Emote Pupazzo', icon: '⛄', price: 100, rarity: 'common', purchased: false },
    { id: 's5', name: 'Vaso Ghiaccio', icon: '🧊', price: 500, rarity: 'legendary', purchased: false },
  ],
};

// 3D Snowflake
function Snowflake({ position }: { position: [number, number, number] }) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.02;
      meshRef.current.position.y -= 0.02;
      if (meshRef.current.position.y < -3) {
        meshRef.current.position.y = 3;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[0.1, 0]} />
      <meshStandardMaterial color="#ffffff" emissive="#60a5fa" emissiveIntensity={0.3} />
    </mesh>
  );
}

// Snow Scene
function SnowScene() {
  const snowflakes = Array.from({ length: 30 }, (_, i) => ({
    position: [
      (Math.random() - 0.5) * 6,
      Math.random() * 6 - 3,
      (Math.random() - 0.5) * 4
    ] as [number, number, number]
  }));

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 5, 5]} intensity={1} color="#60a5fa" />
      {snowflakes.map((sf, i) => (
        <Snowflake key={i} position={sf.position} />
      ))}
      {/* Central decoration */}
      <mesh position={[0, 0, 0]}>
        <torusKnotGeometry args={[0.8, 0.3, 100, 16]} />
        <meshStandardMaterial color="#60a5fa" metalness={0.8} roughness={0.2} />
      </mesh>
    </>
  );
}

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

export default function SeasonalEventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [event] = useState(CURRENT_EVENT);
  const [activeTab, setActiveTab] = useState<'overview' | 'challenges' | 'rewards' | 'shop'>('overview');
  const [timeLeft, setTimeLeft] = useState('');
  
  const theme = THEME_COLORS[event.theme];

  // Countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = event.endDate.getTime() - Date.now();
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      setTimeLeft(`${days}g ${hours}h ${minutes}m`);
    }, 60000);
    
    setTimeLeft(`${Math.floor((event.endDate.getTime() - Date.now()) / 86400000)}g`);
    return () => clearInterval(interval);
  }, []);

  const totalProgress = event.rewards.reduce((sum, r) => sum + (r.claimed ? r.requirement : 0), 0);
  const maxProgress = event.rewards[event.rewards.length - 1].requirement;

  const renderOverview = () => (
    <ScrollView style={styles.tabContent}>
      {/* 3D Scene */}
      <View style={styles.sceneContainer}>
        <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
          <Suspense fallback={null}>
            <SnowScene />
          </Suspense>
        </Canvas>
        <View style={styles.sceneOverlay}>
          <ThemedText style={styles.eventName}>{event.name}</ThemedText>
          <ThemedText style={styles.eventDescription}>{event.description}</ThemedText>
        </View>
      </View>

      {/* Currency */}
      <View style={[styles.currencyCard, { backgroundColor: theme.primary + '30' }]}>
        <ThemedText style={styles.currencyIcon}>{event.currency.icon}</ThemedText>
        <View style={styles.currencyInfo}>
          <ThemedText style={styles.currencyName}>{event.currency.name}</ThemedText>
          <ThemedText style={styles.currencyAmount}>{event.currency.amount}</ThemedText>
        </View>
        <Pressable style={[styles.earnButton, { backgroundColor: theme.primary }]}>
          <ThemedText style={styles.earnButtonText}>+ Guadagna</ThemedText>
        </Pressable>
      </View>

      {/* Progress Track */}
      <View style={styles.progressTrack}>
        <ThemedText style={styles.sectionTitle}>Progresso Ricompense</ThemedText>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(event.currency.amount / maxProgress) * 100}%`, backgroundColor: theme.primary }]} />
        </View>
        <View style={styles.rewardMarkers}>
          {event.rewards.map((reward, i) => (
            <View 
              key={reward.id} 
              style={[
                styles.rewardMarker,
                { left: `${(reward.requirement / maxProgress) * 100}%` },
                reward.claimed && styles.rewardMarkerClaimed
              ]}
            >
              <ThemedText style={styles.rewardMarkerIcon}>{reward.icon}</ThemedText>
            </View>
          ))}
        </View>
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStats}>
        <View style={styles.quickStat}>
          <ThemedText style={styles.quickStatValue}>{event.challenges.filter(c => c.progress >= c.target).length}/{event.challenges.length}</ThemedText>
          <ThemedText style={styles.quickStatLabel}>Sfide Complete</ThemedText>
        </View>
        <View style={styles.quickStat}>
          <ThemedText style={styles.quickStatValue}>{event.rewards.filter(r => r.claimed).length}/{event.rewards.length}</ThemedText>
          <ThemedText style={styles.quickStatLabel}>Ricompense</ThemedText>
        </View>
        <View style={styles.quickStat}>
          <ThemedText style={styles.quickStatValue}>{timeLeft}</ThemedText>
          <ThemedText style={styles.quickStatLabel}>Tempo Rimasto</ThemedText>
        </View>
      </View>
    </ScrollView>
  );

  const renderChallenges = () => (
    <ScrollView style={styles.tabContent}>
      {event.challenges.map((challenge, index) => (
        <Animated.View key={challenge.id} entering={FadeIn.delay(index * 100)}>
          <View style={styles.challengeCard}>
            <View style={styles.challengeHeader}>
              <ThemedText style={styles.challengeTitle}>{challenge.title}</ThemedText>
              <View style={styles.challengeReward}>
                <ThemedText style={styles.challengeRewardIcon}>{challenge.reward.icon}</ThemedText>
                <ThemedText style={styles.challengeRewardAmount}>{challenge.reward.amount}</ThemedText>
              </View>
            </View>
            <ThemedText style={styles.challengeDescription}>{challenge.description}</ThemedText>
            <View style={styles.challengeProgress}>
              <View style={styles.challengeProgressBar}>
                <View style={[styles.challengeProgressFill, { width: `${(challenge.progress / challenge.target) * 100}%`, backgroundColor: theme.primary }]} />
              </View>
              <ThemedText style={styles.challengeProgressText}>{challenge.progress}/{challenge.target}</ThemedText>
            </View>
            {challenge.progress >= challenge.target && (
              <Pressable style={[styles.claimButton, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.claimButtonText}>Riscatta</ThemedText>
              </Pressable>
            )}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );

  const renderRewards = () => (
    <ScrollView style={styles.tabContent}>
      {event.rewards.map((reward, index) => (
        <Animated.View key={reward.id} entering={SlideInUp.delay(index * 100)}>
          <View style={[styles.rewardCard, reward.claimed && styles.rewardCardClaimed]}>
            <View style={styles.rewardIconContainer}>
              <ThemedText style={styles.rewardIcon}>{reward.icon}</ThemedText>
            </View>
            <View style={styles.rewardInfo}>
              <ThemedText style={styles.rewardName}>{reward.name}</ThemedText>
              <ThemedText style={styles.rewardDescription}>{reward.description}</ThemedText>
              <ThemedText style={styles.rewardRequirement}>
                {event.currency.icon} {reward.requirement} richiesti
              </ThemedText>
            </View>
            {reward.claimed ? (
              <View style={styles.claimedBadge}>
                <ThemedText style={styles.claimedBadgeText}>✓</ThemedText>
              </View>
            ) : event.currency.amount >= reward.requirement ? (
              <Pressable style={[styles.unlockButton, { backgroundColor: theme.primary }]}>
                <ThemedText style={styles.unlockButtonText}>Sblocca</ThemedText>
              </Pressable>
            ) : (
              <View style={styles.lockedBadge}>
                <ThemedText style={styles.lockedBadgeText}>🔒</ThemedText>
              </View>
            )}
          </View>
        </Animated.View>
      ))}
    </ScrollView>
  );

  const renderShop = () => (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.shopGrid}>
      {event.shop.map((item, index) => (
        <Animated.View key={item.id} entering={FadeIn.delay(index * 50)} style={styles.shopItemWrapper}>
          <Pressable style={[styles.shopItem, { borderColor: RARITY_COLORS[item.rarity] }]}>
            <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[item.rarity] }]}>
              <ThemedText style={styles.rarityText}>{item.rarity.toUpperCase()}</ThemedText>
            </View>
            <ThemedText style={styles.shopItemIcon}>{item.icon}</ThemedText>
            <ThemedText style={styles.shopItemName}>{item.name}</ThemedText>
            {item.purchased ? (
              <ThemedText style={styles.purchasedText}>Acquistato</ThemedText>
            ) : (
              <View style={styles.priceTag}>
                <ThemedText style={styles.priceIcon}>{event.currency.icon}</ThemedText>
                <ThemedText style={styles.priceAmount}>{item.price}</ThemedText>
              </View>
            )}
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );

  return (
    <LinearGradient colors={theme.gradient as [string, string, string]} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Indietro</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>🎄 Eventi Stagionali</ThemedText>
        <View style={styles.timerBadge}>
          <ThemedText style={styles.timerText}>{timeLeft}</ThemedText>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['overview', 'challenges', 'rewards', 'shop'] as const).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'overview' ? '🏠' : tab === 'challenges' ? '🎯' : tab === 'rewards' ? '🎁' : '🛒'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'challenges' && renderChallenges()}
        {activeTab === 'rewards' && renderRewards()}
        {activeTab === 'shop' && renderShop()}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  backButton: { padding: 8 },
  backText: { color: '#fff', fontSize: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  timerBadge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  timerText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4, borderRadius: 12 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabText: { fontSize: 20 },
  tabTextActive: {},
  content: { flex: 1 },
  tabContent: { flex: 1, paddingHorizontal: 20 },
  sceneContainer: { height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 16 },
  sceneOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  eventName: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  eventDescription: { color: '#fff', fontSize: 14, opacity: 0.9 },
  currencyCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, padding: 16, marginBottom: 16 },
  currencyIcon: { fontSize: 36, marginRight: 12 },
  currencyInfo: { flex: 1 },
  currencyName: { color: '#fff', fontSize: 14 },
  currencyAmount: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  earnButton: { borderRadius: 12, paddingVertical: 10, paddingHorizontal: 16 },
  earnButtonText: { color: '#fff', fontWeight: 'bold' },
  progressTrack: { marginBottom: 16 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  progressBar: { height: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, marginBottom: 20 },
  progressFill: { height: '100%', borderRadius: 6 },
  rewardMarkers: { position: 'relative', height: 40 },
  rewardMarker: { position: 'absolute', transform: [{ translateX: -15 }], alignItems: 'center' },
  rewardMarkerClaimed: { opacity: 0.5 },
  rewardMarkerIcon: { fontSize: 24 },
  quickStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  quickStat: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginHorizontal: 4 },
  quickStatValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  quickStatLabel: { color: '#fff', fontSize: 11, opacity: 0.8 },
  challengeCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  challengeTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  challengeReward: { flexDirection: 'row', alignItems: 'center' },
  challengeRewardIcon: { fontSize: 16, marginRight: 4 },
  challengeRewardAmount: { color: '#fff', fontWeight: 'bold' },
  challengeDescription: { color: '#fff', fontSize: 14, opacity: 0.8, marginBottom: 12 },
  challengeProgress: { flexDirection: 'row', alignItems: 'center' },
  challengeProgressBar: { flex: 1, height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, marginRight: 10 },
  challengeProgressFill: { height: '100%', borderRadius: 4 },
  challengeProgressText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  claimButton: { marginTop: 12, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  claimButtonText: { color: '#fff', fontWeight: 'bold' },
  rewardCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 },
  rewardCardClaimed: { opacity: 0.6 },
  rewardIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  rewardIcon: { fontSize: 32 },
  rewardInfo: { flex: 1 },
  rewardName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  rewardDescription: { color: '#fff', fontSize: 13, opacity: 0.8 },
  rewardRequirement: { color: '#fff', fontSize: 12, marginTop: 4 },
  claimedBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.3)', justifyContent: 'center', alignItems: 'center' },
  claimedBadgeText: { color: '#22c55e', fontSize: 20 },
  unlockButton: { borderRadius: 10, paddingVertical: 10, paddingHorizontal: 16 },
  unlockButtonText: { color: '#fff', fontWeight: 'bold' },
  lockedBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  lockedBadgeText: { fontSize: 20 },
  shopGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  shopItemWrapper: { width: (width - 52) / 2 },
  shopItem: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2 },
  rarityBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rarityText: { color: '#fff', fontSize: 9, fontWeight: 'bold' },
  shopItemIcon: { fontSize: 48, marginBottom: 8 },
  shopItemName: { color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  purchasedText: { color: '#22c55e', fontSize: 12 },
  priceTag: { flexDirection: 'row', alignItems: 'center' },
  priceIcon: { fontSize: 14, marginRight: 4 },
  priceAmount: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
