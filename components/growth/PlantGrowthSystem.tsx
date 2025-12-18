// @ts-nocheck
/**
 * Plant Growth System with 8 Stages
 * 
 * Vegetative Stages:
 * 1. Seedling - small sprout
 * 2. Young Plant - first true leaves
 * 3. Mid-Vegetative - developing plant
 * 4. Full Vegetative - ready for flowering
 * 
 * Flowering Stages:
 * 5. Pre-Flowering - white pistils starting
 * 6. Early Flowering - white heads visible, calyxes separated
 * 7. Full Flowering - calyxes swollen and connected, dense buds
 * 8. Maturation - chlorophyll degrading, leaves yellow, harvest ready
 */

import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { View, StyleSheet, Pressable, Dimensions } from 'react-native';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Float, Sparkles } from '@react-three/drei/native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Asset } from 'expo-asset';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat, 
  withSequence,
  withSpring,
  Easing,
  interpolate,
  runOnJS
} from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';

const { width } = Dimensions.get('window');

// Growth stage definitions
export const GROWTH_STAGES = [
  {
    id: 1,
    name: 'Seedling',
    nameIt: 'Germoglio',
    description: 'Small sprout emerging from soil',
    descriptionIt: 'Piccolo germoglio che emerge dal terreno',
    daysRequired: 3,
    waterNeeds: 'low',
    nutrientNeeds: 'none',
    lightHours: 18,
    phase: 'vegetative',
    modelFile: 'plant_stage_1_seedling.glb',
  },
  {
    id: 2,
    name: 'Young Plant',
    nameIt: 'Piantina',
    description: 'First true leaves developing',
    descriptionIt: 'Prime foglie vere in sviluppo',
    daysRequired: 7,
    waterNeeds: 'medium',
    nutrientNeeds: 'low',
    lightHours: 18,
    phase: 'vegetative',
    modelFile: 'plant_stage_2_young_plant.glb',
  },
  {
    id: 3,
    name: 'Mid-Vegetative',
    nameIt: 'Vegetativa Media',
    description: 'Plant developing branches and leaves',
    descriptionIt: 'Pianta che sviluppa rami e foglie',
    daysRequired: 14,
    waterNeeds: 'medium',
    nutrientNeeds: 'medium',
    lightHours: 18,
    phase: 'vegetative',
    modelFile: 'plant_stage_3_mid_vegetative.glb',
  },
  {
    id: 4,
    name: 'Full Vegetative',
    nameIt: 'Vegetativa Completa',
    description: 'Mature plant ready for flowering',
    descriptionIt: 'Pianta matura pronta per la fioritura',
    daysRequired: 21,
    waterNeeds: 'high',
    nutrientNeeds: 'high',
    lightHours: 18,
    phase: 'vegetative',
    modelFile: 'plant_stage_4_full_vegetative.glb',
  },
  {
    id: 5,
    name: 'Pre-Flowering',
    nameIt: 'Pre-Fioritura',
    description: 'White pistils starting to appear',
    descriptionIt: 'Pistilli bianchi iniziano ad apparire',
    daysRequired: 28,
    waterNeeds: 'high',
    nutrientNeeds: 'high',
    lightHours: 12,
    phase: 'flowering',
    modelFile: 'plant_stage_5_pre_flowering.glb',
  },
  {
    id: 6,
    name: 'Early Flowering',
    nameIt: 'Fioritura Iniziale',
    description: 'Calyxes forming, pistils visible',
    descriptionIt: 'Calici in formazione, pistilli visibili',
    daysRequired: 42,
    waterNeeds: 'high',
    nutrientNeeds: 'high',
    lightHours: 12,
    phase: 'flowering',
    modelFile: 'plant_stage_6_early_flowering.glb',
  },
  {
    id: 7,
    name: 'Full Flowering',
    nameIt: 'Fioritura Piena',
    description: 'Dense buds, swollen calyxes',
    descriptionIt: 'Cime dense, calici gonfi',
    daysRequired: 56,
    waterNeeds: 'medium',
    nutrientNeeds: 'medium',
    lightHours: 12,
    phase: 'flowering',
    modelFile: 'plant_stage_7_full_flowering.glb',
  },
  {
    id: 8,
    name: 'Maturation',
    nameIt: 'Maturazione',
    description: 'Harvest ready, amber trichomes',
    descriptionIt: 'Pronta per il raccolto, tricomi ambrati',
    daysRequired: 70,
    waterNeeds: 'low',
    nutrientNeeds: 'none',
    lightHours: 12,
    phase: 'flowering',
    modelFile: 'plant_stage_8_maturation.glb',
  },
];

// Model paths mapping
const MODEL_PATHS = {
  1: require('@/assets/models/growth_stages/plant_stage_1_seedling.glb'),
  2: require('@/assets/models/growth_stages/plant_stage_2_young_plant.glb'),
  3: require('@/assets/models/growth_stages/plant_stage_3_mid_vegetative.glb'),
  4: require('@/assets/models/growth_stages/plant_stage_4_full_vegetative.glb'),
  5: require('@/assets/models/growth_stages/plant_stage_5_pre_flowering.glb'),
  6: require('@/assets/models/growth_stages/plant_stage_6_early_flowering.glb'),
  7: require('@/assets/models/growth_stages/plant_stage_7_full_flowering.glb'),
  8: require('@/assets/models/growth_stages/plant_stage_8_maturation.glb'),
};

interface PlantModelProps {
  stage: number;
  scale?: number;
  isAnimating?: boolean;
  transitionProgress?: number;
}

// 3D Plant Model Component with GLB loading
function PlantModel3D({ stage, scale = 1, isAnimating = false, transitionProgress = 0 }: PlantModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load GLB model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsLoading(true);
        const asset = Asset.fromModule(MODEL_PATHS[stage]);
        await asset.downloadAsync();
        
        const loader = new GLTFLoader();
        loader.load(
          asset.localUri || asset.uri,
          (gltf) => {
            setModel(gltf.scene.clone());
            setIsLoading(false);
          },
          undefined,
          (error) => {
            console.error('Error loading plant model:', error);
            setIsLoading(false);
          }
        );
      } catch (error) {
        console.error('Error loading plant model:', error);
        setIsLoading(false);
      }
    };
    
    loadModel();
  }, [stage]);
  
  // Animation frame
  useFrame((state) => {
    if (groupRef.current) {
      // Gentle rotation
      groupRef.current.rotation.y += 0.003;
      
      // Breathing animation
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
      groupRef.current.scale.setScalar(scale * breathe);
      
      // Growth animation when transitioning
      if (isAnimating) {
        const growthPulse = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
        groupRef.current.scale.setScalar(scale * growthPulse);
      }
    }
  });
  
  if (isLoading || !model) {
    // Placeholder while loading
    return (
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#22c55e" wireframe />
        </mesh>
      </group>
    );
  }
  
  return (
    <group ref={groupRef}>
      <primitive object={model} scale={scale} />
    </group>
  );
}

// Fallback procedural plant for when GLB fails to load
function ProceduralPlant({ stage, scale = 1 }: { stage: number; scale?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  const stageConfig = useMemo(() => {
    const configs = {
      1: { height: 0.1, leaves: 2, budSize: 0, color: '#4ade80' },
      2: { height: 0.2, leaves: 4, budSize: 0, color: '#22c55e' },
      3: { height: 0.35, leaves: 8, budSize: 0, color: '#16a34a' },
      4: { height: 0.5, leaves: 12, budSize: 0, color: '#15803d' },
      5: { height: 0.55, leaves: 12, budSize: 0.05, color: '#166534' },
      6: { height: 0.6, leaves: 10, budSize: 0.1, color: '#14532d' },
      7: { height: 0.65, leaves: 8, budSize: 0.15, color: '#134e2a' },
      8: { height: 0.65, leaves: 6, budSize: 0.18, color: '#a16207' },
    };
    return configs[stage] || configs[1];
  }, [stage]);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.003;
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
      groupRef.current.scale.setScalar(scale * breathe);
    }
  });
  
  const { height, leaves, budSize, color } = stageConfig;
  
  return (
    <group ref={groupRef}>
      {/* Pot */}
      <mesh position={[0, -0.3, 0]}>
        <cylinderGeometry args={[0.15, 0.12, 0.2, 16]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Soil */}
      <mesh position={[0, -0.19, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.03, 16]} />
        <meshStandardMaterial color="#3d2914" />
      </mesh>
      
      {/* Stem */}
      <mesh position={[0, height / 2 - 0.15, 0]}>
        <cylinderGeometry args={[0.015 + stage * 0.003, 0.025, height, 8]} />
        <meshStandardMaterial color="#2d5016" />
      </mesh>
      
      {/* Leaves with candelabra structure */}
      {Array.from({ length: leaves }).map((_, i) => {
        const nodeIndex = Math.floor(i / 2);
        const branchSide = i % 2;
        const baseAngle = (nodeIndex % 2) * 90; // Alternate 0° and 90°
        const angle = THREE.MathUtils.degToRad(baseAngle + branchSide * 180);
        const nodeHeight = -0.1 + (nodeIndex / (leaves / 2)) * height * 0.8;
        const leafSize = 0.05 + (1 - nodeIndex / (leaves / 2)) * 0.08;
        
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * 0.08,
              nodeHeight,
              Math.sin(angle) * 0.08,
            ]}
            rotation={[0.4, angle, 0.2]}
          >
            <coneGeometry args={[leafSize, leafSize * 2, 4]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}
      
      {/* Main cola / bud */}
      {budSize > 0 && (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
          <mesh position={[0, height - 0.1, 0]}>
            <sphereGeometry args={[budSize, 16, 16]} />
            <meshStandardMaterial 
              color={stage === 8 ? '#d97706' : '#22c55e'} 
              emissive={stage === 8 ? '#d97706' : '#22c55e'}
              emissiveIntensity={0.3}
            />
          </mesh>
        </Float>
      )}
      
      {/* Side buds for flowering stages */}
      {stage >= 6 && Array.from({ length: 4 }).map((_, i) => {
        const angle = (i / 4) * Math.PI * 2;
        const budHeight = height * 0.5 + (i % 2) * 0.1;
        return (
          <mesh
            key={`bud-${i}`}
            position={[
              Math.cos(angle) * 0.12,
              budHeight,
              Math.sin(angle) * 0.12,
            ]}
          >
            <sphereGeometry args={[budSize * 0.6, 12, 12]} />
            <meshStandardMaterial 
              color={stage === 8 ? '#d97706' : '#22c55e'}
              emissive={stage === 8 ? '#d97706' : '#22c55e'}
              emissiveIntensity={0.2}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// Growth transition effect
function GrowthTransitionEffect({ active }: { active: boolean }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (particlesRef.current && active) {
      particlesRef.current.rotation.y += 0.02;
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.01;
        if (positions[i] > 1) positions[i] = -0.5;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  if (!active) return null;
  
  const particleCount = 100;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1.5;
    positions[i * 3 + 1] = Math.random() * 1.5 - 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
  }
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#fbbf24" transparent opacity={0.8} />
    </points>
  );
}

interface PlantGrowthViewerProps {
  currentStage: number;
  onStageChange?: (stage: number) => void;
  isTimeLapseActive?: boolean;
  timeLapseSpeed?: number;
}

// Main Plant Growth Viewer Component
export function PlantGrowthViewer({ 
  currentStage, 
  onStageChange,
  isTimeLapseActive = false,
  timeLapseSpeed = 1
}: PlantGrowthViewerProps) {
  const [displayStage, setDisplayStage] = useState(currentStage);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [useProceduralFallback, setUseProceduralFallback] = useState(false);
  
  // Handle stage transitions
  useEffect(() => {
    if (currentStage !== displayStage) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayStage(currentStage);
        setIsTransitioning(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [currentStage, displayStage]);
  
  // Time-lapse auto-progression
  useEffect(() => {
    if (isTimeLapseActive && displayStage < 8) {
      const interval = setInterval(() => {
        const nextStage = Math.min(8, displayStage + 1);
        setDisplayStage(nextStage);
        onStageChange?.(nextStage);
      }, 2000 / timeLapseSpeed);
      return () => clearInterval(interval);
    }
  }, [isTimeLapseActive, displayStage, timeLapseSpeed, onStageChange]);
  
  const stageInfo = GROWTH_STAGES[displayStage - 1];
  
  return (
    <View style={styles.container}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, 3, -5]} intensity={0.5} color="#22c55e" />
        <PerspectiveCamera makeDefault position={[0, 0.3, 2]} />
        <OrbitControls 
          enableZoom={true} 
          enablePan={false} 
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 4}
          minDistance={1}
          maxDistance={4}
        />
        
        <Suspense fallback={null}>
          {useProceduralFallback ? (
            <ProceduralPlant stage={displayStage} scale={1.5} />
          ) : (
            <PlantModel3D 
              stage={displayStage} 
              scale={1.5} 
              isAnimating={isTransitioning}
            />
          )}
          <GrowthTransitionEffect active={isTransitioning} />
          
          {/* Sparkles for flowering stages */}
          {displayStage >= 5 && (
            <Sparkles 
              count={50} 
              scale={2} 
              size={2} 
              speed={0.5} 
              color={displayStage === 8 ? '#fbbf24' : '#22c55e'} 
            />
          )}
        </Suspense>
      </Canvas>
      
      {/* Stage indicator */}
      <View style={styles.stageIndicator}>
        <ThemedText style={styles.stageName}>{stageInfo.nameIt}</ThemedText>
        <ThemedText style={styles.stagePhase}>
          {stageInfo.phase === 'vegetative' ? 'Fase Vegetativa' : 'Fase Fioritura'}
        </ThemedText>
      </View>
      
      {/* Transition overlay */}
      {isTransitioning && (
        <View style={styles.transitionOverlay}>
          <ThemedText style={styles.transitionText}>Crescita in corso...</ThemedText>
        </View>
      )}
    </View>
  );
}

// Stage Timeline Component
interface StageTimelineProps {
  currentStage: number;
  onStageSelect?: (stage: number) => void;
}

export function StageTimeline({ currentStage, onStageSelect }: StageTimelineProps) {
  return (
    <View style={styles.timeline}>
      <ThemedText style={styles.timelineTitle}>Stadi di Crescita</ThemedText>
      <View style={styles.timelineContainer}>
        {GROWTH_STAGES.map((stage, index) => {
          const isActive = currentStage >= stage.id;
          const isCurrent = currentStage === stage.id;
          const isVegetative = stage.phase === 'vegetative';
          
          return (
            <Pressable 
              key={stage.id}
              style={[
                styles.timelineItem,
                isActive && styles.timelineItemActive,
                isCurrent && styles.timelineItemCurrent,
              ]}
              onPress={() => onStageSelect?.(stage.id)}
            >
              <View style={[
                styles.timelineDot,
                isActive && styles.timelineDotActive,
                isCurrent && styles.timelineDotCurrent,
                { backgroundColor: isVegetative ? '#22c55e' : '#f59e0b' }
              ]}>
                <ThemedText style={styles.timelineNumber}>{stage.id}</ThemedText>
              </View>
              <ThemedText style={[
                styles.timelineLabel,
                isActive && styles.timelineLabelActive,
              ]}>
                {stage.nameIt}
              </ThemedText>
              {index < GROWTH_STAGES.length - 1 && (
                <View style={[
                  styles.timelineConnector,
                  isActive && styles.timelineConnectorActive,
                ]} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Time-lapse Controls Component
interface TimeLapseControlsProps {
  isActive: boolean;
  speed: number;
  onToggle: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
}

export function TimeLapseControls({ 
  isActive, 
  speed, 
  onToggle, 
  onSpeedChange,
  onReset 
}: TimeLapseControlsProps) {
  const speeds = [0.5, 1, 2, 4];
  
  return (
    <View style={styles.timeLapseContainer}>
      <ThemedText style={styles.timeLapseTitle}>Time-Lapse</ThemedText>
      
      <View style={styles.timeLapseButtons}>
        <Pressable 
          style={[styles.timeLapseButton, isActive && styles.timeLapseButtonActive]}
          onPress={onToggle}
        >
          <ThemedText style={styles.timeLapseButtonText}>
            {isActive ? '⏸ Pausa' : '▶ Avvia'}
          </ThemedText>
        </Pressable>
        
        <Pressable style={styles.timeLapseButton} onPress={onReset}>
          <ThemedText style={styles.timeLapseButtonText}>↺ Reset</ThemedText>
        </Pressable>
      </View>
      
      <View style={styles.speedControls}>
        <ThemedText style={styles.speedLabel}>Velocità:</ThemedText>
        {speeds.map((s) => (
          <Pressable
            key={s}
            style={[
              styles.speedButton,
              speed === s && styles.speedButtonActive,
            ]}
            onPress={() => onSpeedChange(s)}
          >
            <ThemedText style={[
              styles.speedButtonText,
              speed === s && styles.speedButtonTextActive,
            ]}>
              {s}x
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 300,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    overflow: 'hidden',
  },
  stageIndicator: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 12,
  },
  stageName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stagePhase: {
    color: '#a7f3d0',
    fontSize: 12,
  },
  transitionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transitionText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  timeline: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 16,
    textAlign: 'center',
  },
  timelineContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  timelineItem: {
    alignItems: 'center',
    width: (width - 80) / 4,
    marginBottom: 12,
  },
  timelineItemActive: {},
  timelineItemCurrent: {},
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineDotActive: {
    opacity: 1,
  },
  timelineDotCurrent: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  timelineNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timelineLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
  },
  timelineLabelActive: {
    color: '#166534',
    fontWeight: '600',
  },
  timelineConnector: {
    position: 'absolute',
    right: -4,
    top: 18,
    width: 8,
    height: 2,
    backgroundColor: '#e5e7eb',
  },
  timelineConnectorActive: {
    backgroundColor: '#22c55e',
  },
  timeLapseContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  timeLapseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  timeLapseButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  timeLapseButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  timeLapseButtonActive: {
    backgroundColor: '#22c55e',
  },
  timeLapseButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  speedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  speedLabel: {
    color: '#a7f3d0',
    fontSize: 14,
    marginRight: 8,
  },
  speedButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  speedButtonActive: {
    backgroundColor: '#f59e0b',
  },
  speedButtonText: {
    color: '#fff',
    fontSize: 12,
  },
  speedButtonTextActive: {
    fontWeight: 'bold',
  },
});

export default PlantGrowthViewer;
