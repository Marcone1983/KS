// @ts-nocheck
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Text as DreiText } from '@react-three/drei/native';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import { useSounds } from '@/hooks/use-sounds';

const { width } = Dimensions.get('window');

interface Plant {
  id: string;
  name: string;
  stage: number;
  maxStage: number;
  health: number;
  water: number;
  nutrients: number;
  growthProgress: number;
  lastWatered: number;
  lastFed: number;
  color: string;
}

interface TutorMessage {
  id: string;
  text: string;
  type: 'tip' | 'warning' | 'success';
}

// 3D Growing Plant Component
function GrowingPlant3D({ plant, isSelected }: { plant: Plant; isSelected: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const scale = plant.stage / plant.maxStage;
  
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle breathing animation
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      groupRef.current.scale.set(breathe, breathe, breathe);
      
      if (isSelected) {
        groupRef.current.rotation.y += 0.005;
      }
    }
  });

  const stemHeight = 0.3 + scale * 1.2;
  const leafCount = Math.floor(scale * 7) + 2;
  const budSize = scale * 0.25;

  return (
    <group ref={groupRef}>
      {/* Pot */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.3, 0.25, 0.4, 16]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Soil */}
      <mesh position={[0, -0.28, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.05, 16]} />
        <meshStandardMaterial color="#3d2914" />
      </mesh>
      
      {/* Stem */}
      <mesh position={[0, stemHeight / 2 - 0.3, 0]}>
        <cylinderGeometry args={[0.03 + scale * 0.02, 0.05, stemHeight, 8]} />
        <meshStandardMaterial color="#2d5016" />
      </mesh>
      
      {/* Leaves */}
      {Array.from({ length: leafCount }).map((_, i) => {
        const angle = (i / leafCount) * Math.PI * 2;
        const height = -0.1 + (i / leafCount) * stemHeight * 0.8;
        const leafSize = 0.1 + (i / leafCount) * 0.15 * scale;
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * 0.15,
              height,
              Math.sin(angle) * 0.15,
            ]}
            rotation={[0.5, angle, 0.3]}
          >
            <coneGeometry args={[leafSize, leafSize * 2, 4]} />
            <meshStandardMaterial color={plant.color} />
          </mesh>
        );
      })}
      
      {/* Top Bud (only visible in later stages) */}
      {scale > 0.5 && (
        <mesh position={[0, stemHeight - 0.2, 0]}>
          <sphereGeometry args={[budSize, 16, 16]} />
          <meshStandardMaterial 
            color={plant.color} 
            emissive={plant.color} 
            emissiveIntensity={0.3} 
          />
        </mesh>
      )}
      
      {/* Health indicator ring */}
      <mesh position={[0, -0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.4, 32]} />
        <meshStandardMaterial 
          color={plant.health > 70 ? '#22c55e' : plant.health > 30 ? '#f59e0b' : '#ef4444'} 
          emissive={plant.health > 70 ? '#22c55e' : plant.health > 30 ? '#f59e0b' : '#ef4444'}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

// 3D Tutor Character
function Tutor3D({ message }: { message: string | null }) {
  const tutorRef = useRef<THREE.Group>(null);
  const [bobOffset, setBobOffset] = useState(0);
  
  useFrame((state) => {
    if (tutorRef.current) {
      tutorRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      tutorRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
    }
  });

  if (!message) return null;

  return (
    <group ref={tutorRef} position={[1.5, 0.5, 0]}>
      {/* Body */}
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#22c55e" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.08, 0.05, 0.2]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      <mesh position={[0.08, 0.05, 0.2]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#fff" />
      </mesh>
      {/* Pupils */}
      <mesh position={[-0.08, 0.05, 0.24]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.08, 0.05, 0.24]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      {/* Leaf antenna */}
      <mesh position={[0, 0.25, 0]} rotation={[0, 0, 0.3]}>
        <coneGeometry args={[0.08, 0.2, 4]} />
        <meshStandardMaterial color="#16a34a" />
      </mesh>
    </group>
  );
}

// Water/Nutrient Particles
function Particles({ type, active }: { type: 'water' | 'nutrient'; active: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (particlesRef.current && active) {
      particlesRef.current.rotation.y += 0.01;
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 0.02;
        if (positions[i] < -1) positions[i] = 1;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (!active) return null;

  const particleCount = 50;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1;
    positions[i * 3 + 1] = Math.random() * 2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1;
  }

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial 
        size={0.05} 
        color={type === 'water' ? '#3b82f6' : '#f59e0b'} 
        transparent 
        opacity={0.8} 
      />
    </points>
  );
}

// Status Bar Component
function StatusBar({ label, value, maxValue, color, icon }: { label: string; value: number; maxValue: number; color: string; icon: string }) {
  const percentage = (value / maxValue) * 100;
  const barWidth = useSharedValue(0);
  
  useEffect(() => {
    barWidth.value = withTiming(percentage, { duration: 500 });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  return (
    <View style={styles.statusBarContainer}>
      <View style={styles.statusBarHeader}>
        <ThemedText style={styles.statusIcon}>{icon}</ThemedText>
        <ThemedText style={styles.statusLabel}>{label}</ThemedText>
        <ThemedText style={styles.statusValue}>{Math.round(value)}%</ThemedText>
      </View>
      <View style={styles.statusBarBg}>
        <Animated.View style={[styles.statusBarFill, { backgroundColor: color }, animatedStyle]} />
      </View>
    </View>
  );
}

const TUTOR_TIPS: TutorMessage[] = [
  { id: '1', text: 'Ricorda di innaffiare la pianta ogni 2 ore!', type: 'tip' },
  { id: '2', text: 'I nutrienti aiutano la crescita più veloce', type: 'tip' },
  { id: '3', text: 'La pianta ha bisogno di acqua!', type: 'warning' },
  { id: '4', text: 'Ottimo lavoro! La pianta sta crescendo bene!', type: 'success' },
];

export default function GrowingLabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play, playLoop, stopLoop } = useSounds();
  const [plant, setPlant] = useState<Plant>({
    id: '1',
    name: 'Cannabis Classica',
    stage: 2,
    maxStage: 5,
    health: 85,
    water: 60,
    nutrients: 45,
    growthProgress: 40,
    lastWatered: Date.now(),
    lastFed: Date.now(),
    color: '#22c55e',
  });
  const [tutorMessage, setTutorMessage] = useState<string | null>(null);
  const [isWatering, setIsWatering] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);
  const [dayNightCycle, setDayNightCycle] = useState<'day' | 'night'>('day');

  // Simulate growth over time
  useEffect(() => {
    const interval = setInterval(() => {
      setPlant(prev => {
        const newWater = Math.max(0, prev.water - 0.5);
        const newNutrients = Math.max(0, prev.nutrients - 0.3);
        const healthPenalty = (newWater < 20 ? 1 : 0) + (newNutrients < 20 ? 0.5 : 0);
        const newHealth = Math.max(0, Math.min(100, prev.health - healthPenalty + (newWater > 50 && newNutrients > 50 ? 0.2 : 0)));
        
        let newProgress = prev.growthProgress;
        if (newHealth > 50 && newWater > 30 && newNutrients > 30) {
          newProgress = Math.min(100, prev.growthProgress + 0.1);
        }
        
        const newStage = Math.min(prev.maxStage, Math.floor(newProgress / 20) + 1);
        
        return {
          ...prev,
          water: newWater,
          nutrients: newNutrients,
          health: newHealth,
          growthProgress: newProgress,
          stage: newStage,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Tutor messages
  useEffect(() => {
    if (plant.water < 30) {
      setTutorMessage('La pianta ha sete! Innaffiala!');
    } else if (plant.nutrients < 30) {
      setTutorMessage('Aggiungi nutrienti per una crescita migliore!');
    } else if (plant.health > 80) {
      setTutorMessage('Ottimo lavoro! La pianta è in salute!');
    } else {
      setTutorMessage(null);
    }
  }, [plant.water, plant.nutrients, plant.health]);

  const handleWater = () => {
    setIsWatering(true);
    play('spray_start');
    playLoop('spray_loop');
    setTimeout(() => {
      stopLoop('spray_loop');
      play('spray_refill');
      setPlant(prev => ({ ...prev, water: Math.min(100, prev.water + 30), lastWatered: Date.now() }));
      setIsWatering(false);
    }, 2000);
  };

  const handleFeed = () => {
    setIsFeeding(true);
    play('inv_add_item');
    setTimeout(() => {
      play('plant_levelup');
      setPlant(prev => ({ ...prev, nutrients: Math.min(100, prev.nutrients + 25), lastFed: Date.now() }));
      setIsFeeding(false);
    }, 2000);
  };

  const toggleDayNight = () => {
    setDayNightCycle(prev => prev === 'day' ? 'night' : 'day');
  };

  return (
    <LinearGradient 
      colors={dayNightCycle === 'day' ? ['#14532d', '#166534', '#059669'] : ['#0f172a', '#1e293b', '#334155']} 
      style={styles.container}
    >
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

        <ThemedText style={styles.title}>Growing Lab 3D</ThemedText>
        <ThemedText style={styles.subtitle}>{plant.name} - Stadio {plant.stage}/{plant.maxStage}</ThemedText>

        {/* 3D Plant View */}
        <View style={styles.plantView3D}>
          <Canvas>
            <ambientLight intensity={dayNightCycle === 'day' ? 0.6 : 0.2} />
            <pointLight position={[5, 5, 5]} intensity={dayNightCycle === 'day' ? 1 : 0.3} />
            {dayNightCycle === 'night' && (
              <pointLight position={[0, 3, 0]} intensity={0.5} color="#a855f7" />
            )}
            <PerspectiveCamera makeDefault position={[0, 0.5, 3]} />
            <OrbitControls enableZoom={false} enablePan={false} maxPolarAngle={Math.PI / 2} />
            
            <Suspense fallback={null}>
              <GrowingPlant3D plant={plant} isSelected={true} />
              <Tutor3D message={tutorMessage} />
              <Particles type="water" active={isWatering} />
              <Particles type="nutrient" active={isFeeding} />
            </Suspense>
          </Canvas>
          
          {/* Day/Night Toggle */}
          <Pressable style={styles.dayNightToggle} onPress={toggleDayNight}>
            <ThemedText style={styles.dayNightIcon}>{dayNightCycle === 'day' ? '☀️' : '🌙'}</ThemedText>
          </Pressable>
        </View>

        {/* Tutor Message */}
        {tutorMessage && (
          <View style={styles.tutorBubble}>
            <ThemedText style={styles.tutorText}>{tutorMessage}</ThemedText>
          </View>
        )}

        {/* Status Bars */}
        <View style={styles.statusContainer}>
          <StatusBar label="Salute" value={plant.health} maxValue={100} color="#ef4444" icon="❤️" />
          <StatusBar label="Acqua" value={plant.water} maxValue={100} color="#3b82f6" icon="💧" />
          <StatusBar label="Nutrienti" value={plant.nutrients} maxValue={100} color="#f59e0b" icon="🧪" />
          <StatusBar label="Crescita" value={plant.growthProgress} maxValue={100} color="#22c55e" icon="📈" />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Pressable 
            style={[styles.actionButton, styles.waterButton, isWatering && styles.buttonDisabled]} 
            onPress={handleWater}
            disabled={isWatering}
          >
            <ThemedText style={styles.actionIcon}>💧</ThemedText>
            <ThemedText style={styles.actionText}>{isWatering ? 'Innaffiando...' : 'Innaffia'}</ThemedText>
          </Pressable>
          
          <Pressable 
            style={[styles.actionButton, styles.feedButton, isFeeding && styles.buttonDisabled]} 
            onPress={handleFeed}
            disabled={isFeeding}
          >
            <ThemedText style={styles.actionIcon}>🧪</ThemedText>
            <ThemedText style={styles.actionText}>{isFeeding ? 'Nutrendo...' : 'Nutrienti'}</ThemedText>
          </Pressable>
        </View>

        {/* Growth Timeline */}
        <View style={styles.timeline}>
          <ThemedText style={styles.timelineTitle}>Fasi di Crescita</ThemedText>
          <View style={styles.timelineStages}>
            {['🌱', '🌿', '🪴', '🌳', '🌲'].map((emoji, i) => (
              <View key={i} style={[styles.timelineStage, plant.stage > i && styles.timelineStageActive]}>
                <ThemedText style={styles.timelineEmoji}>{emoji}</ThemedText>
                <ThemedText style={styles.timelineLabel}>Fase {i + 1}</ThemedText>
              </View>
            ))}
          </View>
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
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a7f3d0', textAlign: 'center', marginBottom: 24 },
  plantView3D: { height: 300, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  dayNightToggle: { position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8 },
  dayNightIcon: { fontSize: 24 },
  tutorBubble: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16, marginBottom: 16 },
  tutorText: { color: '#166534', fontSize: 14, textAlign: 'center' },
  statusContainer: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 16, marginBottom: 16 },
  statusBarContainer: { marginBottom: 12 },
  statusBarHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusIcon: { fontSize: 16, marginRight: 8 },
  statusLabel: { flex: 1, color: '#fff', fontSize: 14 },
  statusValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  statusBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  statusBarFill: { height: '100%', borderRadius: 4 },
  actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionButton: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  waterButton: { backgroundColor: '#3b82f6' },
  feedButton: { backgroundColor: '#f59e0b' },
  buttonDisabled: { opacity: 0.6 },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  timeline: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16 },
  timelineTitle: { fontSize: 18, fontWeight: 'bold', color: '#166534', marginBottom: 16, textAlign: 'center' },
  timelineStages: { flexDirection: 'row', justifyContent: 'space-between' },
  timelineStage: { alignItems: 'center', opacity: 0.4 },
  timelineStageActive: { opacity: 1 },
  timelineEmoji: { fontSize: 28 },
  timelineLabel: { fontSize: 10, color: '#166534', marginTop: 4 },
});
