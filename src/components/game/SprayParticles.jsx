import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SprayParticles = forwardRef(({ onPestKilled }, ref) => {
  const particlesRef = useRef();
  const velocitiesRef = useRef([]);
  const lifetimesRef = useRef([]);
  const particleHeadRef = useRef(0);
  const particleCount = 800;

  const { positions, geometry } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];
    const lifetimes = [];
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      velocities.push(new THREE.Vector3());
      lifetimes.push(0);
    }
    
    velocitiesRef.current = velocities;
    lifetimesRef.current = lifetimes;
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    return { positions, geometry };
  }, []);

  useImperativeHandle(ref, () => ({
    emit: (camera, count = 30) => {
      const emitPosition = new THREE.Vector3(0.6, 1.15, 1.5);
      emitPosition.applyQuaternion(camera.quaternion);
      emitPosition.add(camera.position);
      
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(camera.quaternion);

      for (let i = 0; i < count; i++) {
        const id = particleHeadRef.current % particleCount;
        particleHeadRef.current++;

        const spread = 0.25;
        const speed = 0.75;
        
        const vx = direction.x * (0.85 + Math.random() * 0.6) + (Math.random() - 0.5) * spread;
        const vy = direction.y * (0.85 + Math.random() * 0.6) + (Math.random() - 0.5) * spread * 0.5;
        const vz = direction.z * (0.85 + Math.random() * 0.6) + (Math.random() - 0.5) * spread;

        positions[id * 3] = emitPosition.x;
        positions[id * 3 + 1] = emitPosition.y;
        positions[id * 3 + 2] = emitPosition.z;

        velocitiesRef.current[id].set(vx * speed, vy * speed, vz * speed);
        lifetimesRef.current[id] = 1.0;
      }

      geometry.attributes.position.needsUpdate = true;
    }
  }));

  useFrame((state, delta) => {
    const drag = 0.97;
    const gravity = -0.6;

    for (let i = 0; i < particleCount; i++) {
      if (lifetimesRef.current[i] <= 0) continue;

      const vel = velocitiesRef.current[i];
      vel.x *= drag;
      vel.y = vel.y * drag + gravity * delta;
      vel.z *= drag;

      positions[i * 3] += vel.x * delta;
      positions[i * 3 + 1] += vel.y * delta;
      positions[i * 3 + 2] += vel.z * delta;

      lifetimesRef.current[i] -= delta * 1.4;

      if (positions[i * 3 + 1] < 0.01) {
        lifetimesRef.current[i] = 0;
      }
    }

    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        color={0xc8e8ff}
        size={0.14}
        transparent
        opacity={0.85}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
});

export default SprayParticles;