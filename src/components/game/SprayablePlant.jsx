import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

const PLANT_MODELS = ['https://raw.githubusercontent.com/base44dev/kurstaki-strikev1/main/public/models/plant03.glb', 'https://raw.githubusercontent.com/base44dev/kurstaki-strikev1/main/public/models/plant04.glb'];

useGLTF.preload('https://raw.githubusercontent.com/base44dev/kurstaki-strikev1/main/public/models/plant03.glb');
useGLTF.preload('https://raw.githubusercontent.com/base44dev/kurstaki-strikev1/main/public/models/plant04.glb');

const PLANT_STATES = {
  HEALTHY: 'healthy',
  INFESTED: 'infested',
  DISEASED: 'diseased',
  TREATING: 'treating',
  TREATED: 'treated',
  MATURE: 'mature'
};

const STATE_COLORS = {
  [PLANT_STATES.HEALTHY]: 0x00ff00,
  [PLANT_STATES.INFESTED]: 0xff6600,
  [PLANT_STATES.DISEASED]: 0xff0000,
  [PLANT_STATES.TREATING]: 0x00ffff,
  [PLANT_STATES.TREATED]: 0x88ff88,
  [PLANT_STATES.MATURE]: 0xffff00
};

const PARTICLE_CONFIGS = {
  'plant03': { count: 30, color: 0x88ff88, speed: 0.03, spread: 0.7 },
  'plant04': { count: 25, color: 0xaaffaa, speed: 0.025, spread: 0.6 }
};

export default function SprayablePlant({ 
  id, 
  modelPath, 
  position, 
  scale = 1, 
  onSpray,
  isTargeted,
  debugMode = false
}) {
  const groupRef = useRef();
  const [state, setState] = useState(PLANT_STATES.HEALTHY);
  const [previousState, setPreviousState] = useState(null);
  const [growthProgress, setGrowthProgress] = useState(0);
  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const particlesRef = useRef([]);
  const highlightRef = useRef();
  const colliderRef = useRef();
  const audioContextRef = useRef(null);
  const stateTimerRef = useRef(null);

  useEffect(() => {
    console.log(`Spawned plant: ${modelPath} at [${position.join(', ')}]`);
    
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {
        console.warn('AudioContext not available:', e);
      }
    }
    
    const randomState = Math.random();
    if (randomState < 0.3) {
      setTimeout(() => transitionToState(PLANT_STATES.INFESTED), Math.random() * 3000);
    }
    
    return () => {
      if (stateTimerRef.current) clearTimeout(stateTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (previousState !== state) {
      console.log(`🌱 State transition: id=${id}, ${previousState || 'initial'} → ${state}`);
      setPreviousState(state);
      playStateSound(state);
      
      if (state === PLANT_STATES.TREATED) {
        stateTimerRef.current = setTimeout(() => {
          transitionToState(PLANT_STATES.MATURE);
        }, 5000);
      }
    }
  }, [state, id, previousState]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.plantId = id;
        child.userData.isPlant = true;
        child.userData.state = state;
      }
    });
  }, [clonedScene, id, state]);

  const transitionToState = (newState) => {
    console.log(`🔄 Triggering state change: ${state} → ${newState}`);
    setState(newState);
    spawnStateParticles(newState);
  };

  const playStateSound = (stateName) => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    const soundMap = {
      [PLANT_STATES.INFESTED]: { freq: 150, duration: 0.3, type: 'sawtooth' },
      [PLANT_STATES.DISEASED]: { freq: 100, duration: 0.4, type: 'square' },
      [PLANT_STATES.TREATING]: { freq: 600, duration: 0.2, type: 'sine' },
      [PLANT_STATES.TREATED]: { freq: 800, duration: 0.25, type: 'sine' },
      [PLANT_STATES.MATURE]: { freq: 1000, duration: 0.3, type: 'triangle' }
    };
    
    const sound = soundMap[stateName] || { freq: 440, duration: 0.2, type: 'sine' };
    
    oscillator.type = sound.type;
    oscillator.frequency.setValueAtTime(sound.freq, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + sound.duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + sound.duration);
  };

  const spawnStateParticles = (stateName) => {
    const plantType = modelPath.includes('plant03') ? 'plant03' : 'plant04';
    const config = PARTICLE_CONFIGS[plantType];
    const stateColor = STATE_COLORS[stateName];
    
    for (let i = 0; i < config.count; i++) {
      particlesRef.current.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * config.spread,
          Math.random() * 2,
          (Math.random() - 0.5) * config.spread
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * config.speed,
          Math.random() * 0.05 + 0.02,
          (Math.random() - 0.5) * config.speed
        ),
        life: 1.0,
        scale: Math.random() * 0.12 + 0.06,
        color: stateColor,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.1
      });
    }
  };

  const handleSpray = () => {
    if (state === PLANT_STATES.INFESTED || state === PLANT_STATES.DISEASED || state === PLANT_STATES.HEALTHY) {
      transitionToState(PLANT_STATES.TREATING);
      
      setTimeout(() => {
        transitionToState(PLANT_STATES.TREATED);
        if (onSpray) {
          onSpray(id, state);
        }
      }, 1000);
      
      playSpraySound();
    }
  };

  const playSpraySound = () => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.15, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  };

  useFrame((threeState, delta) => {
    if (groupRef.current) {
      const time = threeState.clock.elapsedTime;
      const baseRotation = Math.sin(time * 0.5) * 0.05;
      
      if (state === PLANT_STATES.INFESTED) {
        groupRef.current.rotation.y = baseRotation + Math.sin(time * 3) * 0.03;
        groupRef.current.rotation.z = Math.sin(time * 2.5) * 0.02;
      } else if (state === PLANT_STATES.TREATING) {
        groupRef.current.rotation.y = baseRotation + Math.sin(time * 8) * 0.08;
      } else if (state === PLANT_STATES.MATURE) {
        const growthScale = 1 + growthProgress * 0.3;
        groupRef.current.scale.set(scale * growthScale, scale * growthScale, scale * growthScale);
        setGrowthProgress(Math.min(growthProgress + delta * 0.1, 1));
      } else {
        groupRef.current.rotation.y = baseRotation;
      }
    }

    if (highlightRef.current) {
      highlightRef.current.visible = isTargeted;
      if (isTargeted) {
        const pulseSpeed = state === PLANT_STATES.INFESTED ? 8 : 5;
        highlightRef.current.material.opacity = 0.3 + Math.sin(threeState.clock.elapsedTime * pulseSpeed) * 0.15;
      }
    }

    particlesRef.current = particlesRef.current.filter(particle => {
      particle.position.add(particle.velocity);
      particle.velocity.y -= 0.0015;
      particle.life -= delta * 0.5;
      particle.rotation += particle.rotationSpeed;
      return particle.life > 0;
    });
  });

  useEffect(() => {
    if (isTargeted && onSpray) {
      const handleClick = (e) => {
        if (e.button === 0) {
          handleSpray();
        }
      };
      const handleKeyDown = (e) => {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          handleSpray();
        }
      };
      window.addEventListener('mousedown', handleClick);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('mousedown', handleClick);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isTargeted, onSpray, state]);

  const currentStateColor = STATE_COLORS[state];

  return (
    <group ref={groupRef} position={position}>
      <primitive object={clonedScene} scale={scale} />
      
      <mesh ref={colliderRef} visible={false} userData={{ plantId: id, isPlant: true }}>
        <boxGeometry args={[1.5 * scale, 2.5 * scale, 1.5 * scale]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {isTargeted && (
        <mesh ref={highlightRef} position={[0, 1.2 * scale, 0]}>
          <sphereGeometry args={[0.8 * scale, 16, 16]} />
          <meshBasicMaterial 
            color={state === PLANT_STATES.INFESTED ? 0xff6600 : state === PLANT_STATES.DISEASED ? 0xff0000 : 0x00ffff} 
            transparent 
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}

      {state === PLANT_STATES.INFESTED && (
        <group position={[0, 1.5 * scale, 0]}>
          {[0, 1, 2].map(i => (
            <mesh key={i} position={[Math.cos(i * 2) * 0.3, Math.sin(i * 3) * 0.2, Math.sin(i * 2) * 0.3]}>
              <sphereGeometry args={[0.15 * scale, 8, 8]} />
              <meshStandardMaterial 
                color={0xff6600} 
                emissive={0xff3300}
                emissiveIntensity={0.7}
              />
            </mesh>
          ))}
        </group>
      )}

      {state === PLANT_STATES.DISEASED && (
        <mesh position={[0, 1.5 * scale, 0]}>
          <sphereGeometry args={[0.4 * scale, 16, 16]} />
          <meshStandardMaterial 
            color={0xff0000} 
            emissive={0xff0000}
            emissiveIntensity={0.8}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {state === PLANT_STATES.TREATING && (
        <mesh position={[0, 1.2 * scale, 0]}>
          <torusGeometry args={[0.6 * scale, 0.1 * scale, 16, 32]} />
          <meshStandardMaterial 
            color={0x00ffff} 
            emissive={0x00ffff}
            emissiveIntensity={1.0}
          />
        </mesh>
      )}

      {state === PLANT_STATES.TREATED && (
        <mesh position={[0, 1.5 * scale, 0]}>
          <sphereGeometry args={[0.35 * scale, 16, 16]} />
          <meshStandardMaterial 
            color={0x88ff88} 
            emissive={0x44ff44}
            emissiveIntensity={0.6}
          />
        </mesh>
      )}

      {state === PLANT_STATES.MATURE && (
        <group position={[0, 1.8 * scale, 0]}>
          <mesh>
            <sphereGeometry args={[0.4 * scale, 16, 16]} />
            <meshStandardMaterial 
              color={0xffff00} 
              emissive={0xffaa00}
              emissiveIntensity={0.8}
            />
          </mesh>
          {[0, 1, 2, 3, 4].map(i => {
            const angle = (i / 5) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3]}>
                <sphereGeometry args={[0.15 * scale, 8, 8]} />
                <meshStandardMaterial 
                  color={0xffd700} 
                  emissive={0xffaa00}
                  emissiveIntensity={0.6}
                />
              </mesh>
            );
          })}
        </group>
      )}

      {particlesRef.current.map((particle, i) => (
        <mesh key={i} position={particle.position} rotation={[0, particle.rotation, 0]}>
          <sphereGeometry args={[particle.scale, 8, 8]} />
          <meshStandardMaterial 
            color={particle.color}
            transparent
            opacity={particle.life * 0.8}
            emissive={particle.color}
            emissiveIntensity={particle.life * 0.6}
          />
        </mesh>
      ))}

      {debugMode && (
        <mesh position={[0, 3, 0]}>
          <sphereGeometry args={[0.2, 8, 8]} />
          <meshBasicMaterial color={0xff0000} />
        </mesh>
      )}
    </group>
  );
}

export { PLANT_MODELS };