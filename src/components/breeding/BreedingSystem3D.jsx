import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Text, Line } from '@react-three/drei';
import * as THREE from 'three';

function DNAStrand({ position, color, genes = {} }) {
  const groupRef = useRef();
  const segments = 20;
  const radius = 0.2;
  const height = 2;

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  const points1 = [];
  const points2 = [];

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const y = -height / 2 + t * height;
    const angle = t * Math.PI * 6;

    points1.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      y,
      Math.sin(angle) * radius
    ));

    points2.push(new THREE.Vector3(
      Math.cos(angle + Math.PI) * radius,
      y,
      Math.sin(angle + Math.PI) * radius
    ));
  }

  return (
    <group ref={groupRef} position={position}>
      {points1.map((point, i) => (
        <group key={i}>
          <mesh position={point}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.5}
            />
          </mesh>
          
          {i < points1.length - 1 && (
            <Line
              points={[point, points1[i + 1]]}
              color={color}
              lineWidth={2}
            />
          )}
          
          <Line
            points={[point, points2[i]]}
            color="#ffffff"
            lineWidth={1}
            opacity={0.3}
          />
        </group>
      ))}

      {points2.map((point, i) => (
        <group key={`s2-${i}`}>
          <mesh position={point}>
            <sphereGeometry args={[0.04, 12, 12]} />
            <meshStandardMaterial
              color={new THREE.Color(color).offsetHSL(0.1, 0, 0)}
              emissive={color}
              emissiveIntensity={0.3}
            />
          </mesh>
          
          {i < points2.length - 1 && (
            <Line
              points={[point, points2[i + 1]]}
              color={new THREE.Color(color).offsetHSL(0.1, 0, 0)}
              lineWidth={2}
            />
          )}
        </group>
      ))}
    </group>
  );
}

function MergingAnimation({ genetics1, genetics2, offspring, breeding }) {
  const mergeRef = useRef();

  useFrame((state) => {
    if (mergeRef.current && breeding) {
      const progress = (Math.sin(state.clock.elapsedTime * 2) + 1) / 2;
      mergeRef.current.position.x = -1.5 + progress * 1.5;
    }
  });

  return (
    <>
      <DNAStrand position={[-1.5, 0, 0]} color="#00ff88" genes={genetics1} />
      <DNAStrand position={[1.5, 0, 0]} color="#ff0088" genes={genetics2} />
      
      {breeding && offspring && (
        <group ref={mergeRef}>
          <DNAStrand position={[0, 0, 0]} color="#ffff00" genes={offspring} />
        </group>
      )}
    </>
  );
}

export default function BreedingSystem3D({ genetics1, genetics2, breeding, offspring }) {
  return (
    <div className="w-full h-[400px] bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl overflow-hidden">
      <Canvas shadows dpr={[1, 2]}>
        <Suspense fallback={null}>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
          <OrbitControls
            autoRotate={!breeding}
            autoRotateSpeed={1}
            enableZoom={false}
          />

          <ambientLight intensity={0.3} />
          <pointLight position={[0, 5, 0]} intensity={1} color="#ffffff" />
          <pointLight position={[-3, 2, 3]} intensity={0.8} color="#00ffff" />
          <pointLight position={[3, 2, -3]} intensity={0.8} color="#ff00ff" />

          <MergingAnimation
            genetics1={genetics1}
            genetics2={genetics2}
            offspring={offspring}
            breeding={breeding}
          />

          <Environment preset="night" />
        </Suspense>
      </Canvas>

      {breeding && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-6xl"
          >
            🧬
          </motion.div>
        </div>
      )}
    </div>
  );
}