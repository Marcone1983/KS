// @ts-nocheck
/**
 * Breeding Visual 3D System
 * 
 * Provides elaborate 3D visualizations for plant breeding:
 * - Parent plant selection with 3D preview
 * - DNA helix animation during breeding
 * - Genetic trait transfer visualization
 * - Offspring reveal with particle effects
 * - Trait inheritance display
 */

import React, { useRef, useState, useEffect, useMemo, Suspense } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Float, Sparkles, Text as DreiText } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  runOnJS
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { GROWTH_STAGES } from '@/components/growth/PlantGrowthSystem';

const { width } = Dimensions.get('window');

// Genetic trait definitions
export interface GeneticTraits {
  thc: number;
  cbd: number;
  yield: number;
  flowerTime: number;
  resistance: number;
  growth: number;
  potency: number;
  terpenes: string[];
}

export interface PlantGenome {
  id: string;
  name: string;
  strain: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  color: string;
  genetics: GeneticTraits;
  stage: number;
}

// 3D Plant for Breeding Preview
function BreedingPlant3D({ 
  genome, 
  position, 
  isSelected,
  isAnimating,
  scale = 1
}: { 
  genome: PlantGenome; 
  position: [number, number, number];
  isSelected: boolean;
  isAnimating: boolean;
  scale?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  
  // Calculate plant appearance from genetics
  const plantConfig = useMemo(() => {
    const { genetics, stage } = genome;
    return {
      height: 0.3 + (stage / 8) * 0.5,
      leafCount: Math.min(12, 2 + stage * 1.5),
      budSize: stage >= 5 ? 0.05 + (genetics.yield / 100) * 0.1 : 0,
      leafColor: new THREE.Color(genome.color),
      budColor: stage === 8 ? new THREE.Color('#d97706') : new THREE.Color(genome.color),
    };
  }, [genome]);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Rotation when selected
      if (isSelected) {
        groupRef.current.rotation.y += 0.01;
      }
      
      // Breathing animation
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      groupRef.current.scale.setScalar(scale * breathe * (hovered ? 1.1 : 1));
      
      // Pulse when animating
      if (isAnimating) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.1;
        groupRef.current.scale.setScalar(scale * pulse);
      }
    }
  });
  
  const { height, leafCount, budSize, leafColor, budColor } = plantConfig;
  
  return (
    <group 
      ref={groupRef} 
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Pot */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.1, 0.08, 0.15, 16]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
      
      {/* Soil */}
      <mesh position={[0, -0.12, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.02, 16]} />
        <meshStandardMaterial color="#3d2914" roughness={0.9} />
      </mesh>
      
      {/* Stem */}
      <mesh position={[0, height / 2 - 0.08, 0]}>
        <cylinderGeometry args={[0.01, 0.015, height, 8]} />
        <meshStandardMaterial color="#2d5016" roughness={0.7} />
      </mesh>
      
      {/* Leaves with candelabra structure */}
      {Array.from({ length: Math.floor(leafCount) }).map((_, i) => {
        const nodeIndex = Math.floor(i / 2);
        const branchSide = i % 2;
        const baseAngle = (nodeIndex % 2) * 90;
        const angle = THREE.MathUtils.degToRad(baseAngle + branchSide * 180);
        const nodeHeight = -0.03 + (nodeIndex / (leafCount / 2)) * height * 0.8;
        const leafSize = 0.03 + (1 - nodeIndex / (leafCount / 2)) * 0.04;
        
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * 0.05,
              nodeHeight,
              Math.sin(angle) * 0.05,
            ]}
            rotation={[0.4, angle, 0.2]}
          >
            <coneGeometry args={[leafSize, leafSize * 2, 4]} />
            <meshStandardMaterial color={leafColor} roughness={0.6} />
          </mesh>
        );
      })}
      
      {/* Main bud */}
      {budSize > 0 && (
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
          <mesh position={[0, height - 0.03, 0]}>
            <sphereGeometry args={[budSize, 16, 16]} />
            <meshStandardMaterial 
              color={budColor} 
              emissive={budColor}
              emissiveIntensity={0.2}
              roughness={0.7}
            />
          </mesh>
        </Float>
      )}
      
      {/* Selection glow */}
      {isSelected && (
        <pointLight 
          position={[0, 0.2, 0]} 
          color={genome.color} 
          intensity={1.5} 
          distance={1} 
        />
      )}
      
      {/* Sparkles for rare plants */}
      {(genome.rarity === 'epic' || genome.rarity === 'legendary') && (
        <Sparkles 
          count={20} 
          scale={0.8} 
          size={1} 
          speed={0.3} 
          color={genome.rarity === 'legendary' ? '#fbbf24' : '#a855f7'} 
        />
      )}
    </group>
  );
}

// Enhanced DNA Helix with genetic trait visualization
function GeneticDNAHelix({ 
  active, 
  parent1Color, 
  parent2Color,
  progress = 0,
  traits1,
  traits2
}: { 
  active: boolean; 
  parent1Color: string;
  parent2Color: string;
  progress: number;
  traits1?: GeneticTraits;
  traits2?: GeneticTraits;
}) {
  const helixRef = useRef<THREE.Group>(null);
  const [particlePositions, setParticlePositions] = useState<Float32Array | null>(null);
  
  // Generate particle positions for trait transfer effect
  useEffect(() => {
    if (active) {
      const count = 100;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const t = i / count;
        const angle = t * Math.PI * 8;
        const radius = 0.3 + Math.sin(t * Math.PI) * 0.2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = (t - 0.5) * 3;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      setParticlePositions(positions);
    }
  }, [active]);
  
  useFrame((state) => {
    if (helixRef.current && active) {
      helixRef.current.rotation.y += 0.02 + progress * 0.02;
      
      // Scale based on progress
      const scaleProgress = 0.5 + progress * 0.5;
      helixRef.current.scale.setScalar(scaleProgress);
    }
  });

  if (!active) return null;

  const strandCount = 30;
  
  return (
    <group ref={helixRef}>
      {/* DNA Strands */}
      {Array.from({ length: strandCount }).map((_, i) => {
        const t = i / strandCount;
        const y = (t - 0.5) * 2.5;
        const angle = t * Math.PI * 4;
        const radius = 0.25;
        
        // Interpolate colors based on progress
        const color1 = new THREE.Color(parent1Color);
        const color2 = new THREE.Color(parent2Color);
        const mixedColor = color1.clone().lerp(color2, progress);
        
        return (
          <group key={i}>
            {/* Strand 1 */}
            <mesh position={[Math.cos(angle) * radius, y, Math.sin(angle) * radius]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial 
                color={parent1Color} 
                emissive={parent1Color} 
                emissiveIntensity={0.5 + progress * 0.5} 
              />
            </mesh>
            
            {/* Strand 2 */}
            <mesh position={[Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius]}>
              <sphereGeometry args={[0.04, 8, 8]} />
              <meshStandardMaterial 
                color={parent2Color} 
                emissive={parent2Color} 
                emissiveIntensity={0.5 + progress * 0.5} 
              />
            </mesh>
            
            {/* Connection bar */}
            <mesh position={[0, y, 0]} rotation={[0, angle, Math.PI / 2]}>
              <cylinderGeometry args={[0.008, 0.008, radius * 2, 4]} />
              <meshStandardMaterial 
                color={mixedColor} 
                transparent 
                opacity={0.4 + progress * 0.4} 
              />
            </mesh>
            
            {/* Trait markers (every 5th position) */}
            {i % 5 === 0 && (
              <mesh position={[0, y, 0]}>
                <octahedronGeometry args={[0.03]} />
                <meshStandardMaterial 
                  color={mixedColor}
                  emissive={mixedColor}
                  emissiveIntensity={0.8}
                />
              </mesh>
            )}
          </group>
        );
      })}
      
      {/* Central energy core */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.1 + progress * 0.1, 16, 16]} />
        <meshStandardMaterial 
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={progress}
          transparent
          opacity={0.3 + progress * 0.5}
        />
      </mesh>
      
      {/* Particle trail */}
      {particlePositions && (
        <points>
          <bufferGeometry>
            <bufferAttribute 
              attach="attributes-position" 
              count={particlePositions.length / 3} 
              array={particlePositions} 
              itemSize={3} 
            />
          </bufferGeometry>
          <pointsMaterial 
            size={0.02} 
            color="#ffffff" 
            transparent 
            opacity={0.6 * progress} 
          />
        </points>
      )}
    </group>
  );
}

// Offspring Reveal Effect
function OffspringReveal({ 
  active, 
  offspring,
  onComplete
}: { 
  active: boolean; 
  offspring: PlantGenome | null;
  onComplete?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [revealProgress, setRevealProgress] = useState(0);
  
  useEffect(() => {
    if (active && offspring) {
      setRevealProgress(0);
      const interval = setInterval(() => {
        setRevealProgress(prev => {
          if (prev >= 1) {
            clearInterval(interval);
            onComplete?.();
            return 1;
          }
          return prev + 0.02;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [active, offspring, onComplete]);
  
  useFrame((state) => {
    if (groupRef.current && active) {
      // Dramatic reveal rotation
      groupRef.current.rotation.y = revealProgress * Math.PI * 2;
      
      // Scale up from 0
      groupRef.current.scale.setScalar(revealProgress);
    }
  });
  
  if (!active || !offspring) return null;
  
  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Offspring plant */}
      <BreedingPlant3D 
        genome={offspring}
        position={[0, 0, 0]}
        isSelected={true}
        isAnimating={false}
        scale={1.2}
      />
      
      {/* Reveal particles */}
      <Sparkles 
        count={100} 
        scale={2} 
        size={3} 
        speed={1} 
        color={offspring.color} 
      />
      
      {/* Rarity glow */}
      <pointLight 
        position={[0, 0.5, 0]} 
        color={
          offspring.rarity === 'legendary' ? '#fbbf24' :
          offspring.rarity === 'epic' ? '#a855f7' :
          offspring.rarity === 'rare' ? '#3b82f6' : '#22c55e'
        } 
        intensity={3 * revealProgress} 
        distance={3} 
      />
    </group>
  );
}

// Trait Transfer Visualization
function TraitTransferEffect({ 
  active, 
  fromPosition, 
  toPosition, 
  color,
  traitName
}: { 
  active: boolean; 
  fromPosition: [number, number, number];
  toPosition: [number, number, number];
  color: string;
  traitName: string;
}) {
  const particlesRef = useRef<THREE.Points>(null);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (active) {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 1) {
            clearInterval(interval);
            return 1;
          }
          return prev + 0.03;
        });
      }, 30);
      return () => clearInterval(interval);
    }
  }, [active]);
  
  useFrame(() => {
    if (particlesRef.current && active) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        const t = (i / positions.length + progress) % 1;
        positions[i] = fromPosition[0] + (toPosition[0] - fromPosition[0]) * t;
        positions[i + 1] = fromPosition[1] + (toPosition[1] - fromPosition[1]) * t + Math.sin(t * Math.PI) * 0.3;
        positions[i + 2] = fromPosition[2] + (toPosition[2] - fromPosition[2]) * t;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  if (!active) return null;
  
  const particleCount = 30;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = fromPosition[0];
    positions[i * 3 + 1] = fromPosition[1];
    positions[i * 3 + 2] = fromPosition[2];
  }
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={color} transparent opacity={0.8} />
    </points>
  );
}

// Main Breeding Visual Component
interface BreedingVisual3DProps {
  parent1: PlantGenome | null;
  parent2: PlantGenome | null;
  offspring: PlantGenome | null;
  isBreeding: boolean;
  breedingProgress: number;
  onBreedingComplete?: () => void;
}

export function BreedingVisual3D({
  parent1,
  parent2,
  offspring,
  isBreeding,
  breedingProgress,
  onBreedingComplete
}: BreedingVisual3DProps) {
  const [showOffspring, setShowOffspring] = useState(false);
  
  useEffect(() => {
    if (breedingProgress >= 100 && offspring) {
      setShowOffspring(true);
    } else {
      setShowOffspring(false);
    }
  }, [breedingProgress, offspring]);
  
  return (
    <View style={styles.container}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, 5, -5]} intensity={0.5} color="#22c55e" />
        <PerspectiveCamera makeDefault position={[0, 1, 4]} />
        <OrbitControls 
          enableZoom={false} 
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
        
        <Suspense fallback={null}>
          {/* Parent 1 */}
          {parent1 && !showOffspring && (
            <BreedingPlant3D 
              genome={parent1}
              position={[-1.2, 0, 0]}
              isSelected={!isBreeding}
              isAnimating={isBreeding}
              scale={0.8}
            />
          )}
          
          {/* Parent 2 */}
          {parent2 && !showOffspring && (
            <BreedingPlant3D 
              genome={parent2}
              position={[1.2, 0, 0]}
              isSelected={!isBreeding}
              isAnimating={isBreeding}
              scale={0.8}
            />
          )}
          
          {/* DNA Helix during breeding */}
          {parent1 && parent2 && (
            <GeneticDNAHelix 
              active={isBreeding}
              parent1Color={parent1.color}
              parent2Color={parent2.color}
              progress={breedingProgress / 100}
              traits1={parent1.genetics}
              traits2={parent2.genetics}
            />
          )}
          
          {/* Trait transfer effects */}
          {isBreeding && parent1 && parent2 && (
            <>
              <TraitTransferEffect 
                active={breedingProgress > 20}
                fromPosition={[-1.2, 0.3, 0]}
                toPosition={[0, 0, 0]}
                color={parent1.color}
                traitName="THC"
              />
              <TraitTransferEffect 
                active={breedingProgress > 40}
                fromPosition={[1.2, 0.3, 0]}
                toPosition={[0, 0, 0]}
                color={parent2.color}
                traitName="CBD"
              />
            </>
          )}
          
          {/* Offspring reveal */}
          <OffspringReveal 
            active={showOffspring}
            offspring={offspring}
            onComplete={onBreedingComplete}
          />
        </Suspense>
      </Canvas>
    </View>
  );
}

// Genetics Comparison Display
interface GeneticsComparisonProps {
  parent1: PlantGenome | null;
  parent2: PlantGenome | null;
  offspring: PlantGenome | null;
}

export function GeneticsComparison({ parent1, parent2, offspring }: GeneticsComparisonProps) {
  const traits = ['thc', 'cbd', 'yield', 'resistance', 'growth', 'potency'] as const;
  
  return (
    <View style={styles.comparisonContainer}>
      <ThemedText style={styles.comparisonTitle}>Confronto Genetico</ThemedText>
      
      {traits.map((trait) => {
        const p1Value = parent1?.genetics[trait] || 0;
        const p2Value = parent2?.genetics[trait] || 0;
        const offValue = offspring?.genetics[trait] || 0;
        const avgParent = (p1Value + p2Value) / 2;
        const bonus = offValue > avgParent;
        
        return (
          <View key={trait} style={styles.traitRow}>
            <ThemedText style={styles.traitLabel}>{trait.toUpperCase()}</ThemedText>
            <View style={styles.traitBars}>
              {parent1 && (
                <View style={[styles.traitBar, { width: `${p1Value}%`, backgroundColor: parent1.color }]} />
              )}
              {parent2 && (
                <View style={[styles.traitBar, { width: `${p2Value}%`, backgroundColor: parent2.color, marginTop: 2 }]} />
              )}
              {offspring && (
                <View style={[
                  styles.traitBar, 
                  { 
                    width: `${offValue}%`, 
                    backgroundColor: bonus ? '#22c55e' : '#f59e0b',
                    marginTop: 4,
                    height: 8
                  }
                ]} />
              )}
            </View>
            <ThemedText style={[styles.traitValue, bonus && styles.bonusValue]}>
              {offspring ? offValue : '-'}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0a0a0a',
  },
  comparisonContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 12,
    textAlign: 'center',
  },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  traitLabel: {
    width: 80,
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
  },
  traitBars: {
    flex: 1,
    height: 24,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  traitBar: {
    height: 6,
    borderRadius: 3,
  },
  traitValue: {
    width: 35,
    textAlign: 'right',
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  bonusValue: {
    color: '#22c55e',
  },
});

export default BreedingVisual3D;
