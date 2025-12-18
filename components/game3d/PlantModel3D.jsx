import React, { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

useGLTF.preload('/models/plant03.glb');
useGLTF.preload('/models/plant04.glb');

export function PlantModel({ modelPath, position, rotation, scale, windStrength = 0.2 }) {
  const groupRef = useRef();
  const { scene } = useGLTF(modelPath);
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const sway = Math.sin(time * 1.5 + position[0] * 2) * windStrength * 0.02;
      groupRef.current.rotation.z = sway;
      groupRef.current.rotation.x = Math.cos(time * 1.2 + position[2] * 2) * windStrength * 0.015;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}

export function ScatteredPlants({ count = 20, areaRadius = 30, windStrength = 0.2 }) {
  const plants = useMemo(() => {
    const instances = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + Math.random() * areaRadius;
      const modelPath = Math.random() > 0.5 ? '/models/plant03.glb' : '/models/plant04.glb';
      
      instances.push({
        modelPath,
        position: [
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.8 + Math.random() * 0.6
      });
    }
    return instances;
  }, [count, areaRadius]);

  return (
    <group>
      {plants.map((plant, i) => (
        <PlantModel
          key={i}
          modelPath={plant.modelPath}
          position={plant.position}
          rotation={plant.rotation}
          scale={plant.scale}
          windStrength={windStrength}
        />
      ))}
    </group>
  );
}

export default PlantModel;