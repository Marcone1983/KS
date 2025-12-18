import { useRouter } from "expo-router";
import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { useSounds } from '@/hooks/use-sounds';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  theme: string;
  colors: [string, string, string];
  startDate: string;
  endDate: string;
  rewards: EventReward[];
  challenges: EventChallenge[];
  exclusiveItems: ExclusiveItem[];
  progress: number;
  maxProgress: number;
}

interface EventReward {
  id: string;
  name: string;
  icon: string;
  type: 'xp' | 'coins' | 'item' | 'skin' | 'badge';
  amount: number;
  milestone: number;
  claimed: boolean;
}

interface EventChallenge {
  id: string;
  name: string;
  description: string;
  icon: string;
  requirement: number;
  progress: number;
  reward: { xp: number; coins: number };
  completed: boolean;
}

interface ExclusiveItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  price: number;
  currency: 'coins' | 'gems' | 'event_tokens';
  rarity: 'rare' | 'epic' | 'legendary';
  available: boolean;
}

// 3D Seasonal Decoration
function SeasonalDecoration3D({ theme }: { theme: string }) {
  const groupRef = React.useRef<THREE.Group>(null);
  
  const themeColors: Record<string, { primary: string; secondary: string; accent: string }> = {
    christmas: { primary: '#c41e3a', secondary: '#228b22', accent: '#ffd700' },
    halloween: { primary: '#ff6600', secondary: '#4b0082', accent: '#00ff00' },
    spring: { primary: '#ff69b4', secondary: '#98fb98', accent: '#ffff00' },
    summer: { primary: '#00bfff', secondary: '#ffa500', accent: '#ff4500' },
    autumn: { primary: '#d2691e', secondary: '#8b4513', accent: '#daa520' },
    winter: { primary: '#87ceeb', secondary: '#ffffff', accent: '#add8e6' },
  };
  
  const colors = themeColors[theme] || themeColors.spring;
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Main decoration */}
      <mesh>
        <dodecahedronGeometry args={[0.4]} />
        <meshStandardMaterial color={colors.primary} metalness={0.5} roughness={0.3} />
      </mesh>
      
      {/* Orbiting elements */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[
          Math.cos(i * Math.PI * 2 / 3) * 0.7,
          0,
          Math.sin(i * Math.PI * 2 / 3) * 0.7
        ]}>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial 
            color={i === 0 ? colors.secondary : i === 1 ? colors.accent : colors.primary} 
            emissive={colors.accent}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
      
      {/* Glow effect */}
      <mesh>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshBasicMaterial color={colors.primary} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

// Get current season
const getCurrentSeason = (): string => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
};

// Mock seasonal event
const CURRENT_EVENT: SeasonalEvent = {
  id: 'winter_2024',
  name: 'Festival Invernale',
  description: 'Celebra l\'inverno con ricompense esclusive, sfide speciali e oggetti a tempo limitato!',
  icon: '❄️',
  theme: 'winter',
  colors: ['#1a237e', '#283593', '#3949ab'],
  startDate: '2024-12-01',
  endDate: '2024-12-31',
  rewards: [
    { id: 'r1', name: '100 Monete', icon: '🪙', type: 'coins', amount: 100, milestone: 100, claimed: true },
    { id: 'r2', name: '500 XP', icon: '⭐', type: 'xp', amount: 500, milestone: 500, claimed: true },
    { id: 'r3', name: 'Spray Invernale', icon: '🔫', type: 'item', amount: 1, milestone: 1000, claimed: false },
    { id: 'r4', name: 'Badge Inverno', icon: '🏅', type: 'badge', amount: 1, milestone: 2000, claimed: false },
    { id: 'r5', name: 'Skin Neve', icon: '❄️', type: 'skin', amount: 1, milestone: 5000, claimed: false },
  ],
  challenges: [
    { id: 'c1', name: 'Cacciatore Invernale', description: 'Elimina 100 parassiti', icon: '🐛', requirement: 100, progress: 67, reward: { xp: 200, coins: 300 }, completed: false },
    { id: 'c2', name: 'Giardiniere Gelido', description: 'Coltiva 10 piante', icon: '🌱', requirement: 10, progress: 10, reward: { xp: 150, coins: 200 }, completed: true },
    { id: 'c3', name: 'Collezionista', description: 'Raccogli 50 fiocchi di neve', icon: '❄️', requirement: 50, progress: 23, reward: { xp: 300, coins: 500 }, completed: false },
  ],
  exclusiveItems: [
    { id: 'i1', name: 'Vaso Ghiacciato', icon: '🏺', description: 'Un vaso decorativo con effetto ghiaccio', price: 500, currency: 'event_tokens', rarity: 'rare', available: true },
    { id: 'i2', name: 'Spray Aurora', icon: '🌌', description: 'Spray con effetto aurora boreale', price: 1500, currency: 'event_tokens', rarity: 'epic', available: true },
    { id: 'i3', name: 'Pianta Cristallo', icon: '💎', description: 'Una pianta leggendaria di cristallo', price: 5000, currency: 'event_tokens', rarity: 'legendary', available: true },
  ],
  progress: 1250,
  maxProgress: 5000,
};

export default function EventsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  
  const [event, setEvent] = useState<SeasonalEvent>(CURRENT_EVENT);
  const [eventTokens, setEventTokens] = useState(750);
  const [timeRemaining, setTimeRemaining] = useState('');

  useEffect(() => {
    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, []);

  const updateTimer = () => {
    const endDate = new Date(event.endDate);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    
    if (diff <= 0) {
      setTimeRemaining('Evento terminato');
      return;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    setTimeRemaining(`${days}g ${hours}h rimanenti`);
  };

  const handleClaimReward = useCallback((rewardId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    play('shop_buy_rare');
    
    setEvent(prev => ({
      ...prev,
      rewards: prev.rewards.map(r => r.id === rewardId ? { ...r, claimed: true } : r),
    }));
    
    Alert.alert('🎁 Ricompensa Riscossa!', 'La ricompensa è stata aggiunta al tuo inventario.');
  }, [play]);

  const handleBuyItem = useCallback((item: ExclusiveItem) => {
    if (eventTokens < item.price) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      play('shop_denied');
      Alert.alert('❌ Token Insufficienti', `Ti servono ${item.price - eventTokens} token in più.`);
      return;
    }
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    play('shop_buy_rare');
    
    setEventTokens(prev => prev - item.price);
    Alert.alert('🎉 Acquisto Completato!', `Hai acquistato ${item.name}!`);
  }, [eventTokens, play]);

  const progressPercentage = (event.progress / event.maxProgress) * 100;

  return (
    <LinearGradient colors={event.colors} style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <View style={styles.tokenBadge}>
            <ThemedText style={styles.tokenText}>🎫 {eventTokens}</ThemedText>
          </View>
        </View>

        {/* Event Banner */}
        <View style={styles.banner}>
          <View style={styles.decoration3D}>
            <Canvas>
              <ambientLight intensity={0.5} />
              <pointLight position={[3, 3, 3]} intensity={1} />
              <PerspectiveCamera makeDefault position={[0, 0, 2.5]} />
              <Suspense fallback={null}>
                <SeasonalDecoration3D theme={event.theme} />
              </Suspense>
            </Canvas>
          </View>
          
          <ThemedText style={styles.eventIcon}>{event.icon}</ThemedText>
          <ThemedText style={styles.eventName}>{event.name}</ThemedText>
          <ThemedText style={styles.eventTimer}>⏰ {timeRemaining}</ThemedText>
          <ThemedText style={styles.eventDescription}>{event.description}</ThemedText>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <ThemedText style={styles.sectionTitle}>Progresso Evento</ThemedText>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPercentage}%` }]} />
          </View>
          <ThemedText style={styles.progressText}>{event.progress} / {event.maxProgress}</ThemedText>
          
          {/* Milestones */}
          <View style={styles.milestones}>
            {event.rewards.map((reward, index) => {
              const milestonePosition = (reward.milestone / event.maxProgress) * 100;
              const isReached = event.progress >= reward.milestone;
              
              return (
                <Pressable
                  key={reward.id}
                  style={[
                    styles.milestone,
                    { left: `${Math.min(milestonePosition, 95)}%` },
                    isReached && styles.milestoneReached,
                    reward.claimed && styles.milestoneClaimed,
                  ]}
                  onPress={() => isReached && !reward.claimed && handleClaimReward(reward.id)}
                >
                  <ThemedText style={styles.milestoneIcon}>{reward.icon}</ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Challenges */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🎯 Sfide Evento</ThemedText>
          {event.challenges.map(challenge => (
            <View key={challenge.id} style={[styles.challengeCard, challenge.completed && styles.challengeCompleted]}>
              <ThemedText style={styles.challengeIcon}>{challenge.icon}</ThemedText>
              <View style={styles.challengeInfo}>
                <ThemedText style={styles.challengeName}>{challenge.name}</ThemedText>
                <ThemedText style={styles.challengeDesc}>{challenge.description}</ThemedText>
                <View style={styles.challengeProgress}>
                  <View style={styles.challengeProgressBar}>
                    <View style={[styles.challengeProgressFill, { width: `${(challenge.progress / challenge.requirement) * 100}%` }]} />
                  </View>
                  <ThemedText style={styles.challengeProgressText}>
                    {challenge.progress}/{challenge.requirement}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.challengeReward}>
                <ThemedText style={styles.rewardText}>⭐{challenge.reward.xp}</ThemedText>
                <ThemedText style={styles.rewardText}>🪙{challenge.reward.coins}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Exclusive Shop */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>🛒 Negozio Esclusivo</ThemedText>
          <View style={styles.shopGrid}>
            {event.exclusiveItems.map(item => (
              <Pressable 
                key={item.id} 
                style={[styles.shopItem, { borderColor: item.rarity === 'legendary' ? '#ffd700' : item.rarity === 'epic' ? '#a855f7' : '#3b82f6' }]}
                onPress={() => handleBuyItem(item)}
              >
                <ThemedText style={styles.shopItemIcon}>{item.icon}</ThemedText>
                <ThemedText style={styles.shopItemName}>{item.name}</ThemedText>
                <ThemedText style={styles.shopItemDesc}>{item.description}</ThemedText>
                <View style={styles.shopItemPrice}>
                  <ThemedText style={styles.priceText}>🎫 {item.price}</ThemedText>
                </View>
                <View style={[styles.rarityBadge, { backgroundColor: item.rarity === 'legendary' ? '#ffd700' : item.rarity === 'epic' ? '#a855f7' : '#3b82f6' }]}>
                  <ThemedText style={styles.rarityText}>{item.rarity.toUpperCase()}</ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backButton: { padding: 8 },
  backText: { color: '#fff', fontSize: 16 },
  tokenBadge: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  tokenText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  banner: { alignItems: 'center', marginBottom: 24 },
  decoration3D: { width: 120, height: 120, marginBottom: 8 },
  eventIcon: { fontSize: 48, marginBottom: 8 },
  eventName: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  eventTimer: { fontSize: 16, color: '#ffd700', marginBottom: 8 },
  eventDescription: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center', paddingHorizontal: 20 },
  progressSection: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  progressBar: { height: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 6 },
  progressText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },
  milestones: { position: 'relative', height: 40, marginTop: 8 },
  milestone: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center', transform: [{ translateX: -18 }] },
  milestoneReached: { backgroundColor: '#22c55e' },
  milestoneClaimed: { backgroundColor: '#6b7280', opacity: 0.5 },
  milestoneIcon: { fontSize: 18 },
  section: { marginBottom: 24 },
  challengeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginBottom: 8 },
  challengeCompleted: { opacity: 0.6 },
  challengeIcon: { fontSize: 32, marginRight: 12 },
  challengeInfo: { flex: 1 },
  challengeName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  challengeDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 },
  challengeProgress: { flexDirection: 'row', alignItems: 'center' },
  challengeProgressBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginRight: 8, overflow: 'hidden' },
  challengeProgressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  challengeProgressText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', minWidth: 50 },
  challengeReward: { alignItems: 'flex-end' },
  rewardText: { fontSize: 12, color: '#ffd700' },
  shopGrid: { gap: 12 },
  shopItem: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, borderWidth: 2, alignItems: 'center' },
  shopItemIcon: { fontSize: 48, marginBottom: 8 },
  shopItemName: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  shopItemDesc: { fontSize: 12, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 12 },
  shopItemPrice: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  priceText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  rarityBadge: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rarityText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
