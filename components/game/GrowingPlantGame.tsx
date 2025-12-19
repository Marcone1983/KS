// @ts-nocheck
/**
 * Growing Plant Component for Game Screen
 * 
 * Displays plant with growth stages during gameplay:
 * - Visual progression based on game progress
 * - Morph target animations for leaves and buds
 * - Stage transition effects
 * - Health-based visual changes
 */

import React, { useRef, useMemo, useEffect, useState, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Sparkles, useGLTF } from '@react-three/drei/native';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { GROWTH_STAGES } from '@/components/growth/PlantGrowthSystem';

// Growth stage model paths
const STAGE_MODELS = {
  1: require('@/assets/models/growth_stages/plant_stage_1_seedling.glb'),
  2: require('@/assets/models/growth_stages/plant_stage_2_young_plant.glb'),
  3: require('@/assets/models/growth_stages/plant_stage_3_mid_vegetative.glb'),
  4: require('@/assets/models/growth_stages/plant_stage_4_full_vegetative.glb'),
  5: require('@/assets/models/growth_stages/plant_stage_5_pre_flowering.glb'),
  6: require('@/assets/models/growth_stages/plant_stage_6_early_flowering.glb'),
  7: require('@/assets/models/growth_stages/plant_stage_7_full_flowering.glb'),
  8: require('@/assets/models/growth_stages/plant_stage_8_maturation.glb'),
};

interface GrowingPlantGameProps {
  position: [number, number, number];
  stage: number;
  health: number;
  scale?: number;
  isSelected?: boolean;
  onStageUp?: () => void;
  showStageIndicator?: boolean;
  genetics?: {
    thc: number;
    cbd: number;
    yield: number;
  };
}

// Procedural plant fallback when GLB fails to load
function ProceduralPlantGame({ 
  stage, 
  health, 
  scale = 1 
}: { 
  stage: number; 
  health: number; 
  scale: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  const stageConfig = useMemo(() => {
    const configs = {
      1: { height: 0.15, leaves: 2, budSize: 0, color: '#4ade80' },
      2: { height: 0.25, leaves: 4, budSize: 0, color: '#22c55e' },
      3: { height: 0.4, leaves: 8, budSize: 0, color: '#16a34a' },
      4: { height: 0.55, leaves: 12, budSize: 0, color: '#15803d' },
      5: { height: 0.6, leaves: 12, budSize: 0.06, color: '#166534' },
      6: { height: 0.7, leaves: 10, budSize: 0.1, color: '#14532d' },
      7: { height: 0.8, leaves: 8, budSize: 0.15, color: '#134e2a' },
      8: { height: 0.8, leaves: 6, budSize: 0.18, color: '#a16207' },
    };
    return configs[stage] || configs[1];
  }, [stage]);
  
  // Health affects color
  const healthColor = useMemo(() => {
    const baseColor = new THREE.Color(stageConfig.color);
    if (health < 50) {
      baseColor.lerp(new THREE.Color('#8B4513'), 1 - health / 50);
    }
    return baseColor;
  }, [health, stageConfig.color]);
  
  useFrame((state) => {
    if (groupRef.current) {
      // Breathing animation
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.02;
      groupRef.current.scale.setScalar(scale * breathe);
      
      // Gentle sway
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.03;
    }
  });
  
  const { height, leaves, budSize } = stageConfig;
  
  return (
    <group ref={groupRef}>
      {/* Pot */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.12, 0.1, 0.18, 16]} />
        <meshStandardMaterial color="#8B4513" roughness={0.8} />
      </mesh>
      
      {/* Soil */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.03, 16]} />
        <meshStandardMaterial color="#3d2914" roughness={0.9} />
      </mesh>
      
      {/* Stem */}
      <mesh position={[0, height / 2 - 0.1, 0]}>
        <cylinderGeometry args={[0.012 + stage * 0.002, 0.02, height, 8]} />
        <meshStandardMaterial color="#2d5016" roughness={0.7} />
      </mesh>
      
      {/* Leaves with candelabra structure */}
      {Array.from({ length: leaves }).map((_, i) => {
        const nodeIndex = Math.floor(i / 2);
        const branchSide = i % 2;
        const baseAngle = (nodeIndex % 2) * 90;
        const angle = THREE.MathUtils.degToRad(baseAngle + branchSide * 180);
        const nodeHeight = -0.05 + (nodeIndex / (leaves / 2)) * height * 0.8;
        const leafSize = 0.04 + (1 - nodeIndex / (leaves / 2)) * 0.06;
        
        return (
          <mesh
            key={i}
            position={[
              Math.cos(angle) * 0.06,
              nodeHeight,
              Math.sin(angle) * 0.06,
            ]}
            rotation={[0.4, angle, 0.2]}
          >
            <coneGeometry args={[leafSize, leafSize * 2, 4]} />
            <meshStandardMaterial color={healthColor} roughness={0.6} />
          </mesh>
        );
      })}
      
      {/* Main cola / bud */}
      {budSize > 0 && (
        <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
          <mesh position={[0, height - 0.05, 0]}>
            <sphereGeometry args={[budSize, 16, 16]} />
            <meshStandardMaterial 
              color={stage === 8 ? '#d97706' : '#22c55e'} 
              emissive={stage === 8 ? '#d97706' : '#22c55e'}
              emissiveIntensity={0.2}
              roughness={0.7}
            />
          </mesh>
        </Float>
      )}
      
      {/* Side buds for flowering stages */}
      {stage >= 6 && Array.from({ length: 4 }).map((_, i) => {
        const angle = (i / 4) * Math.PI * 2;
        const budHeight = height * 0.5 + (i % 2) * 0.08;
        return (
          <mesh
            key={`bud-${i}`}
            position={[
              Math.cos(angle) * 0.1,
              budHeight,
              Math.sin(angle) * 0.1,
            ]}
          >
            <sphereGeometry args={[budSize * 0.5, 12, 12]} />
            <meshStandardMaterial 
              color={stage === 8 ? '#d97706' : '#22c55e'}
              emissive={stage === 8 ? '#d97706' : '#22c55e'}
              emissiveIntensity={0.15}
              roughness={0.7}
            />
          </mesh>
        );
      })}
      
      {/* Health indicator ring */}
      <mesh position={[0, -0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.14, 0.16, 32]} />
        <meshStandardMaterial 
          color={health > 70 ? '#22c55e' : health > 30 ? '#f59e0b' : '#ef4444'} 
          emissive={health > 70 ? '#22c55e' : health > 30 ? '#f59e0b' : '#ef4444'}
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}

// Stage transition effect
function StageTransitionEffect({ active, stage }: { active: boolean; stage: number }) {
  const particlesRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (particlesRef.current && active) {
      particlesRef.current.rotation.y += 0.03;
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] += 0.02;
        if (positions[i] > 1.5) positions[i] = -0.3;
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });
  
  if (!active) return null;
  
  const particleCount = 80;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 1;
    positions[i * 3 + 1] = Math.random() * 1.5 - 0.3;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 1;
  }
  
  const color = stage >= 5 ? '#fbbf24' : '#22c55e';
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color={color} transparent opacity={0.7} />
    </points>
  );
}

// Main Growing Plant Game Component
export function GrowingPlantGame({
  position,
  stage,
  health,
  scale = 1,
  isSelected = false,
  onStageUp,
  showStageIndicator = true,
  genetics,
}: GrowingPlantGameProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayStage, setDisplayStage] = useState(stage);
  const [useGLB, setUseGLB] = useState(true);
  
  // Handle stage transitions
  useEffect(() => {
    if (stage !== displayStage) {
      setIsTransitioning(true);
      const timer = setTimeout(() => {
        setDisplayStage(stage);
        setIsTransitioning(false);
        onStageUp?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [stage, displayStage, onStageUp]);
  
  // Selection animation
  useFrame((state) => {
    if (groupRef.current) {
      if (isSelected) {
        groupRef.current.rotation.y += 0.01;
      }
      
      // Pulse when transitioning
      if (isTransitioning) {
        const pulse = 1 + Math.sin(state.clock.elapsedTime * 8) * 0.1;
        groupRef.current.scale.setScalar(scale * pulse);
      }
    }
  });
  
  const stageInfo = GROWTH_STAGES[displayStage - 1];
  
  return (
    <group ref={groupRef} position={position}>
      {/* Plant model */}
      <Suspense fallback={
        <ProceduralPlantGame stage={displayStage} health={health} scale={scale} />
      }>
        {useGLB ? (
          <GrowingPlantGLB 
            stage={displayStage} 
            health={health} 
            scale={scale}
            onError={() => setUseGLB(false)}
          />
        ) : (
          <ProceduralPlantGame stage={displayStage} health={health} scale={scale} />
        )}
      </Suspense>
      
      {/* Stage transition effect */}
      <StageTransitionEffect active={isTransitioning} stage={displayStage} />
      
      {/* Sparkles for flowering stages */}
      {displayStage >= 5 && (
        <Sparkles 
          count={30} 
          scale={1.5} 
          size={1.5} 
          speed={0.3} 
          color={displayStage === 8 ? '#fbbf24' : '#22c55e'} 
        />
      )}
      
      {/* Selection glow */}
      {isSelected && (
        <pointLight 
          position={[0, 0.5, 0]} 
          color="#22c55e" 
          intensity={1} 
          distance={2} 
        />
      )}
    </group>
  );
}

// GLB model loader component
function GrowingPlantGLB({ 
  stage, 
  health, 
  scale,
  onError 
}: { 
  stage: number; 
  health: number; 
  scale: number;
  onError?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  
  try {
    const modelPath = STAGE_MODELS[stage as keyof typeof STAGE_MODELS];
    if (!modelPath) {
      onError?.();
      return null;
    }
    
    const { scene } = useGLTF(modelPath);
    
    // Health affects material
    useEffect(() => {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (health < 50) {
            mat.color.lerp(new THREE.Color('#8B4513'), 1 - health / 50);
          }
        }
      });
    }, [health, scene]);
    
    useFrame((state) => {
      if (groupRef.current) {
        const breathe = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.015;
        groupRef.current.scale.setScalar(scale * breathe);
      }
    });
    
    return (
      <group ref={groupRef}>
        <primitive object={scene.clone()} scale={scale} />
      </group>
    );
  } catch (error) {
    console.error('Error loading plant GLB:', error);
    onError?.();
    return null;
  }
}

// Stage indicator HUD component (for use in game UI)
export function StageIndicatorHUD({ 
  stage, 
  maxStage = 8,
  genetics 
}: { 
  stage: number; 
  maxStage?: number;
  genetics?: { thc: number; cbd: number; yield: number };
}) {
  const stageInfo = GROWTH_STAGES[stage - 1];
  const progress = (stage / maxStage) * 100;
  
  return {
    stageName: stageInfo?.nameIt || 'Sconosciuto',
    stageNumber: stage,
    maxStage,
    progress,
    phase: stageInfo?.phase || 'vegetative',
    isFlowering: stage >= 5,
    isMature: stage === 8,
    genetics,
  };
}

export default GrowingPlantGame;
