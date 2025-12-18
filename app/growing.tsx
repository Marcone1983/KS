// @ts-nocheck
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Float, Sparkles } from '@react-three/drei/native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Asset } from 'expo-asset';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, withSpring, Easing } from 'react-native-reanimated';
import { useSounds } from '@/hooks/use-sounds';
import { 
  PlantGrowthViewer, 
  StageTimeline, 
  TimeLapseControls,
  GROWTH_STAGES 
} from '@/components/growth/PlantGrowthSystem';

const { width } = Dimensions.get('window');

interface Plant {
  id: string;
  name: string;
  strain: string;
  stage: number;
  maxStage: number;
  health: number;
  water: number;
  nutrients: number;
  growthProgress: number;
  lastWatered: number;
  lastFed: number;
  daysGrown: number;
  genetics: {
    thc: number;
    cbd: number;
    yield: number;
    flowerTime: number;
  };
}

interface TutorMessage {
  id: string;
  text: string;
  type: 'tip' | 'warning' | 'success';
}

// 3D Tutor Character
function Tutor3D({ message }: { message: string | null }) {
  const tutorRef = useRef<THREE.Group>(null);
  
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

// Stage Info Card
function StageInfoCard({ stage }: { stage: number }) {
  const stageInfo = GROWTH_STAGES[stage - 1];
  if (!stageInfo) return null;
  
  return (
    <View style={styles.stageInfoCard}>
      <View style={styles.stageInfoHeader}>
        <ThemedText style={styles.stageInfoTitle}>
          Stadio {stage}: {stageInfo.nameIt}
        </ThemedText>
        <View style={[
          styles.phaseBadge, 
          { backgroundColor: stageInfo.phase === 'vegetative' ? '#22c55e' : '#f59e0b' }
        ]}>
          <ThemedText style={styles.phaseBadgeText}>
            {stageInfo.phase === 'vegetative' ? 'Vegetativa' : 'Fioritura'}
          </ThemedText>
        </View>
      </View>
      <ThemedText style={styles.stageInfoDesc}>{stageInfo.descriptionIt}</ThemedText>
      <View style={styles.stageInfoStats}>
        <View style={styles.stageInfoStat}>
          <ThemedText style={styles.statIcon}>💧</ThemedText>
          <ThemedText style={styles.statLabel}>Acqua: {stageInfo.waterNeeds}</ThemedText>
        </View>
        <View style={styles.stageInfoStat}>
          <ThemedText style={styles.statIcon}>🧪</ThemedText>
          <ThemedText style={styles.statLabel}>Nutrienti: {stageInfo.nutrientNeeds}</ThemedText>
        </View>
        <View style={styles.stageInfoStat}>
          <ThemedText style={styles.statIcon}>💡</ThemedText>
          <ThemedText style={styles.statLabel}>Luce: {stageInfo.lightHours}h</ThemedText>
        </View>
        <View style={styles.stageInfoStat}>
          <ThemedText style={styles.statIcon}>📅</ThemedText>
          <ThemedText style={styles.statLabel}>Giorni: {stageInfo.daysRequired}</ThemedText>
        </View>
      </View>
    </View>
  );
}

export default function GrowingLabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play, playLoop, stopLoop } = useSounds();
  
  const [plant, setPlant] = useState<Plant>({
    id: '1',
    name: 'Kurstaki Kush',
    strain: 'Indica Dominant',
    stage: 1,
    maxStage: 8,
    health: 100,
    water: 80,
    nutrients: 70,
    growthProgress: 0,
    lastWatered: Date.now(),
    lastFed: Date.now(),
    daysGrown: 0,
    genetics: {
      thc: 22,
      cbd: 1,
      yield: 450,
      flowerTime: 56,
    },
  });
  
  const [tutorMessage, setTutorMessage] = useState<string | null>(null);
  const [isWatering, setIsWatering] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);
  const [dayNightCycle, setDayNightCycle] = useState<'day' | 'night'>('day');
  const [isTimeLapseActive, setIsTimeLapseActive] = useState(false);
  const [timeLapseSpeed, setTimeLapseSpeed] = useState(1);

  // Load saved plant data
  useEffect(() => {
    const loadPlantData = async () => {
      try {
        const savedPlant = await AsyncStorage.getItem('growing_plant');
        if (savedPlant) {
          setPlant(JSON.parse(savedPlant));
        }
      } catch (error) {
        console.error('Error loading plant data:', error);
      }
    };
    loadPlantData();
  }, []);

  // Save plant data
  useEffect(() => {
    const savePlantData = async () => {
      try {
        await AsyncStorage.setItem('growing_plant', JSON.stringify(plant));
      } catch (error) {
        console.error('Error saving plant data:', error);
      }
    };
    savePlantData();
  }, [plant]);

  // Simulate growth over time
  useEffect(() => {
    if (isTimeLapseActive) return; // Skip normal growth during time-lapse
    
    const interval = setInterval(() => {
      setPlant(prev => {
        const newWater = Math.max(0, prev.water - 0.3);
        const newNutrients = Math.max(0, prev.nutrients - 0.2);
        const healthPenalty = (newWater < 20 ? 1 : 0) + (newNutrients < 20 ? 0.5 : 0);
        const newHealth = Math.max(0, Math.min(100, prev.health - healthPenalty + (newWater > 50 && newNutrients > 50 ? 0.1 : 0)));
        
        let newProgress = prev.growthProgress;
        let newDaysGrown = prev.daysGrown;
        
        if (newHealth > 50 && newWater > 30 && newNutrients > 30) {
          newProgress = Math.min(100, prev.growthProgress + 0.05);
          newDaysGrown = prev.daysGrown + 0.01; // Simulate time passing
        }
        
        // Calculate stage based on progress (8 stages = 12.5% each)
        const newStage = Math.min(prev.maxStage, Math.floor(newProgress / 12.5) + 1);
        
        // Play level up sound when stage changes
        if (newStage > prev.stage) {
          play('plant_levelup');
        }
        
        return {
          ...prev,
          water: newWater,
          nutrients: newNutrients,
          health: newHealth,
          growthProgress: newProgress,
          stage: newStage,
          daysGrown: newDaysGrown,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimeLapseActive, play]);

  // Tutor messages based on plant state
  useEffect(() => {
    const stageInfo = GROWTH_STAGES[plant.stage - 1];
    
    if (plant.water < 30) {
      setTutorMessage('La pianta ha sete! Innaffiala subito!');
    } else if (plant.nutrients < 30) {
      setTutorMessage('Aggiungi nutrienti per una crescita ottimale!');
    } else if (plant.health < 50) {
      setTutorMessage('Attenzione! La salute della pianta è bassa!');
    } else if (plant.stage >= 5 && stageInfo?.phase === 'flowering') {
      setTutorMessage('Fase fioritura! Riduci le ore di luce a 12h.');
    } else if (plant.stage === 8) {
      setTutorMessage('Pronta per il raccolto! I tricomi sono ambrati.');
    } else if (plant.health > 80) {
      setTutorMessage('Ottimo lavoro! La pianta sta crescendo bene!');
    } else {
      setTutorMessage(null);
    }
  }, [plant.water, plant.nutrients, plant.health, plant.stage]);

  const handleWater = () => {
    setIsWatering(true);
    play('spray_start');
    playLoop('spray_loop');
    setTimeout(() => {
      stopLoop('spray_loop');
      play('spray_refill');
      setPlant(prev => ({ 
        ...prev, 
        water: Math.min(100, prev.water + 30), 
        lastWatered: Date.now() 
      }));
      setIsWatering(false);
    }, 2000);
  };

  const handleFeed = () => {
    setIsFeeding(true);
    play('inv_add_item');
    setTimeout(() => {
      play('growth_tick');
      setPlant(prev => ({ 
        ...prev, 
        nutrients: Math.min(100, prev.nutrients + 25), 
        lastFed: Date.now() 
      }));
      setIsFeeding(false);
    }, 2000);
  };

  const toggleDayNight = () => {
    setDayNightCycle(prev => prev === 'day' ? 'night' : 'day');
  };

  const handleStageChange = (newStage: number) => {
    setPlant(prev => ({
      ...prev,
      stage: newStage,
      growthProgress: (newStage - 1) * 12.5,
    }));
  };

  const handleTimeLapseToggle = () => {
    setIsTimeLapseActive(prev => !prev);
    if (!isTimeLapseActive) {
      play('breed_start');
    }
  };

  const handleTimeLapseReset = () => {
    setIsTimeLapseActive(false);
    setPlant(prev => ({
      ...prev,
      stage: 1,
      growthProgress: 0,
      daysGrown: 0,
    }));
  };

  const handleHarvest = () => {
    if (plant.stage === 8) {
      Alert.alert(
        'Raccolto!',
        `Hai raccolto ${plant.name}!\n\nResa: ${plant.genetics.yield}g\nTHC: ${plant.genetics.thc}%\nCBD: ${plant.genetics.cbd}%`,
        [
          {
            text: 'Nuova Pianta',
            onPress: () => {
              setPlant(prev => ({
                ...prev,
                stage: 1,
                growthProgress: 0,
                daysGrown: 0,
                health: 100,
                water: 80,
                nutrients: 70,
              }));
            },
          },
        ]
      );
      play('strain_unlock');
    }
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
        <ThemedText style={styles.subtitle}>
          {plant.name} - {plant.strain}
        </ThemedText>

        {/* 3D Plant View with 8-Stage System */}
        <View style={styles.plantView3D}>
          <PlantGrowthViewer 
            currentStage={plant.stage}
            onStageChange={handleStageChange}
            isTimeLapseActive={isTimeLapseActive}
            timeLapseSpeed={timeLapseSpeed}
          />
          
          {/* Day/Night Toggle */}
          <Pressable style={styles.dayNightToggle} onPress={toggleDayNight}>
            <ThemedText style={styles.dayNightIcon}>{dayNightCycle === 'day' ? '☀️' : '🌙'}</ThemedText>
          </Pressable>
          
          {/* Harvest Button (only at stage 8) */}
          {plant.stage === 8 && (
            <Pressable style={styles.harvestButton} onPress={handleHarvest}>
              <ThemedText style={styles.harvestButtonText}>🌿 Raccogli</ThemedText>
            </Pressable>
          )}
        </View>

        {/* Stage Info Card */}
        <StageInfoCard stage={plant.stage} />

        {/* Tutor Message */}
        {tutorMessage && (
          <View style={styles.tutorBubble}>
            <View style={styles.tutorAvatar}>
              <ThemedText style={styles.tutorAvatarEmoji}>🌱</ThemedText>
            </View>
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

        {/* Genetics Info */}
        <View style={styles.geneticsContainer}>
          <ThemedText style={styles.geneticsTitle}>Genetica</ThemedText>
          <View style={styles.geneticsGrid}>
            <View style={styles.geneticItem}>
              <ThemedText style={styles.geneticValue}>{plant.genetics.thc}%</ThemedText>
              <ThemedText style={styles.geneticLabel}>THC</ThemedText>
            </View>
            <View style={styles.geneticItem}>
              <ThemedText style={styles.geneticValue}>{plant.genetics.cbd}%</ThemedText>
              <ThemedText style={styles.geneticLabel}>CBD</ThemedText>
            </View>
            <View style={styles.geneticItem}>
              <ThemedText style={styles.geneticValue}>{plant.genetics.yield}g</ThemedText>
              <ThemedText style={styles.geneticLabel}>Resa</ThemedText>
            </View>
            <View style={styles.geneticItem}>
              <ThemedText style={styles.geneticValue}>{plant.genetics.flowerTime}d</ThemedText>
              <ThemedText style={styles.geneticLabel}>Fioritura</ThemedText>
            </View>
          </View>
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

        {/* Time-Lapse Controls */}
        <TimeLapseControls
          isActive={isTimeLapseActive}
          speed={timeLapseSpeed}
          onToggle={handleTimeLapseToggle}
          onSpeedChange={setTimeLapseSpeed}
          onReset={handleTimeLapseReset}
        />

        {/* Growth Timeline with 8 Stages */}
        <StageTimeline 
          currentStage={plant.stage} 
          onStageSelect={handleStageChange}
        />

        {/* Days Counter */}
        <View style={styles.daysCounter}>
          <ThemedText style={styles.daysLabel}>Giorni di crescita</ThemedText>
          <ThemedText style={styles.daysValue}>{Math.floor(plant.daysGrown)}</ThemedText>
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
  plantView3D: { 
    height: 350, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    borderRadius: 20, 
    overflow: 'hidden', 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  dayNightToggle: { 
    position: 'absolute', 
    top: 16, 
    right: 16, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    borderRadius: 20, 
    padding: 8 
  },
  dayNightIcon: { fontSize: 24 },
  harvestButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: '#f59e0b',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  harvestButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stageInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  stageInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#166534',
  },
  phaseBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  phaseBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stageInfoDesc: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 12,
  },
  stageInfoStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stageInfoStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  statIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#4b5563',
  },
  tutorBubble: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16 
  },
  tutorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tutorAvatarEmoji: {
    fontSize: 20,
  },
  tutorText: { 
    flex: 1,
    color: '#166534', 
    fontSize: 14,
  },
  statusContainer: { 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 16 
  },
  statusBarContainer: { marginBottom: 12 },
  statusBarHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statusIcon: { fontSize: 16, marginRight: 8 },
  statusLabel: { flex: 1, color: '#fff', fontSize: 14 },
  statusValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  statusBarBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden' },
  statusBarFill: { height: '100%', borderRadius: 4 },
  geneticsContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  geneticsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  geneticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  geneticItem: {
    alignItems: 'center',
  },
  geneticValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  geneticLabel: {
    fontSize: 12,
    color: '#a7f3d0',
  },
  actionButtons: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actionButton: { flex: 1, borderRadius: 16, padding: 16, alignItems: 'center' },
  waterButton: { backgroundColor: '#3b82f6' },
  feedButton: { backgroundColor: '#f59e0b' },
  buttonDisabled: { opacity: 0.6 },
  actionIcon: { fontSize: 32, marginBottom: 8 },
  actionText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  daysCounter: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  daysLabel: {
    fontSize: 14,
    color: '#a7f3d0',
  },
  daysValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
});
