// @ts-nocheck
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, TextInput, Alert, Share } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Text as DreiText } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface UserProfile {
  id: string;
  username: string;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  gLeaf: number;
  plantsGrown: number;
  parasitesKilled: number;
  achievements: string[];
  gardenTheme: string;
  joinDate: string;
  rank: string;
}

interface GardenPlant {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  scale: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const RANKS = ['Novizio', 'Apprendista', 'Giardiniere', 'Esperto', 'Maestro', 'Leggenda'];
const RARITY_COLORS = { common: '#9ca3af', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };

// 3D Avatar Component
function Avatar3D({ level }: { level: number }) {
  const avatarRef = useRef<THREE.Group>(null);
  const crownRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (avatarRef.current) {
      avatarRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
    if (crownRef.current && level >= 10) {
      crownRef.current.rotation.y += 0.02;
    }
  });

  const bodyColor = level >= 20 ? '#f59e0b' : level >= 10 ? '#a855f7' : level >= 5 ? '#3b82f6' : '#22c55e';

  return (
    <group ref={avatarRef}>
      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.3, 0.6, 8, 16]} />
        <meshStandardMaterial color={bodyColor} />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 0.7, 0]}>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#fcd34d" />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.08, 0.75, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.08, 0.75, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      
      {/* Smile */}
      <mesh position={[0, 0.65, 0.22]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.08, 0.02, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      
      {/* Crown for high level */}
      {level >= 10 && (
        <mesh ref={crownRef} position={[0, 1, 0]}>
          <coneGeometry args={[0.15, 0.2, 5]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} />
        </mesh>
      )}
      
      {/* Level badge */}
      <mesh position={[0, -0.5, 0.3]}>
        <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
    </group>
  );
}

// 3D Garden Display
function Garden3D({ plants }: { plants: GardenPlant[] }) {
  return (
    <group>
      {/* Ground */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial color="#2d5016" />
      </mesh>
      
      {/* Decorative ring */}
      <mesh position={[0, -0.48, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.8, 2, 32]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Plants */}
      {plants.map((plant, i) => (
        <GardenPlant3D key={plant.id} plant={plant} index={i} />
      ))}
      
      {/* Center fountain/decoration */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.4, 16]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function GardenPlant3D({ plant, index }: { plant: GardenPlant; index: number }) {
  const plantRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (plantRef.current) {
      plantRef.current.rotation.y = Math.sin(state.clock.elapsedTime + index) * 0.1;
      plantRef.current.position.y = plant.position[1] + Math.sin(state.clock.elapsedTime * 2 + index) * 0.02;
    }
  });

  return (
    <group ref={plantRef} position={plant.position} scale={plant.scale}>
      {/* Stem */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.4, 6]} />
        <meshStandardMaterial color="#2d5016" />
      </mesh>
      
      {/* Leaves */}
      {[0, 120, 240].map((angle, i) => (
        <mesh
          key={i}
          position={[
            Math.cos((angle * Math.PI) / 180) * 0.1,
            0.15 + i * 0.1,
            Math.sin((angle * Math.PI) / 180) * 0.1,
          ]}
          rotation={[0.3, (angle * Math.PI) / 180, 0]}
        >
          <coneGeometry args={[0.08, 0.2, 4]} />
          <meshStandardMaterial color={plant.color} />
        </mesh>
      ))}
      
      {/* Top */}
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial 
          color={plant.color} 
          emissive={plant.color} 
          emissiveIntensity={plant.rarity === 'legendary' ? 0.5 : 0.2} 
        />
      </mesh>
      
      {/* Rarity glow ring */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.12, 0.15, 16]} />
        <meshStandardMaterial 
          color={RARITY_COLORS[plant.rarity]} 
          emissive={RARITY_COLORS[plant.rarity]}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color }]}>
      <ThemedText style={styles.statIcon}>{icon}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

// XP Progress Bar
function XPBar({ xp, xpToNext, level }: { xp: number; xpToNext: number; level: number }) {
  const progress = (xp / xpToNext) * 100;
  const barWidth = useSharedValue(0);
  
  useEffect(() => {
    barWidth.value = withTiming(progress, { duration: 1000 });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  return (
    <View style={styles.xpContainer}>
      <View style={styles.xpHeader}>
        <ThemedText style={styles.levelBadge}>Lv.{level}</ThemedText>
        <ThemedText style={styles.xpText}>{xp} / {xpToNext} XP</ThemedText>
      </View>
      <View style={styles.xpBarBg}>
        <Animated.View style={[styles.xpBarFill, animatedStyle]} />
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile>({
    id: '1',
    username: 'GreenMaster',
    level: 12,
    xp: 2450,
    xpToNext: 3000,
    coins: 15420,
    gLeaf: 850,
    plantsGrown: 47,
    parasitesKilled: 1234,
    achievements: ['first_plant', 'parasite_slayer', 'master_breeder'],
    gardenTheme: 'forest',
    joinDate: '2024-01-15',
    rank: 'Esperto',
  });

  const [gardenPlants, setGardenPlants] = useState<GardenPlant[]>([
    { id: '1', name: 'Cannabis Classica', color: '#22c55e', position: [-0.8, 0, 0.5], scale: 0.8, rarity: 'common' },
    { id: '2', name: 'Purple Haze', color: '#a855f7', position: [0.8, 0, 0.5], scale: 0.9, rarity: 'rare' },
    { id: '3', name: 'Golden Leaf', color: '#f59e0b', position: [0, 0, -0.8], scale: 1, rarity: 'epic' },
    { id: '4', name: 'Crystal Kush', color: '#06b6d4', position: [-0.5, 0, -0.5], scale: 0.7, rarity: 'legendary' },
    { id: '5', name: 'Fire OG', color: '#ef4444', position: [0.5, 0, -0.5], scale: 0.85, rarity: 'rare' },
  ]);

  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(profile.username);

  const handleShareGarden = async () => {
    try {
      await Share.share({
        message: `Guarda il mio Garden 3D in Kurstaki Strike! 🌿\n\nUsername: ${profile.username}\nLivello: ${profile.level}\nPiante: ${gardenPlants.length}\nRank: ${profile.rank}\n\nScarica l'app e unisciti a me!`,
        title: 'Il mio Garden 3D',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveUsername = () => {
    if (editUsername.trim().length < 3) {
      Alert.alert('Errore', 'Il nome utente deve avere almeno 3 caratteri');
      return;
    }
    setProfile(prev => ({ ...prev, username: editUsername.trim() }));
    setIsEditing(false);
  };

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          {/* 3D Avatar */}
          <View style={styles.avatar3DContainer}>
            <Canvas>
              <ambientLight intensity={0.6} />
              <pointLight position={[5, 5, 5]} intensity={1} />
              <PerspectiveCamera makeDefault position={[0, 0.5, 2.5]} />
              <Suspense fallback={null}>
                <Avatar3D level={profile.level} />
              </Suspense>
            </Canvas>
          </View>

          {/* Username */}
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.usernameInput}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Nome utente"
                placeholderTextColor="#9ca3af"
                maxLength={20}
              />
              <Pressable style={styles.saveButton} onPress={handleSaveUsername}>
                <ThemedText style={styles.saveButtonText}>Salva</ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setIsEditing(true)}>
              <ThemedText style={styles.username}>{profile.username} ✏️</ThemedText>
            </Pressable>
          )}

          <View style={[styles.rankBadge, { backgroundColor: RARITY_COLORS.epic }]}>
            <ThemedText style={styles.rankText}>{profile.rank}</ThemedText>
          </View>

          {/* XP Bar */}
          <XPBar xp={profile.xp} xpToNext={profile.xpToNext} level={profile.level} />
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="🪙" label="Monete" value={profile.coins.toLocaleString()} color="#f59e0b" />
          <StatCard icon="🍃" label="G-Leaf" value={profile.gLeaf.toLocaleString()} color="#22c55e" />
          <StatCard icon="🌱" label="Piante" value={profile.plantsGrown} color="#3b82f6" />
          <StatCard icon="🐛" label="Parassiti" value={profile.parasitesKilled.toLocaleString()} color="#ef4444" />
        </View>

        {/* 3D Garden */}
        <ThemedText style={styles.sectionTitle}>Il Mio Garden 3D</ThemedText>
        <View style={styles.garden3DContainer}>
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, 3, -5]} intensity={0.5} color="#22c55e" />
            <PerspectiveCamera makeDefault position={[0, 2, 4]} />
            <OrbitControls enableZoom={false} enablePan={false} />
            <Suspense fallback={null}>
              <Garden3D plants={gardenPlants} />
            </Suspense>
          </Canvas>
        </View>

        {/* Share Button */}
        <Pressable style={styles.shareButton} onPress={handleShareGarden}>
          <ThemedText style={styles.shareButtonText}>📤 Condividi il tuo Garden</ThemedText>
        </Pressable>

        {/* Achievements */}
        <ThemedText style={styles.sectionTitle}>Achievements</ThemedText>
        <View style={styles.achievementsContainer}>
          {[
            { id: 'first_plant', icon: '🌱', name: 'Prima Pianta', unlocked: true },
            { id: 'parasite_slayer', icon: '🐛', name: 'Sterminatore', unlocked: true },
            { id: 'master_breeder', icon: '🧬', name: 'Genetista', unlocked: true },
            { id: 'millionaire', icon: '💰', name: 'Milionario', unlocked: false },
            { id: 'legendary', icon: '⭐', name: 'Leggendario', unlocked: false },
          ].map((achievement) => (
            <View 
              key={achievement.id} 
              style={[styles.achievementBadge, !achievement.unlocked && styles.achievementLocked]}
            >
              <ThemedText style={styles.achievementIcon}>{achievement.icon}</ThemedText>
              <ThemedText style={styles.achievementName}>{achievement.name}</ThemedText>
            </View>
          ))}
        </View>

        {/* Member Since */}
        <View style={styles.memberInfo}>
          <ThemedText style={styles.memberText}>Membro dal {new Date(profile.joinDate).toLocaleDateString('it-IT')}</ThemedText>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  logo: { width: 120, height: 60 },
  profileCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 20 },
  avatar3DContainer: { width: 150, height: 150, marginBottom: 16 },
  username: { fontSize: 24, fontWeight: 'bold', color: '#166534', marginBottom: 8 },
  editContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  usernameInput: { backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, fontSize: 18, color: '#166534', minWidth: 150 },
  saveButton: { backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginLeft: 8 },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  rankBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  rankText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  xpContainer: { width: '100%' },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  levelBadge: { backgroundColor: '#22c55e', color: '#fff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontWeight: 'bold', overflow: 'hidden' },
  xpText: { color: '#6b7280', fontSize: 14 },
  xpBarBg: { height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
  xpBarFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 6 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { width: (width - 52) / 2, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 2 },
  statIcon: { fontSize: 32, marginBottom: 8 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#166534' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  garden3DContainer: { height: 300, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  shareButton: { backgroundColor: '#3b82f6', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 24 },
  shareButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  achievementsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  achievementBadge: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 12, alignItems: 'center', width: (width - 64) / 3 },
  achievementLocked: { opacity: 0.4 },
  achievementIcon: { fontSize: 28, marginBottom: 4 },
  achievementName: { fontSize: 10, color: '#166534', textAlign: 'center' },
  memberInfo: { alignItems: 'center', marginBottom: 20 },
  memberText: { color: '#a7f3d0', fontSize: 14 },
});
