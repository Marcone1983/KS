// @ts-nocheck
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useSounds } from '@/hooks/use-sounds';

const { width } = Dimensions.get('window');

interface PlantVariety {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  traits: string[];
  unlocked: boolean;
  color: string;
  genetics: {
    resistance: number;
    growth: number;
    yield: number;
    potency: number;
  };
}

const PLANT_VARIETIES: PlantVariety[] = [
  { id: 'classic', name: 'Cannabis Classica', rarity: 'common', traits: ['Resistenza Base', 'Crescita Normale'], unlocked: true, color: '#22c55e', genetics: { resistance: 50, growth: 50, yield: 50, potency: 50 } },
  { id: 'purple', name: 'Purple Haze', rarity: 'rare', traits: ['Alta Resistenza', 'Crescita Lenta', 'Bonus XP'], unlocked: true, color: '#a855f7', genetics: { resistance: 70, growth: 40, yield: 60, potency: 75 } },
  { id: 'golden', name: 'Golden Leaf', rarity: 'epic', traits: ['Bonus Monete', 'Crescita Veloce', 'Attira Power-up'], unlocked: true, color: '#f59e0b', genetics: { resistance: 60, growth: 80, yield: 85, potency: 65 } },
  { id: 'crystal', name: 'Crystal Kush', rarity: 'legendary', traits: ['Immunità Temporanea', 'Rigenerazione', 'Aura Protettiva'], unlocked: true, color: '#06b6d4', genetics: { resistance: 90, growth: 70, yield: 80, potency: 95 } },
];

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

// 3D Plant Model Component
function Plant3D({ color, scale = 1, animate = true }: { color: string; scale?: number; animate?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const leafRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    if (groupRef.current && animate) {
      groupRef.current.rotation.y += 0.005;
      // Gentle swaying animation
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
    // Animate leaves
    leafRefs.current.forEach((leaf, i) => {
      if (leaf && animate) {
        leaf.rotation.z = Math.sin(state.clock.elapsedTime * 1.5 + i * 0.5) * 0.1;
      }
    });
  });

  return (
    <group ref={groupRef} scale={scale}>
      {/* Stem */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 1.2, 8]} />
        <meshStandardMaterial color="#2d5016" />
      </mesh>
      
      {/* Main leaves */}
      {[0, 72, 144, 216, 288].map((angle, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) leafRefs.current[i] = el; }}
          position={[
            Math.cos((angle * Math.PI) / 180) * 0.3,
            0.3 + i * 0.15,
            Math.sin((angle * Math.PI) / 180) * 0.3,
          ]}
          rotation={[0.3, (angle * Math.PI) / 180, 0.2]}
        >
          <coneGeometry args={[0.15, 0.5, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      
      {/* Top bud */}
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      
      {/* Pot */}
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.25, 0.2, 0.3, 16]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  );
}

// DNA Helix Animation for Breeding
function DNAHelix({ active }: { active: boolean }) {
  const helixRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (helixRef.current && active) {
      helixRef.current.rotation.y += 0.02;
    }
  });

  if (!active) return null;

  return (
    <group ref={helixRef}>
      {Array.from({ length: 20 }).map((_, i) => {
        const y = (i - 10) * 0.15;
        const angle = i * 0.5;
        return (
          <group key={i}>
            <mesh position={[Math.cos(angle) * 0.3, y, Math.sin(angle) * 0.3]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[Math.cos(angle + Math.PI) * 0.3, y, Math.sin(angle + Math.PI) * 0.3]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
            </mesh>
            {/* Connection */}
            <mesh position={[0, y, 0]} rotation={[0, angle, Math.PI / 2]}>
              <cylinderGeometry args={[0.01, 0.01, 0.6, 4]} />
              <meshStandardMaterial color="#ffffff" opacity={0.5} transparent />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Genetics Bar Component
function GeneticsBar({ label, value, color }: { label: string; value: number; color: string }) {
  const animatedWidth = useSharedValue(0);
  
  useEffect(() => {
    animatedWidth.value = withTiming(value, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [value]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View style={styles.geneticsBarContainer}>
      <ThemedText style={styles.geneticsLabel}>{label}</ThemedText>
      <View style={styles.geneticsBarBg}>
        <Animated.View style={[styles.geneticsBarFill, { backgroundColor: color }, barStyle]} />
      </View>
      <ThemedText style={styles.geneticsValue}>{value}%</ThemedText>
    </View>
  );
}

export default function BreedingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play, playLoop, stopLoop } = useSounds();
  const [selectedParent1, setSelectedParent1] = useState<PlantVariety | null>(null);
  const [selectedParent2, setSelectedParent2] = useState<PlantVariety | null>(null);
  const [isBreeding, setIsBreeding] = useState(false);
  const [breedingProgress, setBreedingProgress] = useState(0);
  const [offspring, setOffspring] = useState<PlantVariety | null>(null);

  const calculateOffspring = (p1: PlantVariety, p2: PlantVariety): PlantVariety => {
    const avgGenetics = {
      resistance: Math.round((p1.genetics.resistance + p2.genetics.resistance) / 2 + (Math.random() * 20 - 10)),
      growth: Math.round((p1.genetics.growth + p2.genetics.growth) / 2 + (Math.random() * 20 - 10)),
      yield: Math.round((p1.genetics.yield + p2.genetics.yield) / 2 + (Math.random() * 20 - 10)),
      potency: Math.round((p1.genetics.potency + p2.genetics.potency) / 2 + (Math.random() * 20 - 10)),
    };
    
    // Clamp values
    Object.keys(avgGenetics).forEach(key => {
      avgGenetics[key as keyof typeof avgGenetics] = Math.max(0, Math.min(100, avgGenetics[key as keyof typeof avgGenetics]));
    });

    const avgScore = (avgGenetics.resistance + avgGenetics.growth + avgGenetics.yield + avgGenetics.potency) / 4;
    let rarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
    if (avgScore > 80) rarity = 'legendary';
    else if (avgScore > 65) rarity = 'epic';
    else if (avgScore > 50) rarity = 'rare';

    return {
      id: `hybrid_${Date.now()}`,
      name: `${p1.name.split(' ')[0]} ${p2.name.split(' ')[1] || 'Hybrid'}`,
      rarity,
      traits: [...new Set([...p1.traits.slice(0, 1), ...p2.traits.slice(0, 1)])],
      unlocked: true,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      genetics: avgGenetics,
    };
  };

  const handleBreed = () => {
    if (!selectedParent1 || !selectedParent2) return;
    
    setIsBreeding(true);
    setBreedingProgress(0);
    setOffspring(null);
    
    // Play breeding sounds
    play('breed_start');
    playLoop('breed_loop');
    
    const interval = setInterval(() => {
      setBreedingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBreeding(false);
          stopLoop('breed_loop');
          const newOffspring = calculateOffspring(selectedParent1, selectedParent2);
          setOffspring(newOffspring);
          
          // Play completion sound based on rarity
          if (newOffspring.rarity === 'legendary' || newOffspring.rarity === 'epic') {
            play('strain_unlock');
          } else {
            play('breed_complete');
          }
          return 100;
        }
        // Play tick sound every 10%
        if (prev % 10 === 0) {
          play('growth_tick');
        }
        return prev + 2;
      });
    }, 50);
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

        <ThemedText style={styles.title}>Breeding Lab 3D</ThemedText>
        <ThemedText style={styles.subtitle}>Crea nuove varietà genetiche</ThemedText>

        {/* 3D Breeding Station */}
        <View style={styles.breedingStation3D}>
          <View style={styles.canvas3DContainer}>
            <Canvas>
              <ambientLight intensity={0.6} />
              <pointLight position={[5, 5, 5]} intensity={1} />
              <pointLight position={[-5, 5, -5]} intensity={0.5} color="#22c55e" />
              <PerspectiveCamera makeDefault position={[0, 1, 4]} />
              <OrbitControls enableZoom={false} enablePan={false} />
              
              <Suspense fallback={null}>
                {/* Parent 1 */}
                {selectedParent1 && (
                  <group position={[-1.2, 0, 0]}>
                    <Plant3D color={selectedParent1.color} scale={0.8} />
                  </group>
                )}
                
                {/* DNA Helix in center */}
                <DNAHelix active={isBreeding} />
                
                {/* Parent 2 */}
                {selectedParent2 && (
                  <group position={[1.2, 0, 0]}>
                    <Plant3D color={selectedParent2.color} scale={0.8} />
                  </group>
                )}
                
                {/* Offspring */}
                {offspring && !isBreeding && (
                  <group position={[0, 0, 0]}>
                    <Plant3D color={offspring.color} scale={1} />
                  </group>
                )}
              </Suspense>
            </Canvas>
          </View>

          {/* Parent Selection Labels */}
          <View style={styles.parentLabels}>
            <View style={styles.parentLabel}>
              <ThemedText style={styles.parentLabelText}>
                {selectedParent1 ? selectedParent1.name : 'Seleziona Genitore 1'}
              </ThemedText>
            </View>
            <ThemedText style={styles.plusSign}>×</ThemedText>
            <View style={styles.parentLabel}>
              <ThemedText style={styles.parentLabelText}>
                {selectedParent2 ? selectedParent2.name : 'Seleziona Genitore 2'}
              </ThemedText>
            </View>
          </View>

          {/* Breed Button */}
          <Pressable
            style={[styles.breedButton, (!selectedParent1 || !selectedParent2 || isBreeding) && styles.breedButtonDisabled]}
            onPress={handleBreed}
            disabled={!selectedParent1 || !selectedParent2 || isBreeding}
          >
            {isBreeding ? (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${breedingProgress}%` }]} />
                <ThemedText style={styles.breedButtonText}>Breeding... {breedingProgress}%</ThemedText>
              </View>
            ) : (
              <ThemedText style={styles.breedButtonText}>
                {offspring ? 'Nuovo Breeding' : 'Inizia Breeding'}
              </ThemedText>
            )}
          </Pressable>
        </View>

        {/* Offspring Result */}
        {offspring && (
          <View style={styles.offspringCard}>
            <ThemedText style={styles.offspringTitle}>Nuova Varietà Creata!</ThemedText>
            <ThemedText style={[styles.offspringName, { color: RARITY_COLORS[offspring.rarity] }]}>
              {offspring.name}
            </ThemedText>
            <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[offspring.rarity] }]}>
              <ThemedText style={styles.rarityText}>{offspring.rarity.toUpperCase()}</ThemedText>
            </View>
            <View style={styles.geneticsContainer}>
              <GeneticsBar label="Resistenza" value={offspring.genetics.resistance} color="#ef4444" />
              <GeneticsBar label="Crescita" value={offspring.genetics.growth} color="#22c55e" />
              <GeneticsBar label="Resa" value={offspring.genetics.yield} color="#f59e0b" />
              <GeneticsBar label="Potenza" value={offspring.genetics.potency} color="#a855f7" />
            </View>
          </View>
        )}

        {/* Available Varieties */}
        <ThemedText style={styles.sectionTitle}>Varietà Disponibili</ThemedText>
        <View style={styles.varietiesGrid}>
          {PLANT_VARIETIES.map((variety) => (
            <Pressable
              key={variety.id}
              style={[
                styles.varietyCard,
                !variety.unlocked && styles.lockedCard,
                { borderColor: RARITY_COLORS[variety.rarity] },
                (selectedParent1?.id === variety.id || selectedParent2?.id === variety.id) && styles.selectedCard,
              ]}
              onPress={() => {
                if (!variety.unlocked) return;
                if (!selectedParent1) {
                  setSelectedParent1(variety);
                  setOffspring(null);
                } else if (!selectedParent2 && variety.id !== selectedParent1.id) {
                  setSelectedParent2(variety);
                  setOffspring(null);
                } else if (selectedParent1.id === variety.id) {
                  setSelectedParent1(null);
                } else if (selectedParent2?.id === variety.id) {
                  setSelectedParent2(null);
                }
              }}
            >
              <View style={[styles.varietyPreview, { backgroundColor: variety.color + '20' }]}>
                <View style={[styles.varietyDot, { backgroundColor: variety.color }]} />
              </View>
              <ThemedText style={styles.varietyName}>{variety.name}</ThemedText>
              <View style={[styles.rarityBadgeSmall, { backgroundColor: RARITY_COLORS[variety.rarity] }]}>
                <ThemedText style={styles.rarityTextSmall}>{variety.rarity.toUpperCase()}</ThemedText>
              </View>
            </Pressable>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  logo: { width: 120, height: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a7f3d0', textAlign: 'center', marginBottom: 24 },
  breedingStation3D: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  canvas3DContainer: { height: 250, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0a0a0a' },
  parentLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 16 },
  parentLabel: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  parentLabelText: { color: '#fff', fontSize: 12 },
  plusSign: { fontSize: 24, color: '#f59e0b', marginHorizontal: 12 },
  breedButton: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center', overflow: 'hidden' },
  breedButtonDisabled: { backgroundColor: '#4b5563' },
  breedButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  progressContainer: { width: '100%', height: 24, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#16a34a', borderRadius: 12 },
  offspringCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 20, marginBottom: 24, alignItems: 'center' },
  offspringTitle: { fontSize: 16, color: '#166534', marginBottom: 8 },
  offspringName: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  geneticsContainer: { width: '100%', marginTop: 16 },
  geneticsBarContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  geneticsLabel: { width: 80, fontSize: 12, color: '#374151' },
  geneticsBarBg: { flex: 1, height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
  geneticsBarFill: { height: '100%', borderRadius: 6 },
  geneticsValue: { width: 40, textAlign: 'right', fontSize: 12, color: '#374151' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  varietiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  varietyCard: { width: (width - 52) / 2, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 3 },
  selectedCard: { backgroundColor: '#dcfce7' },
  lockedCard: { opacity: 0.6 },
  varietyPreview: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  varietyDot: { width: 30, height: 30, borderRadius: 15 },
  varietyName: { fontSize: 14, fontWeight: 'bold', color: '#166534', textAlign: 'center' },
  rarityBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  rarityBadgeSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  rarityText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  rarityTextSmall: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
});
