import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

function PotMesh({ color = '#8B4513', type = 'basic' }) {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  const potShapes = {
    basic: () => (
      <>
        <mesh ref={meshRef} position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.6, 0.5, 1, 32]} />
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <torusGeometry args={[0.55, 0.05, 16, 32]} />
          <meshStandardMaterial color={color} roughness={0.7} metalness={0.2} />
        </mesh>
      </>
    ),
    ceramic: () => (
      <>
        <mesh ref={meshRef} position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.6, 0.45, 1.1, 32]} />
          <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
        </mesh>
        <mesh position={[0, 0.3, 0]}>
          <torusGeometry args={[0.58, 0.07, 16, 32]} />
          <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.8)} roughness={0.3} metalness={0.5} />
        </mesh>
      </>
    ),
    terracotta: () => (
      <>
        <mesh ref={meshRef} position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.65, 0.5, 1, 32]} />
          <meshStandardMaterial color={color} roughness={0.9} metalness={0.1} />
        </mesh>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[0, -0.1 - i * 0.15, 0]}>
            <torusGeometry args={[0.5 + i * 0.03, 0.02, 8, 32]} />
            <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.9)} roughness={0.9} />
          </mesh>
        ))}
      </>
    ),
    smart: () => (
      <>
        <mesh ref={meshRef} position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.6, 0.55, 1, 6]} />
          <meshStandardMaterial color={color} roughness={0.2} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.25, 0]}>
          <torusGeometry args={[0.58, 0.03, 16, 6]} />
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0.5, 0, 0]}>
          <boxGeometry args={[0.1, 0.2, 0.05]} />
          <meshStandardMaterial color="#111111" emissive="#00ff00" emissiveIntensity={0.3} />
        </mesh>
      </>
    ),
    wooden: () => (
      <>
        <mesh ref={meshRef} position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.6, 0.52, 1, 16]} />
          <meshStandardMaterial color={color} roughness={0.95} metalness={0} />
        </mesh>
        {[...Array(8)].map((_, i) => {
          const angle = (i / 8) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(angle) * 0.57, -0.3, Math.sin(angle) * 0.57]} rotation={[0, angle, 0]}>
              <boxGeometry args={[0.08, 0.95, 0.05]} />
              <meshStandardMaterial color={new THREE.Color(color).multiplyScalar(0.85)} roughness={0.95} />
            </mesh>
          );
        })}
      </>
    )
  };

  const PotShape = potShapes[type] || potShapes.basic;

  return (
    <group>
      <PotShape />
      <mesh position={[0, -0.82, 0]}>
        <cylinderGeometry args={[0.49, 0.49, 0.05, 32]} />
        <meshStandardMaterial color="#3a2010" roughness={0.9} />
      </mesh>
    </group>
  );
}

export default function PotVisualization({ color = '#8B4513', type = 'basic' }) {
  return (
    <div className="w-full h-32 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0.5, 2.5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-5, 3, -5]} intensity={0.5} color="#ffa500" />
        <PotMesh color={color} type={type} />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={2} />
      </Canvas>
    </div>
  );
}