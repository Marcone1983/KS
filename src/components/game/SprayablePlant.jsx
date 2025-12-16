import React, { useRef, useState, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SkeletonUtils } from 'three-stdlib';

const PLANT_MODELS = ['/models/plant03.glb', '/models/plant04.glb'];

useGLTF.preload('/models/plant03.glb');
useGLTF.preload('/models/plant04.glb');

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
  const [state, setState] = useState('idle');
  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const particlesRef = useRef([]);
  const highlightRef = useRef();
  const colliderRef = useRef();

  useEffect(() => {
    console.log(`Spawned plant: ${modelPath} at [${position.join(', ')}]`);
  }, []);

  useEffect(() => {
    if (state === 'treated') {
      console.log(`Sprayed plant: id=${id} state=treated`);
    }
  }, [state, id]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.userData.plantId = id;
        child.userData.isPlant = true;
      }
    });
  }, [clonedScene, id]);

  const handleSpray = () => {
    if (state === 'idle') {
      setState('treated');
      if (onSpray) {
        onSpray(id);
      }
      
      for (let i = 0; i < 20; i++) {
        particlesRef.current.push({
          position: new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            Math.random() * 1.5,
            (Math.random() - 0.5) * 0.5
          ),
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.02,
            Math.random() * 0.05 + 0.02,
            (Math.random() - 0.5) * 0.02
          ),
          life: 1.0,
          scale: Math.random() * 0.1 + 0.05
        });
      }
    }
  };

  useFrame((state, delta) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.05;
    }

    if (highlightRef.current) {
      highlightRef.current.visible = isTargeted;
      if (isTargeted) {
        highlightRef.current.material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
      }
    }

    particlesRef.current = particlesRef.current.filter(particle => {
      particle.position.add(particle.velocity);
      particle.velocity.y -= 0.001;
      particle.life -= delta * 0.5;
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
      window.addEventListener('mousedown', handleClick);
      return () => window.removeEventListener('mousedown', handleClick);
    }
  }, [isTargeted, onSpray]);

  const stateColor = state === 'treated' ? 0x00ff00 : 0xffffff;

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
            color={0x00ffff} 
            transparent 
            opacity={0.3}
            wireframe
          />
        </mesh>
      )}

      {state === 'treated' && (
        <mesh position={[0, 1.5 * scale, 0]}>
          <sphereGeometry args={[0.3 * scale, 16, 16]} />
          <meshStandardMaterial 
            color={0x00ff00} 
            emissive={0x00ff00}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}

      {particlesRef.current.map((particle, i) => (
        <mesh key={i} position={particle.position}>
          <sphereGeometry args={[particle.scale, 8, 8]} />
          <meshStandardMaterial 
            color={0x88ff88}
            transparent
            opacity={particle.life}
            emissive={0x88ff88}
            emissiveIntensity={0.5}
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