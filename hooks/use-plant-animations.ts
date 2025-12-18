/**
 * Plant Growth Animations Hook
 * 
 * Provides elaborate animations for plant growth visualization:
 * - Leaf opening animations
 * - Bud blooming animations
 * - Pistil appearance animations
 * - Growth pulse effects
 * - Stage transition effects
 */

import { useRef, useCallback, useMemo } from 'react';
import { useSharedValue, withTiming, withSpring, withSequence, withRepeat, withDelay, Easing, runOnJS } from 'react-native-reanimated';
import * as THREE from 'three';

// Animation configurations for each growth stage
export const STAGE_ANIMATIONS = {
  1: { // Seedling
    leafOpenAngle: 0.2,
    stemGrowthSpeed: 0.5,
    breathingIntensity: 0.02,
    rotationSpeed: 0.003,
  },
  2: { // Young Plant
    leafOpenAngle: 0.4,
    stemGrowthSpeed: 0.8,
    breathingIntensity: 0.025,
    rotationSpeed: 0.003,
  },
  3: { // Mid-Vegetative
    leafOpenAngle: 0.6,
    stemGrowthSpeed: 1.0,
    breathingIntensity: 0.03,
    rotationSpeed: 0.003,
  },
  4: { // Full Vegetative
    leafOpenAngle: 0.8,
    stemGrowthSpeed: 1.2,
    breathingIntensity: 0.035,
    rotationSpeed: 0.003,
  },
  5: { // Pre-Flowering
    leafOpenAngle: 0.85,
    stemGrowthSpeed: 0.8,
    breathingIntensity: 0.03,
    rotationSpeed: 0.002,
    pistilGrowthRate: 0.5,
  },
  6: { // Early Flowering
    leafOpenAngle: 0.9,
    stemGrowthSpeed: 0.5,
    breathingIntensity: 0.025,
    rotationSpeed: 0.002,
    pistilGrowthRate: 0.8,
    budSwellRate: 0.3,
  },
  7: { // Full Flowering
    leafOpenAngle: 0.85,
    stemGrowthSpeed: 0.3,
    breathingIntensity: 0.02,
    rotationSpeed: 0.002,
    pistilGrowthRate: 1.0,
    budSwellRate: 0.7,
  },
  8: { // Maturation
    leafOpenAngle: 0.7,
    stemGrowthSpeed: 0.1,
    breathingIntensity: 0.015,
    rotationSpeed: 0.001,
    pistilGrowthRate: 1.0,
    budSwellRate: 1.0,
    yellowing: 0.6,
  },
};

// Easing functions for organic movement
export const organicEasing = {
  breathe: (t: number) => Math.sin(t * Math.PI * 2) * 0.5 + 0.5,
  sway: (t: number) => Math.sin(t * Math.PI) * Math.cos(t * Math.PI * 0.5),
  pulse: (t: number) => 1 + Math.sin(t * Math.PI * 4) * 0.1,
  grow: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

interface PlantAnimationState {
  scale: number;
  rotation: number;
  leafAngles: number[];
  budScale: number;
  pistilLength: number;
  colorShift: number;
}

export function usePlantAnimations(currentStage: number) {
  const animationState = useRef<PlantAnimationState>({
    scale: 1,
    rotation: 0,
    leafAngles: [],
    budScale: 0,
    pistilLength: 0,
    colorShift: 0,
  });
  
  const stageConfig = useMemo(() => STAGE_ANIMATIONS[currentStage as keyof typeof STAGE_ANIMATIONS] || STAGE_ANIMATIONS[1], [currentStage]);
  
  // Reanimated shared values for smooth animations
  const scaleValue = useSharedValue(1);
  const rotationValue = useSharedValue(0);
  const transitionProgress = useSharedValue(0);
  const pulseValue = useSharedValue(1);
  
  // Start breathing animation
  const startBreathingAnimation = useCallback(() => {
    pulseValue.value = withRepeat(
      withSequence(
        withTiming(1 + stageConfig.breathingIntensity, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(1 - stageConfig.breathingIntensity * 0.5, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      true
    );
  }, [stageConfig.breathingIntensity, pulseValue]);
  
  // Stage transition animation
  const animateStageTransition = useCallback((fromStage: number, toStage: number, onComplete?: () => void) => {
    // Growth pulse
    scaleValue.value = withSequence(
      withTiming(1.2, { duration: 300, easing: Easing.out(Easing.cubic) }),
      withTiming(0.9, { duration: 200 }),
      withSpring(1, { damping: 10, stiffness: 100 })
    );
    
    // Transition progress
    transitionProgress.value = withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.cubic) }, () => {
      transitionProgress.value = 0;
      if (onComplete) {
        runOnJS(onComplete)();
      }
    });
  }, [scaleValue, transitionProgress]);
  
  // Leaf opening animation
  const animateLeafOpening = useCallback((leafIndex: number, targetAngle: number) => {
    const duration = 1000 + Math.random() * 500;
    return withDelay(
      leafIndex * 100,
      withSpring(targetAngle, { damping: 12, stiffness: 80 })
    );
  }, []);
  
  // Bud blooming animation
  const animateBudBlooming = useCallback((budIndex: number) => {
    const baseDelay = budIndex * 200;
    return {
      scale: withDelay(baseDelay, withSpring(1, { damping: 8, stiffness: 60 })),
      rotation: withDelay(baseDelay, withRepeat(
        withTiming(Math.PI * 2, { duration: 10000, easing: Easing.linear }),
        -1,
        false
      )),
    };
  }, []);
  
  // Pistil growth animation
  const animatePistilGrowth = useCallback((pistilIndex: number, maxLength: number) => {
    const delay = pistilIndex * 50;
    return withDelay(
      delay,
      withTiming(maxLength, { duration: 2000, easing: Easing.out(Easing.cubic) })
    );
  }, []);
  
  // Time-lapse animation (accelerated growth)
  const startTimeLapse = useCallback((speed: number = 1) => {
    const baseDuration = 2000 / speed;
    
    // Continuous growth pulse
    scaleValue.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: baseDuration * 0.3 }),
        withTiming(1.05, { duration: baseDuration * 0.2 }),
        withTiming(1.15, { duration: baseDuration * 0.3 }),
        withTiming(1, { duration: baseDuration * 0.2 })
      ),
      -1,
      false
    );
    
    // Rotation during time-lapse
    rotationValue.value = withRepeat(
      withTiming(Math.PI * 2, { duration: baseDuration * 2, easing: Easing.linear }),
      -1,
      false
    );
  }, [scaleValue, rotationValue]);
  
  // Stop time-lapse
  const stopTimeLapse = useCallback(() => {
    scaleValue.value = withSpring(1);
    // Keep current rotation
  }, [scaleValue]);
  
  // Get animation values for Three.js
  const getAnimationValues = useCallback((elapsedTime: number): PlantAnimationState => {
    const config = stageConfig;
    
    // Calculate breathing
    const breathe = 1 + Math.sin(elapsedTime * 1.5) * config.breathingIntensity;
    
    // Calculate sway
    const sway = Math.sin(elapsedTime * 0.5) * 0.05;
    
    // Calculate leaf angles
    const leafCount = Math.min(12, currentStage * 2);
    const leafAngles = Array.from({ length: leafCount }, (_, i) => {
      const baseAngle = config.leafOpenAngle;
      const variation = Math.sin(elapsedTime * 2 + i * 0.5) * 0.1;
      return baseAngle + variation;
    });
    
    // Calculate bud scale (only for flowering stages)
    let budScale = 0;
    if (currentStage >= 5) {
      const budSwellRate = (config as any).budSwellRate || 0;
      budScale = budSwellRate * (1 + Math.sin(elapsedTime * 3) * 0.05);
    }
    
    // Calculate pistil length
    let pistilLength = 0;
    if (currentStage >= 5) {
      const pistilGrowthRate = (config as any).pistilGrowthRate || 0;
      pistilLength = pistilGrowthRate * 0.02;
    }
    
    // Calculate color shift (yellowing for maturation)
    let colorShift = 0;
    if (currentStage === 8) {
      colorShift = (config as any).yellowing || 0;
    }
    
    return {
      scale: breathe,
      rotation: elapsedTime * config.rotationSpeed + sway,
      leafAngles,
      budScale,
      pistilLength,
      colorShift,
    };
  }, [currentStage, stageConfig]);
  
  // Wind effect animation
  const applyWindEffect = useCallback((mesh: THREE.Object3D, elapsedTime: number, intensity: number = 1) => {
    const windX = Math.sin(elapsedTime * 2) * 0.02 * intensity;
    const windZ = Math.cos(elapsedTime * 1.5) * 0.015 * intensity;
    
    mesh.rotation.x = windX;
    mesh.rotation.z = windZ;
  }, []);
  
  // Particle burst effect for stage transitions
  const createParticleBurst = useCallback((position: THREE.Vector3, color: string = '#22c55e') => {
    const particles: { position: THREE.Vector3; velocity: THREE.Vector3; life: number }[] = [];
    
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.02 + Math.random() * 0.03;
      
      particles.push({
        position: position.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          0.02 + Math.random() * 0.02,
          Math.sin(angle) * speed
        ),
        life: 1,
      });
    }
    
    return particles;
  }, []);
  
  return {
    // Shared values
    scaleValue,
    rotationValue,
    transitionProgress,
    pulseValue,
    
    // Animation functions
    startBreathingAnimation,
    animateStageTransition,
    animateLeafOpening,
    animateBudBlooming,
    animatePistilGrowth,
    startTimeLapse,
    stopTimeLapse,
    getAnimationValues,
    applyWindEffect,
    createParticleBurst,
    
    // Configuration
    stageConfig,
  };
}

// Hook for managing growth time-lapse
export function useGrowthTimeLapse(
  initialStage: number = 1,
  maxStage: number = 8,
  onStageChange?: (stage: number) => void
) {
  const currentStage = useSharedValue(initialStage);
  const isPlaying = useSharedValue(false);
  const speed = useSharedValue(1);
  const progress = useSharedValue(0);
  
  const play = useCallback(() => {
    isPlaying.value = true;
  }, [isPlaying]);
  
  const pause = useCallback(() => {
    isPlaying.value = false;
  }, [isPlaying]);
  
  const reset = useCallback(() => {
    isPlaying.value = false;
    currentStage.value = 1;
    progress.value = 0;
    onStageChange?.(1);
  }, [isPlaying, currentStage, progress, onStageChange]);
  
  const setSpeed = useCallback((newSpeed: number) => {
    speed.value = newSpeed;
  }, [speed]);
  
  const goToStage = useCallback((stage: number) => {
    currentStage.value = Math.max(1, Math.min(maxStage, stage));
    progress.value = (stage - 1) / (maxStage - 1);
    onStageChange?.(stage);
  }, [currentStage, progress, maxStage, onStageChange]);
  
  return {
    currentStage,
    isPlaying,
    speed,
    progress,
    play,
    pause,
    reset,
    setSpeed,
    goToStage,
  };
}

export default usePlantAnimations;
