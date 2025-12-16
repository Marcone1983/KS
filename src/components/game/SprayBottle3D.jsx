import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { LayerMaterial, Depth, Fresnel, Noise } from 'lamina';

const SprayBottle3D = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  isSpraying = false,
  sprayColor = 0x4a90e2,
  onSprayComplete
}) => {
  const bottleRef = useRef();
  const triggerRef = useRef();
  const nozzleRef = useRef();
  const sprayParticlesRef = useRef();
  const liquidRef = useRef();

  const [triggerPressed, setTriggerPressed] = useState(false);
  const [sprayActive, setSpraying] = useState(false);

  // Spray particle system
  const particleCount = 500;
  const particles = useRef({
    positions: new Float32Array(particleCount * 3),
    velocities: new Float32Array(particleCount * 3),
    lifetimes: new Float32Array(particleCount),
    sizes: new Float32Array(particleCount)
  });

  // Initialize particles
  useEffect(() => {
    for (let i = 0; i < particleCount; i++) {
      particles.current.lifetimes[i] = -1; // Inactive initially
    }
  }, []);

  // Emit new particles when spraying
  const emitParticles = () => {
    const emitCount = 15;

    for (let i = 0; i < particleCount; i++) {
      if (particles.current.lifetimes[i] <= 0 && emitCount > 0) {
        const idx = i * 3;

        // Emit from nozzle position
        particles.current.positions[idx] = 0;
        particles.current.positions[idx + 1] = 0.35;
        particles.current.positions[idx + 2] = 0.15;

        // Cone-shaped spray pattern
        const angle = (Math.random() - 0.5) * Math.PI * 0.3;
        const spread = (Math.random() - 0.5) * Math.PI * 0.3;
        const speed = 3 + Math.random() * 2;

        particles.current.velocities[idx] = Math.sin(angle) * speed;
        particles.current.velocities[idx + 1] = Math.cos(spread) * 0.5;
        particles.current.velocities[idx + 2] = Math.cos(angle) * speed;

        particles.current.lifetimes[i] = 1.0;
        particles.current.sizes[i] = 0.01 + Math.random() * 0.02;
      }
    }
  };

  // Update spray state
  useEffect(() => {
    if (isSpraying && !sprayActive) {
      setSpraying(true);
      setTriggerPressed(true);
    } else if (!isSpraying && sprayActive) {
      setSpraying(false);
      setTriggerPressed(false);
      if (onSprayComplete) onSprayComplete();
    }
  }, [isSpraying, sprayActive, onSprayComplete]);

  // Animation loop
  useFrame((state, delta) => {
    // Trigger animation
    if (triggerRef.current) {
      const targetRotation = triggerPressed ? -0.3 : 0;
      triggerRef.current.rotation.x += (targetRotation - triggerRef.current.rotation.x) * 0.2;
    }

    // Spray particles animation
    if (sprayActive) {
      emitParticles();
    }

    // Update all particles
    for (let i = 0; i < particleCount; i++) {
      if (particles.current.lifetimes[i] > 0) {
        const idx = i * 3;

        // Apply gravity and velocity
        particles.current.velocities[idx + 1] -= delta * 2; // Gravity

        particles.current.positions[idx] += particles.current.velocities[idx] * delta;
        particles.current.positions[idx + 1] += particles.current.velocities[idx + 1] * delta;
        particles.current.positions[idx + 2] += particles.current.velocities[idx + 2] * delta;

        // Air resistance
        particles.current.velocities[idx] *= 0.98;
        particles.current.velocities[idx + 1] *= 0.98;
        particles.current.velocities[idx + 2] *= 0.98;

        // Decrease lifetime
        particles.current.lifetimes[i] -= delta * 0.8;
      }
    }

    // Update particle geometry
    if (sprayParticlesRef.current) {
      sprayParticlesRef.current.geometry.attributes.position.array = particles.current.positions;
      sprayParticlesRef.current.geometry.attributes.position.needsUpdate = true;

      // Update particle sizes based on lifetime
      const sizes = sprayParticlesRef.current.geometry.attributes.size.array;
      for (let i = 0; i < particleCount; i++) {
        const lifetime = particles.current.lifetimes[i];
        sizes[i] = lifetime > 0 ? particles.current.sizes[i] * lifetime * 30 : 0;
      }
      sprayParticlesRef.current.geometry.attributes.size.needsUpdate = true;
    }

    // Liquid sloshing animation
    if (liquidRef.current) {
      liquidRef.current.position.y = 0.08 + Math.sin(state.clock.elapsedTime * 2) * 0.002;
    }
  });

  // Particle geometry
  const particleGeometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(particles.current.positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array(particleCount), 1));
    return geometry;
  }, []);

  // Particle material
  const particleMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 1,
      color: sprayColor,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }, [sprayColor]);

  return (
    <group ref={bottleRef} position={position} rotation={rotation} scale={scale}>
      {/* Main bottle body */}
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.12, 0.1, 0.3, 32]} />
        <MeshTransmissionMaterial
          backside
          samples={16}
          resolution={256}
          transmission={0.95}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          thickness={0.5}
          ior={1.45}
          chromaticAberration={0.06}
          anisotropy={0.3}
          distortion={0.1}
          distortionScale={0.2}
          temporalDistortion={0.1}
          color={new THREE.Color(0xffffff).multiplyScalar(0.95)}
        />
      </mesh>

      {/* Liquid inside bottle */}
      <mesh ref={liquidRef} position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.09, 0.25, 32]} />
        <meshPhysicalMaterial
          color={sprayColor}
          transparent={true}
          opacity={0.7}
          transmission={0.5}
          roughness={0.1}
          metalness={0.1}
          ior={1.33}
          thickness={0.3}
        />
      </mesh>

      {/* Bottle cap/top */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.12, 0.05, 32]} />
        <meshStandardMaterial
          color={0x333333}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>

      {/* Trigger mechanism */}
      <group ref={triggerRef} position={[0, 0.25, 0.08]}>
        {/* Trigger body */}
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.15, 0.03]} />
          <meshStandardMaterial
            color={0x2a2a2a}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>

        {/* Trigger finger rest */}
        <mesh position={[0, -0.05, 0.02]} rotation={[0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.08, 0.06, 0.02]} />
          <meshStandardMaterial
            color={0x2a2a2a}
            roughness={0.4}
            metalness={0.6}
          />
        </mesh>
      </group>

      {/* Nozzle */}
      <group ref={nozzleRef} position={[0, 0.3, 0.12]}>
        {/* Nozzle body */}
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.015, 0.02, 0.08, 16]} />
          <meshStandardMaterial
            color={0x1a1a1a}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>

        {/* Nozzle tip */}
        <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.008, 0.015, 0.02, 16]} />
          <meshStandardMaterial
            color={0x0a0a0a}
            roughness={0.1}
            metalness={0.9}
          />
        </mesh>

        {/* Nozzle opening */}
        <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 0.01, 8]} />
          <meshBasicMaterial color={0x000000} />
        </mesh>
      </group>

      {/* Adjustment ring */}
      <mesh position={[0, 0.3, 0.08]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.025, 0.008, 16, 32]} />
        <meshStandardMaterial
          color={0xff6b35}
          roughness={0.3}
          metalness={0.7}
        />
      </group>

      {/* Tube inside (visible through transparent bottle) */}
      <mesh position={[0, -0.05, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.008, 0.25, 12]} />
        <meshStandardMaterial
          color={0xeeeeee}
          transparent={true}
          opacity={0.8}
          roughness={0.2}
          metalness={0.3}
        />
      </mesh>

      {/* Base grip ridges */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={`ridge-${i}`}
          position={[0, -0.1 + i * 0.03, 0]}
          castShadow
        >
          <torusGeometry args={[0.105, 0.003, 8, 32]} />
          <meshStandardMaterial
            color={0x444444}
            roughness={0.6}
            metalness={0.4}
          />
        </mesh>
      ))}

      {/* Spray particles */}
      <points ref={sprayParticlesRef} geometry={particleGeometry} material={particleMaterial} />

      {/* Spray mist effect (additive layer) */}
      {sprayActive && (
        <mesh position={[0, 0.35, 0.3]} scale={[0.3, 0.3, 0.5]}>
          <coneGeometry args={[1, 2, 16, 1, true]} />
          <meshBasicMaterial
            color={sprayColor}
            transparent={true}
            opacity={0.15}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Label on bottle */}
      <mesh position={[0, 0.05, 0.121]} rotation={[0, 0, 0]}>
        <planeGeometry args={[0.15, 0.08]} />
        <meshStandardMaterial
          color={0xffffff}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Warning symbol on label */}
      <mesh position={[0, 0.05, 0.122]}>
        <circleGeometry args={[0.02, 32]} />
        <meshBasicMaterial color={0xff0000} />
      </mesh>

      {/* Barcode on label */}
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh
          key={`barcode-${i}`}
          position={[-0.055 + i * 0.01, 0.02, 0.122]}
        >
          <planeGeometry args={[0.003, 0.03]} />
          <meshBasicMaterial color={i % 2 === 0 ? 0x000000 : 0xffffff} />
        </mesh>
      ))}
    </group>
  );
};

export default SprayBottle3D;
