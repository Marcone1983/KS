import React, { useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const EnhancedSprayParticles = forwardRef(({ activePowerUps = [] }, ref) => {
  const particlesRef = useRef();
  const velocitiesRef = useRef([]);
  const lifetimesRef = useRef([]);
  const particleHeadRef = useRef(0);
  const glowParticlesRef = useRef();
  const trailsRef = useRef([]);
  const particleCount = 1200;

  const hasMultishot = activePowerUps.some(p => p.type === 'multishot');
  const hasRage = activePowerUps.some(p => p.type === 'rage');
  const hasFreeze = activePowerUps.some(p => p.type === 'freeze');
  const hasPierce = activePowerUps.some(p => p.type === 'pierce');

  const { positions, geometry, glowGeometry } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const glowPositions = new Float32Array(particleCount * 3);
    const velocities = [];
    const lifetimes = [];
    const trails = [];
    
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      glowPositions[i * 3] = 0;
      glowPositions[i * 3 + 1] = 0;
      glowPositions[i * 3 + 2] = 0;
      
      velocities.push(new THREE.Vector3());
      lifetimes.push(0);
      trails.push([]);
    }
    
    velocitiesRef.current = velocities;
    lifetimesRef.current = lifetimes;
    trailsRef.current = trails;
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const glowGeometry = new THREE.BufferGeometry();
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3));
    
    return { positions, geometry, glowGeometry, glowPositions };
  }, []);

  useImperativeHandle(ref, () => ({
    emit: (camera, count = 40) => {
      const emitPosition = new THREE.Vector3(0.65, 1.18, 1.45);
      emitPosition.applyQuaternion(camera.quaternion);
      emitPosition.add(camera.position);
      
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(camera.quaternion);

      const emitCount = hasMultishot ? count * 2 : count;
      const spreadMultiplier = hasMultishot ? 1.8 : 1.0;

      for (let i = 0; i < emitCount; i++) {
        const id = particleHeadRef.current % particleCount;
        particleHeadRef.current++;

        const spread = 0.3 * spreadMultiplier;
        const speed = hasRage ? 1.2 : hasPierce ? 1.5 : 0.85;
        
        const vx = direction.x * (0.8 + Math.random() * 0.7) + (Math.random() - 0.5) * spread;
        const vy = direction.y * (0.8 + Math.random() * 0.7) + (Math.random() - 0.5) * spread * 0.6;
        const vz = direction.z * (0.8 + Math.random() * 0.7) + (Math.random() - 0.5) * spread;

        positions[id * 3] = emitPosition.x;
        positions[id * 3 + 1] = emitPosition.y;
        positions[id * 3 + 2] = emitPosition.z;

        velocitiesRef.current[id].set(vx * speed, vy * speed, vz * speed);
        lifetimesRef.current[id] = hasFreeze ? 1.5 : hasPierce ? 2.0 : 1.0;
        
        trailsRef.current[id] = [
          { x: emitPosition.x, y: emitPosition.y, z: emitPosition.z }
        ];
      }

      geometry.attributes.position.needsUpdate = true;
      glowGeometry.attributes.position.needsUpdate = true;
    }
  }));

  useFrame((state, delta) => {
    const drag = hasPierce ? 0.995 : 0.97;
    const gravity = hasFreeze ? -0.3 : -0.65;

    for (let i = 0; i < particleCount; i++) {
      if (lifetimesRef.current[i] <= 0) continue;

      const vel = velocitiesRef.current[i];
      vel.x *= drag;
      vel.y = vel.y * drag + gravity * delta;
      vel.z *= drag;

      positions[i * 3] += vel.x * delta;
      positions[i * 3 + 1] += vel.y * delta;
      positions[i * 3 + 2] += vel.z * delta;

      glowGeometry.attributes.position.array[i * 3] = positions[i * 3];
      glowGeometry.attributes.position.array[i * 3 + 1] = positions[i * 3 + 1];
      glowGeometry.attributes.position.array[i * 3 + 2] = positions[i * 3 + 2];

      const trail = trailsRef.current[i];
      if (trail.length > 0) {
        trail.push({
          x: positions[i * 3],
          y: positions[i * 3 + 1],
          z: positions[i * 3 + 2]
        });
        if (trail.length > 8) trail.shift();
      }

      lifetimesRef.current[i] -= delta * (hasFreeze ? 0.8 : 1.5);

      if (positions[i * 3 + 1] < 0.01) {
        lifetimesRef.current[i] = 0;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    glowGeometry.attributes.position.needsUpdate = true;
  });

  const particleColor = hasRage ? 0xff0000 : hasFreeze ? 0x00ccff : hasPierce ? 0xffff00 : hasMultishot ? 0xff00ff : 0xc8e8ff;
  const glowColor = hasRage ? 0xff4400 : hasFreeze ? 0x4488ff : hasPierce ? 0xffaa00 : hasMultishot ? 0xff44ff : 0x88ccff;

  return (
    <>
      <points ref={particlesRef} geometry={geometry}>
        <pointsMaterial
          color={particleColor}
          size={hasRage ? 0.18 : hasMultishot ? 0.12 : 0.15}
          transparent
          opacity={0.9}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>

      <points ref={glowParticlesRef} geometry={glowGeometry}>
        <pointsMaterial
          color={glowColor}
          size={hasRage ? 0.35 : hasMultishot ? 0.25 : 0.28}
          transparent
          opacity={hasRage ? 0.6 : 0.45}
          sizeAttenuation
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
});

export default EnhancedSprayParticles;