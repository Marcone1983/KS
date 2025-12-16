import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';

function DNAStrand({ position, color, rotation }) {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  const pairs = [];
  const segments = 20;
  const radius = 0.3;
  const height = 2;

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const y = -height / 2 + t * height;
    const angle = t * Math.PI * 6 + rotation;
    
    pairs.push({
      pos1: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
      pos2: [Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius]
    });
  }

  return (
    <group ref={groupRef} position={position}>
      {pairs.map((pair, i) => (
        <group key={i}>
          <mesh position={pair.pos1}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
          
          <mesh position={pair.pos2}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
              metalness={0.3}
              roughness={0.2}
            />
          </mesh>
          
          <mesh position={[(pair.pos1[0] + pair.pos2[0]) / 2, pair.pos1[1], (pair.pos1[2] + pair.pos2[2]) / 2]}>
            <cylinderGeometry args={[0.02, 0.02, Math.hypot(pair.pos2[0] - pair.pos1[0], pair.pos2[2] - pair.pos1[2]), 8]} />
            <meshStandardMaterial color={0xffffff} transparent opacity={0.4} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function BreedingSystem3D({ genetics1 = {}, genetics2 = {}, breeding = false, offspring = null }) {
  return (
    <div className="w-full h-[400px] bg-black/30 rounded-2xl border-2 border-purple-500/50 overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={60} />
          <OrbitControls autoRotate={breeding} autoRotateSpeed={breeding ? 3 : 1} enableZoom={false} />

          <ambientLight intensity={0.3} />
          <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
          <pointLight position={[-3, 3, 3]} intensity={0.8} color="#00ffff" />
          <pointLight position={[3, 3, -3]} intensity={0.8} color="#ff00ff" />

          <DNAStrand position={[-1.5, 0, 0]} color="#00ff88" rotation={0} />
          <DNAStrand position={[1.5, 0, 0]} color="#ff0088" rotation={Math.PI / 3} />
          
          {breeding && offspring && (
            <DNAStrand position={[0, 0, 0]} color="#ffff00" rotation={Math.PI / 6} />
          )}

          {genetics1 && (
            <Text position={[-1.5, -1.5, 0]} fontSize={0.15} color="white" anchorX="center">
              Parent 1
            </Text>
          )}
          
          {genetics2 && (
            <Text position={[1.5, -1.5, 0]} fontSize={0.15} color="white" anchorX="center">
              Parent 2
            </Text>
          )}
          
          {offspring && (
            <Text position={[0, -1.5, 0]} fontSize={0.2} color="#ffff00" anchorX="center">
              Offspring
            </Text>
          )}

          <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={8} />
          <Environment preset="night" />
        </Suspense>
      </Canvas>
    </div>
  );
}