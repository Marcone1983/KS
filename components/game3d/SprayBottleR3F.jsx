import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const SprayBottleR3F = forwardRef(({ camera }, ref) => {
  const bottleGroupRef = useRef();
  const triggerRef = useRef();
  const handGroupRef = useRef();
  const animationProgress = useRef(0);

  useImperativeHandle(ref, () => ({
    triggerAnimation: (isActive) => {
      animationProgress.current = isActive ? Math.min(1, animationProgress.current + 0.1) : Math.max(0, animationProgress.current - 0.15);
    }
  }));

  useFrame(() => {
    if (triggerRef.current && bottleGroupRef.current) {
      const progress = animationProgress.current;
      triggerRef.current.rotation.x = -Math.sin(progress * Math.PI) * 0.65;
      bottleGroupRef.current.rotation.x = 0.15 - progress * 0.15;
    }
  });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xe8f5ff,
    roughness: 0.05,
    transmission: 0.95,
    thickness: 0.8,
    ior: 1.52,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
    reflectivity: 0.85,
    transparent: true,
    opacity: 0.15
  });

  const liquidMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x70c4ff,
    roughness: 0.08,
    transmission: 0.88,
    thickness: 0.6,
    ior: 1.35,
    metalness: 0.0,
    transparent: true,
    opacity: 0.7
  });

  const plasticMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.25,
    metalness: 0.45,
    emissive: 0x0a0a0a,
    emissiveIntensity: 0.15
  });

  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xd4a589,
    roughness: 0.65,
    metalness: 0.0
  });

  return (
    <group ref={handGroupRef} position={[0.45, -0.5, -0.6]} rotation={[0.15, -0.3, 0.05]} scale={1.3}>
      <mesh material={skinMaterial} castShadow>
        <boxGeometry args={[0.12, 0.18, 0.06]} />
      </mesh>
      
      <mesh position={[-0.06, 0.05, 0.025]} rotation-z={-0.6} material={skinMaterial} castShadow>
        <boxGeometry args={[0.035, 0.09, 0.035]} />
      </mesh>
      
      {[
        [0.04, 0.12],
        [0.018, 0.14],
        [-0.01, 0.13],
        [-0.035, 0.11]
      ].map((pos, i) => (
        <mesh key={i} position={[pos[0], pos[1], 0]} rotation-x={-0.25} material={skinMaterial} castShadow>
          <boxGeometry args={[0.028, 0.11, 0.028]} />
        </mesh>
      ))}
      
      <group ref={bottleGroupRef} position={[0, 0.05, 0.06]} rotation={[0.15, 0.05, 0]}>
        <mesh material={glassMaterial} castShadow receiveShadow>
          <cylinderGeometry args={[0.09, 0.1, 0.4, 20]} />
        </mesh>
        
        <mesh position-y={-0.05} material={liquidMaterial}>
          <cylinderGeometry args={[0.085, 0.095, 0.32, 20]} />
        </mesh>
        
        <mesh ref={triggerRef} position={[0.105, 0.12, 0]} material={plasticMaterial} castShadow>
          <boxGeometry args={[0.055, 0.11, 0.09]} />
        </mesh>
        
        <mesh position-y={0.24} material={plasticMaterial} castShadow>
          <cylinderGeometry args={[0.078, 0.092, 0.075, 20]} />
        </mesh>
        
        <mesh position={[0.08, 0.24, 0]} rotation-z={Math.PI / 2} material={plasticMaterial} castShadow>
          <cylinderGeometry args={[0.022, 0.028, 0.045, 16]} />
        </mesh>
        
        <mesh position={[0.145, 0.24, 0]} rotation-z={-Math.PI / 2} material={plasticMaterial} castShadow>
          <coneGeometry args={[0.016, 0.045, 12]} />
        </mesh>
      </group>
    </group>
  );
});

export default SprayBottleR3F;