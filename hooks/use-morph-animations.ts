/**
 * Morph Target Animations Hook
 * 
 * Provides smooth morph target animations for plant models:
 * - Leaf opening/closing
 * - Bud blooming
 * - Pistil growth
 * 
 * Works with GLB models that have shape keys exported from Blender
 */

import { useRef, useEffect, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Morph target names matching Blender shape keys
export const MORPH_TARGETS = {
  leaf: {
    BASIS: 'Basis',
    OPEN: 'Open',
    WILTED: 'Wilted',
    GROWING: 'Growing',
  },
  bud: {
    BASIS: 'Basis',
    BLOOMING: 'Blooming',
    FULL_BLOOM: 'FullBloom',
    MATURE: 'Mature',
  },
  pistil: {
    BASIS: 'Basis',
    GROWING: 'Growing',
    MATURE: 'Mature',
  },
};

// Animation presets for different growth stages
export const STAGE_MORPH_PRESETS = {
  1: { // Seedling
    leafOpen: 0.2,
    leafWilted: 0,
    budBloom: 0,
    pistilGrowth: 0,
  },
  2: { // Young Plant
    leafOpen: 0.4,
    leafWilted: 0,
    budBloom: 0,
    pistilGrowth: 0,
  },
  3: { // Mid-Vegetative
    leafOpen: 0.7,
    leafWilted: 0,
    budBloom: 0,
    pistilGrowth: 0,
  },
  4: { // Full Vegetative
    leafOpen: 1.0,
    leafWilted: 0,
    budBloom: 0,
    pistilGrowth: 0,
  },
  5: { // Pre-Flowering
    leafOpen: 0.9,
    leafWilted: 0,
    budBloom: 0.2,
    pistilGrowth: 0.3,
  },
  6: { // Early Flowering
    leafOpen: 0.85,
    leafWilted: 0,
    budBloom: 0.5,
    pistilGrowth: 0.6,
  },
  7: { // Full Flowering
    leafOpen: 0.8,
    leafWilted: 0.1,
    budBloom: 0.9,
    pistilGrowth: 0.9,
  },
  8: { // Maturation
    leafOpen: 0.6,
    leafWilted: 0.4,
    budBloom: 1.0,
    pistilGrowth: 1.0,
  },
};

interface MorphAnimationState {
  leafOpen: number;
  leafWilted: number;
  leafGrowing: number;
  budBlooming: number;
  budFullBloom: number;
  budMature: number;
  pistilGrowing: number;
  pistilMature: number;
}

interface UseMorphAnimationsOptions {
  autoAnimate?: boolean;
  animationSpeed?: number;
  breathingEnabled?: boolean;
  breathingIntensity?: number;
}

/**
 * Hook to manage morph target animations for plant models
 */
export function useMorphAnimations(
  meshRef: React.RefObject<THREE.Mesh | THREE.Group>,
  currentStage: number,
  options: UseMorphAnimationsOptions = {}
) {
  const {
    autoAnimate = true,
    animationSpeed = 1,
    breathingEnabled = true,
    breathingIntensity = 0.05,
  } = options;

  const morphState = useRef<MorphAnimationState>({
    leafOpen: 0,
    leafWilted: 0,
    leafGrowing: 0,
    budBlooming: 0,
    budFullBloom: 0,
    budMature: 0,
    pistilGrowing: 0,
    pistilMature: 0,
  });

  const targetState = useRef<MorphAnimationState>({
    leafOpen: 0,
    leafWilted: 0,
    leafGrowing: 0,
    budBlooming: 0,
    budFullBloom: 0,
    budMature: 0,
    pistilGrowing: 0,
    pistilMature: 0,
  });

  // Update target state based on growth stage
  useEffect(() => {
    const preset = STAGE_MORPH_PRESETS[currentStage as keyof typeof STAGE_MORPH_PRESETS];
    if (preset) {
      targetState.current = {
        leafOpen: preset.leafOpen,
        leafWilted: preset.leafWilted,
        leafGrowing: 0,
        budBlooming: preset.budBloom < 0.5 ? preset.budBloom * 2 : 1,
        budFullBloom: preset.budBloom >= 0.5 ? (preset.budBloom - 0.5) * 2 : 0,
        budMature: currentStage === 8 ? 1 : 0,
        pistilGrowing: preset.pistilGrowth < 0.5 ? preset.pistilGrowth * 2 : 1,
        pistilMature: preset.pistilGrowth >= 0.5 ? (preset.pistilGrowth - 0.5) * 2 : 0,
      };
    }
  }, [currentStage]);

  // Find morph target index by name
  const findMorphIndex = useCallback((mesh: THREE.Mesh, targetName: string): number => {
    if (!mesh.morphTargetDictionary) return -1;
    return mesh.morphTargetDictionary[targetName] ?? -1;
  }, []);

  // Set morph target influence
  const setMorphInfluence = useCallback((mesh: THREE.Mesh, targetName: string, value: number) => {
    const index = findMorphIndex(mesh, targetName);
    if (index >= 0 && mesh.morphTargetInfluences) {
      mesh.morphTargetInfluences[index] = Math.max(0, Math.min(1, value));
    }
  }, [findMorphIndex]);

  // Apply morph state to all meshes in the group
  const applyMorphState = useCallback((state: MorphAnimationState) => {
    if (!meshRef.current) return;

    const applyToMesh = (mesh: THREE.Mesh) => {
      if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) return;

      const name = mesh.name.toLowerCase();

      // Apply leaf morphs
      if (name.includes('leaf')) {
        setMorphInfluence(mesh, 'Open', state.leafOpen);
        setMorphInfluence(mesh, 'Wilted', state.leafWilted);
        setMorphInfluence(mesh, 'Growing', state.leafGrowing);
      }

      // Apply bud morphs
      if (name.includes('bud') || name.includes('cola')) {
        setMorphInfluence(mesh, 'Blooming', state.budBlooming);
        setMorphInfluence(mesh, 'FullBloom', state.budFullBloom);
        setMorphInfluence(mesh, 'Mature', state.budMature);
      }

      // Apply pistil morphs
      if (name.includes('pistil')) {
        setMorphInfluence(mesh, 'Growing', state.pistilGrowing);
        setMorphInfluence(mesh, 'Mature', state.pistilMature);
      }
    };

    // Traverse all meshes
    if (meshRef.current instanceof THREE.Mesh) {
      applyToMesh(meshRef.current);
    } else {
      meshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          applyToMesh(child);
        }
      });
    }
  }, [meshRef, setMorphInfluence]);

  // Animation frame
  useFrame((state) => {
    if (!autoAnimate) return;

    const delta = state.clock.getDelta() * animationSpeed;
    const lerpFactor = Math.min(1, delta * 2);

    // Smoothly interpolate current state towards target
    const current = morphState.current;
    const target = targetState.current;

    current.leafOpen += (target.leafOpen - current.leafOpen) * lerpFactor;
    current.leafWilted += (target.leafWilted - current.leafWilted) * lerpFactor;
    current.budBlooming += (target.budBlooming - current.budBlooming) * lerpFactor;
    current.budFullBloom += (target.budFullBloom - current.budFullBloom) * lerpFactor;
    current.budMature += (target.budMature - current.budMature) * lerpFactor;
    current.pistilGrowing += (target.pistilGrowing - current.pistilGrowing) * lerpFactor;
    current.pistilMature += (target.pistilMature - current.pistilMature) * lerpFactor;

    // Add breathing animation
    if (breathingEnabled) {
      const breathe = Math.sin(state.clock.elapsedTime * 2) * breathingIntensity;
      current.leafGrowing = 0.5 + breathe;
    }

    // Apply the state
    applyMorphState(current);
  });

  // Manual control functions
  const setLeafOpen = useCallback((value: number) => {
    targetState.current.leafOpen = value;
  }, []);

  const setLeafWilted = useCallback((value: number) => {
    targetState.current.leafWilted = value;
  }, []);

  const setBudBloom = useCallback((value: number) => {
    if (value < 0.5) {
      targetState.current.budBlooming = value * 2;
      targetState.current.budFullBloom = 0;
    } else {
      targetState.current.budBlooming = 1;
      targetState.current.budFullBloom = (value - 0.5) * 2;
    }
  }, []);

  const setPistilGrowth = useCallback((value: number) => {
    if (value < 0.5) {
      targetState.current.pistilGrowing = value * 2;
      targetState.current.pistilMature = 0;
    } else {
      targetState.current.pistilGrowing = 1;
      targetState.current.pistilMature = (value - 0.5) * 2;
    }
  }, []);

  const setMature = useCallback((value: number) => {
    targetState.current.budMature = value;
    targetState.current.leafWilted = value * 0.4;
  }, []);

  // Animate to a specific stage
  const animateToStage = useCallback((stage: number, duration: number = 1000) => {
    const preset = STAGE_MORPH_PRESETS[stage as keyof typeof STAGE_MORPH_PRESETS];
    if (preset) {
      targetState.current = {
        leafOpen: preset.leafOpen,
        leafWilted: preset.leafWilted,
        leafGrowing: 0,
        budBlooming: preset.budBloom < 0.5 ? preset.budBloom * 2 : 1,
        budFullBloom: preset.budBloom >= 0.5 ? (preset.budBloom - 0.5) * 2 : 0,
        budMature: stage === 8 ? 1 : 0,
        pistilGrowing: preset.pistilGrowth < 0.5 ? preset.pistilGrowth * 2 : 1,
        pistilMature: preset.pistilGrowth >= 0.5 ? (preset.pistilGrowth - 0.5) * 2 : 0,
      };
    }
  }, []);

  // Reset all morphs to basis
  const resetMorphs = useCallback(() => {
    targetState.current = {
      leafOpen: 0,
      leafWilted: 0,
      leafGrowing: 0,
      budBlooming: 0,
      budFullBloom: 0,
      budMature: 0,
      pistilGrowing: 0,
      pistilMature: 0,
    };
  }, []);

  return {
    // Current state
    morphState: morphState.current,
    
    // Manual controls
    setLeafOpen,
    setLeafWilted,
    setBudBloom,
    setPistilGrowth,
    setMature,
    
    // Animation controls
    animateToStage,
    resetMorphs,
    applyMorphState,
    
    // Utilities
    findMorphIndex,
    setMorphInfluence,
  };
}

/**
 * Hook for leaf-specific animations
 */
export function useLeafAnimation(
  meshRef: React.RefObject<THREE.Mesh>,
  options: {
    windEnabled?: boolean;
    windIntensity?: number;
    openAmount?: number;
  } = {}
) {
  const { windEnabled = true, windIntensity = 0.1, openAmount = 1 } = options;

  useFrame((state) => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;
    
    // Wind sway animation
    if (windEnabled) {
      const wind = Math.sin(state.clock.elapsedTime * 2) * windIntensity;
      mesh.rotation.z = wind;
      mesh.rotation.x = Math.sin(state.clock.elapsedTime * 1.5) * windIntensity * 0.5;
    }

    // Apply open morph if available
    if (mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
      const openIndex = mesh.morphTargetDictionary['Open'];
      if (openIndex !== undefined) {
        mesh.morphTargetInfluences[openIndex] = openAmount;
      }
    }
  });
}

/**
 * Hook for bud blooming animation
 */
export function useBudBloomAnimation(
  meshRef: React.RefObject<THREE.Mesh>,
  bloomProgress: number,
  options: {
    pulseEnabled?: boolean;
    pulseIntensity?: number;
  } = {}
) {
  const { pulseEnabled = true, pulseIntensity = 0.05 } = options;

  useFrame((state) => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;

    // Pulse animation for buds
    if (pulseEnabled) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 3) * pulseIntensity;
      mesh.scale.setScalar(pulse);
    }

    // Apply bloom morphs
    if (mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
      const bloomingIndex = mesh.morphTargetDictionary['Blooming'];
      const fullBloomIndex = mesh.morphTargetDictionary['FullBloom'];

      if (bloomingIndex !== undefined) {
        mesh.morphTargetInfluences[bloomingIndex] = Math.min(1, bloomProgress * 2);
      }
      if (fullBloomIndex !== undefined) {
        mesh.morphTargetInfluences[fullBloomIndex] = Math.max(0, (bloomProgress - 0.5) * 2);
      }
    }
  });
}

/**
 * Hook for pistil growth animation
 */
export function usePistilAnimation(
  meshRef: React.RefObject<THREE.Mesh>,
  growthProgress: number,
  options: {
    colorTransition?: boolean;
  } = {}
) {
  const { colorTransition = true } = options;

  useFrame(() => {
    if (!meshRef.current) return;

    const mesh = meshRef.current;

    // Apply growth morphs
    if (mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
      const growingIndex = mesh.morphTargetDictionary['Growing'];
      const matureIndex = mesh.morphTargetDictionary['Mature'];

      if (growingIndex !== undefined) {
        mesh.morphTargetInfluences[growingIndex] = Math.min(1, growthProgress * 2);
      }
      if (matureIndex !== undefined) {
        mesh.morphTargetInfluences[matureIndex] = Math.max(0, (growthProgress - 0.5) * 2);
      }
    }

    // Color transition from white to orange
    if (colorTransition && mesh.material instanceof THREE.MeshStandardMaterial) {
      const whiteColor = new THREE.Color(0.95, 0.9, 0.85);
      const orangeColor = new THREE.Color(0.9, 0.5, 0.2);
      mesh.material.color.lerpColors(whiteColor, orangeColor, growthProgress);
    }
  });
}

export default useMorphAnimations;
