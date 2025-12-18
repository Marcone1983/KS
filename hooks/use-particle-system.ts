import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';

export interface ParticleConfig {
  count: number;
  color: string;
  size: number;
  speed: number;
  area: [number, number, number]; // [width, height, depth]
  shape: 'box' | 'sphere';
  direction: [number, number, number];
  noise: number;
  lifetime: number;
  gravity: number;
  fadeIn: number;
  fadeOut: number;
}

export function useParticleSystem(config: ParticleConfig) {
  const { 
    count, color, size, speed, area, shape, direction, 
    noise, lifetime, gravity, fadeIn, fadeOut 
  } = config;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = Math.random() * area[0] - area[0] / 2;
      const y = Math.random() * area[1] - area[1] / 2;
      const z = Math.random() * area[2] - area[2] / 2;
      
      const particle = {
        position: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          direction[0] * speed + (Math.random() - 0.5) * noise,
          direction[1] * speed + (Math.random() - 0.5) * noise,
          direction[2] * speed + (Math.random() - 0.5) * noise
        ),
        life: Math.random() * lifetime,
        maxLife: lifetime,
      };
      temp.push(particle);
    }
    return temp;
  }, [count, area, direction, speed, noise, lifetime]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    particles.forEach((particle, i) => {
      particle.life += delta;

      if (particle.life > particle.maxLife) {
        particle.life = 0;
        particle.position.set(
          Math.random() * area[0] - area[0] / 2,
          Math.random() * area[1] - area[1] / 2,
          Math.random() * area[2] - area[2] / 2
        );
        particle.velocity.set(
          direction[0] * speed + (Math.random() - 0.5) * noise,
          direction[1] * speed + (Math.random() - 0.5) * noise,
          direction[2] * speed + (Math.random() - 0.5) * noise
        );
      }

      particle.velocity.y -= gravity * delta;
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));

      dummy.position.copy(particle.position);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      // Opacity fade in/out
      const lifeRatio = particle.life / particle.maxLife;
      let opacity = 1;
      if (lifeRatio < fadeIn) {
        opacity = lifeRatio / fadeIn;
      } else if (lifeRatio > 1 - fadeOut) {
        opacity = (1 - lifeRatio) / fadeOut;
      }
      
      // This requires a custom shader material to handle per-instance opacity
      // For simplicity, we'll just apply it to the whole mesh for now
      // (meshRef.current.material as THREE.MeshStandardMaterial).opacity = opacity;
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return { meshRef, particles, dummy };
}

export default useParticleSystem;
