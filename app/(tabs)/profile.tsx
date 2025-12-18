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
import { PerspectiveCamera, OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface UserProfile {
  username: string;
  level: number;
  xp: number;
  xpToNext: number;
  coins: number;
  gLeaf: number;
  plantsGrown: number;
  parasitesKilled: number;
  rank: string;
}

interface GardenPlant {
  id: string;
  color: string;
  position: [number, number, number];
  scale: number;
}

const RARITY_COLORS = { common: '#9ca3af', rare: '#3b82f6', epic: '#a855f7', legendary: '#f59e0b' };

function Avatar3D({ level }: { level: number }) {
  const avatarRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (avatarRef.current) avatarRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
  });
  const bodyColor = level >= 20 ? '#f59e0b' : level >= 10 ? '#a855f7' : level >= 5 ? '#3b82f6' : '#22c55e';
  return (
    <group ref={avatarRef}>
      <mesh position={[0, 0, 0]}><capsuleGeometry args={[0.3, 0.6, 8, 16]} /><meshStandardMaterial color={bodyColor} /></mesh>
      <mesh position={[0, 0.7, 0]}><sphereGeometry args={[0.25, 16, 16]} /><meshStandardMaterial color="#fcd34d" /></mesh>
      <mesh position={[-0.08, 0.75, 0.2]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#000" /></mesh>
      <mesh position={[0.08, 0.75, 0.2]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color="#000" /></mesh>
      {level >= 10 && <mesh position={[0, 1, 0]}><coneGeometry args={[0.15, 0.2, 5]} /><meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.3} /></mesh>}
    </group>
  );
}

function Garden3D({ plants }: { plants: GardenPlant[] }) {
  return (
    <group>
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[2, 32]} /><meshStandardMaterial color="#2d5016" /></mesh>
      {plants.map((plant, i) => <PlantMesh key={plant.id} plant={plant} index={i} />)}
    </group>
  );
}

function PlantMesh({ plant, index }: { plant: GardenPlant; index: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => { if (ref.current) ref.current.rotation.y = Math.sin(state.clock.elapsedTime + index) * 0.1; });
  return (
    <group ref={ref} position={plant.position} scale={plant.scale}>
      <mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.02, 0.03, 0.4, 6]} /><meshStandardMaterial color="#2d5016" /></mesh>
      {[0, 120, 240].map((a, i) => <mesh key={i} position={[Math.cos((a * Math.PI) / 180) * 0.1, 0.15 + i * 0.1, Math.sin((a * Math.PI) / 180) * 0.1]} rotation={[0.3, (a * Math.PI) / 180, 0]}><coneGeometry args={[0.08, 0.2, 4]} /><meshStandardMaterial color={plant.color} /></mesh>)}
      <mesh position={[0, 0.45, 0]}><sphereGeometry args={[0.1, 12, 12]} /><meshStandardMaterial color={plant.color} emissive={plant.color} emissiveIntensity={0.2} /></mesh>
    </group>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color }]}>
      <ThemedText style={styles.statIcon}>{icon}</ThemedText>
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
  );
}

function XPBar({ xp, xpToNext, level }: { xp: number; xpToNext: number; level: number }) {
  const progress = (xp / xpToNext) * 100;
  const barWidth = useSharedValue(0);
  useEffect(() => { barWidth.value = withTiming(progress, { duration: 1000 }); }, [progress]);
  const animatedStyle = useAnimatedStyle(() => ({ width: `${barWidth.value}%` }));
  return (
    <View style={styles.xpContainer}>
      <View style={styles.xpHeader}>
        <ThemedText style={styles.levelBadge}>Lv.{level}</ThemedText>
        <ThemedText style={styles.xpText}>{xp} / {xpToNext} XP</ThemedText>
      </View>
      <View style={styles.xpBarBg}><Animated.View style={[styles.xpBarFill, animatedStyle]} /></View>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<UserProfile>({
    username: 'GreenMaster', level: 12, xp: 2450, xpToNext: 3000, coins: 15420, gLeaf: 850, plantsGrown: 47, parasitesKilled: 1234, rank: 'Esperto',
  });
  const [gardenPlants] = useState<GardenPlant[]>([
    { id: '1', color: '#22c55e', position: [-0.8, 0, 0.5], scale: 0.8 },
    { id: '2', color: '#a855f7', position: [0.8, 0, 0.5], scale: 0.9 },
    { id: '3', color: '#f59e0b', position: [0, 0, -0.8], scale: 1 },
    { id: '4', color: '#06b6d4', position: [-0.5, 0, -0.5], scale: 0.7 },
  ]);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState(profile.username);

  const handleShareGarden = async () => {
    try {
      await Share.share({ message: `Guarda il mio Garden 3D in Kurstaki Strike! 🌿\n\nUsername: ${profile.username}\nLivello: ${profile.level}\nRank: ${profile.rank}`, title: 'Il mio Garden 3D' });
    } catch (e) { console.error(e); }
  };

  const handleSaveUsername = () => {
    if (editUsername.trim().length < 3) { Alert.alert('Errore', 'Il nome utente deve avere almeno 3 caratteri'); return; }
    setProfile(prev => ({ ...prev, username: editUsername.trim() }));
    setIsEditing(false);
  };

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}><Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" /></View>

        <View style={styles.profileCard}>
          <View style={styles.avatar3DContainer}>
            <Canvas><ambientLight intensity={0.6} /><pointLight position={[5, 5, 5]} intensity={1} /><PerspectiveCamera makeDefault position={[0, 0.5, 2.5]} /><Suspense fallback={null}><Avatar3D level={profile.level} /></Suspense></Canvas>
          </View>
          {isEditing ? (
            <View style={styles.editContainer}>
              <TextInput style={styles.usernameInput} value={editUsername} onChangeText={setEditUsername} placeholder="Nome utente" placeholderTextColor="#9ca3af" maxLength={20} />
              <Pressable style={styles.saveButton} onPress={handleSaveUsername}><ThemedText style={styles.saveButtonText}>Salva</ThemedText></Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setIsEditing(true)}><ThemedText style={styles.username}>{profile.username} ✏️</ThemedText></Pressable>
          )}
          <View style={[styles.rankBadge, { backgroundColor: RARITY_COLORS.epic }]}><ThemedText style={styles.rankText}>{profile.rank}</ThemedText></View>
          <XPBar xp={profile.xp} xpToNext={profile.xpToNext} level={profile.level} />
        </View>

        <View style={styles.statsGrid}>
          <StatCard icon="🪙" label="Monete" value={profile.coins.toLocaleString()} color="#f59e0b" />
          <StatCard icon="🍃" label="G-Leaf" value={profile.gLeaf.toLocaleString()} color="#22c55e" />
          <StatCard icon="🌱" label="Piante" value={profile.plantsGrown} color="#3b82f6" />
          <StatCard icon="🐛" label="Parassiti" value={profile.parasitesKilled.toLocaleString()} color="#ef4444" />
        </View>

        <ThemedText style={styles.sectionTitle}>Il Mio Garden 3D</ThemedText>
        <View style={styles.garden3DContainer}>
          <Canvas><ambientLight intensity={0.5} /><pointLight position={[5, 5, 5]} intensity={1} /><PerspectiveCamera makeDefault position={[0, 2, 4]} /><OrbitControls enableZoom={false} enablePan={false} /><Suspense fallback={null}><Garden3D plants={gardenPlants} /></Suspense></Canvas>
        </View>

        <Pressable style={styles.shareButton} onPress={handleShareGarden}><ThemedText style={styles.shareButtonText}>📤 Condividi il tuo Garden</ThemedText></Pressable>

        <ThemedText style={styles.sectionTitle}>Achievements</ThemedText>
        <View style={styles.achievementsContainer}>
          {[{ id: '1', icon: '🌱', name: 'Prima Pianta', unlocked: true }, { id: '2', icon: '🐛', name: 'Sterminatore', unlocked: true }, { id: '3', icon: '🧬', name: 'Genetista', unlocked: true }, { id: '4', icon: '💰', name: 'Milionario', unlocked: false }, { id: '5', icon: '⭐', name: 'Leggendario', unlocked: false }].map((a) => (
            <View key={a.id} style={[styles.achievementBadge, !a.unlocked && styles.achievementLocked]}><ThemedText style={styles.achievementIcon}>{a.icon}</ThemedText><ThemedText style={styles.achievementName}>{a.name}</ThemedText></View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { alignItems: 'center', marginBottom: 20 },
  logo: { width: 150, height: 75 },
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
  garden3DContainer: { height: 280, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  shareButton: { backgroundColor: '#3b82f6', borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 24 },
  shareButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  achievementsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  achievementBadge: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 12, alignItems: 'center', width: (width - 64) / 3 },
  achievementLocked: { opacity: 0.4 },
  achievementIcon: { fontSize: 28, marginBottom: 4 },
  achievementName: { fontSize: 10, color: '#166534', textAlign: 'center' },
});
