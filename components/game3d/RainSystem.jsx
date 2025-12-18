import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function RainSystem({ intensity = 0.8, windStrength = 0.2 }) {
  const rainRef = useRef();
  const splashRef = useRef();
  const velocitiesRef = useRef([]);
  const splashVelocitiesRef = useRef([]);
  const splashLifetimesRef = useRef([]);
  const splashHeadRef = useRef(0);

  const rainCount = 800;
  const splashCount = 200;

  const { rainGeometry, splashGeometry } = useMemo(() => {
    const rainPositions = new Float32Array(rainCount * 3);
    const rainVelocities = [];
    
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 30;
      rainPositions[i * 3 + 1] = Math.random() * 15;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      rainVelocities.push(-6 - Math.random() * 3);
    }
    
    velocitiesRef.current = rainVelocities;
    
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));

    const splashPositions = new Float32Array(splashCount * 3);
    const splashVels = [];
    const splashLifes = [];
    
    for (let i = 0; i < splashCount; i++) {
      splashPositions[i * 3] = 0;
      splashPositions[i * 3 + 1] = -10;
      splashPositions[i * 3 + 2] = 0;
      splashVels.push(new THREE.Vector3());
      splashLifes.push(0);
    }
    
    splashVelocitiesRef.current = splashVels;
    splashLifetimesRef.current = splashLifes;
    
    const splashGeo = new THREE.BufferGeometry();
    splashGeo.setAttribute('position', new THREE.BufferAttribute(splashPositions, 3));

    return { rainGeometry: rainGeo, splashGeometry: splashGeo };
  }, []);

  useFrame((state, delta) => {
    const rainPositions = rainGeometry.attributes.position.array;
    const splashPositions = splashGeometry.attributes.position.array;
    
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3 + 1] += velocitiesRef.current[i] * delta * intensity;
      rainPositions[i * 3] += Math.sin(state.clock.elapsedTime * 0.8 + i) * windStrength * delta * 2;
      
      if (rainPositions[i * 3 + 1] < 0.1) {
        if (Math.random() < 0.15) {
          for (let s = 0; s < 3; s++) {
            const sid = (splashHeadRef.current + s) % splashCount;
            splashPositions[sid * 3] = rainPositions[i * 3];
            splashPositions[sid * 3 + 1] = 0.05;
            splashPositions[sid * 3 + 2] = rainPositions[i * 3 + 2];
            
            const angle = (s / 3) * Math.PI * 2;
            splashVelocitiesRef.current[sid].set(
              Math.cos(angle) * 0.3,
              0.4 + Math.random() * 0.3,
              Math.sin(angle) * 0.3
            );
            splashLifetimesRef.current[sid] = 1.0;
          }
          splashHeadRef.current = (splashHeadRef.current + 3) % splashCount;
        }
        
        rainPositions[i * 3 + 1] = 15;
        rainPositions[i * 3] = (Math.random() - 0.5) * 30;
        rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      }
    }
    
    for (let i = 0; i < splashCount; i++) {
      if (splashLifetimesRef.current[i] <= 0) continue;
      
      splashVelocitiesRef.current[i].y -= 1.5 * delta;
      splashPositions[i * 3] += splashVelocitiesRef.current[i].x * delta;
      splashPositions[i * 3 + 1] += splashVelocitiesRef.current[i].y * delta;
      splashPositions[i * 3 + 2] += splashVelocitiesRef.current[i].z * delta;
      
      splashLifetimesRef.current[i] -= delta * 2;
      
      if (splashPositions[i * 3 + 1] < 0) {
        splashLifetimesRef.current[i] = 0;
      }
    }
    
    rainGeometry.attributes.position.needsUpdate = true;
    splashGeometry.attributes.position.needsUpdate = true;
  });

  return (
    <>
      <points ref={rainRef} geometry={rainGeometry}>
        <pointsMaterial
          color={0xaaffff}
          size={0.06}
          transparent
          opacity={0.7 * intensity}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      <points ref={splashRef} geometry={splashGeometry}>
        <pointsMaterial
          color={0xccffff}
          size={0.04}
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}