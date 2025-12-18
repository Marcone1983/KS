// @ts-nocheck
import React, { Suspense, useRef, useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Dimensions, Platform } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { useGLTF, OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import { Asset } from 'expo-asset';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Preload assets for React Native
const plantModel03Asset = Asset.fromModule(require('@/assets/models/plant03.glb'));
const plantModel04Asset = Asset.fromModule(require('@/assets/models/plant04.glb'));
const sprayModelAsset = Asset.fromModule(require('@/assets/models/spray.glb'));

interface PlantProps {
  position: [number, number, number];
  scale?: number;
  modelType: 'plant03' | 'plant04';
  health: number;
  onHit?: () => void;
}

interface SprayProps {
  position: [number, number, number];
  rotation: [number, number, number];
  isSpraying: boolean;
}

interface PestProps {
  id: string;
  position: [number, number, number];
  targetPlant: number;
  health: number;
  speed: number;
  type: 'caterpillar' | 'aphid' | 'beetle' | 'moth';
}

interface Game3DSceneProps {
  onScoreChange: (score: number) => void;
  onHealthChange: (health: number) => void;
  onAmmoChange: (ammo: number) => void;
  onWaveChange: (wave: number) => void;
  onGameOver: () => void;
  isPaused: boolean;
  level: number;
}

// Plant Component with GLB model
function Plant({ position, scale = 1, modelType, health, onHit }: PlantProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [modelUri, setModelUri] = useState<string | null>(null);

  useEffect(() => {
    const loadModel = async () => {
      const asset = modelType === 'plant03' ? plantModel03Asset : plantModel04Asset;
      await asset.downloadAsync();
      setModelUri(asset.localUri || asset.uri);
    };
    loadModel();
  }, [modelType]);

  // Animate plant based on health
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle swaying animation
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
      
      // Health-based color tint
      const healthPercent = health / 100;
      meshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const mat = child.material as THREE.MeshStandardMaterial;
          if (mat.color) {
            mat.color.setRGB(
              0.2 + healthPercent * 0.3,
              0.5 + healthPercent * 0.5,
              0.2 + healthPercent * 0.1
            );
          }
        }
      });
    }
  });

  if (!modelUri) {
    // Placeholder while loading
    return (
      <mesh position={position} scale={scale}>
        <coneGeometry args={[0.5, 2, 8]} />
        <meshStandardMaterial color="#228B22" />
      </mesh>
    );
  }

  return (
    <group ref={meshRef} position={position} scale={scale}>
      <Suspense fallback={
        <mesh>
          <coneGeometry args={[0.5, 2, 8]} />
          <meshStandardMaterial color="#228B22" />
        </mesh>
      }>
        <PlantModel uri={modelUri} />
      </Suspense>
      {/* Health indicator above plant */}
      <mesh position={[0, 3, 0]}>
        <planeGeometry args={[1, 0.1]} />
        <meshBasicMaterial color={health > 50 ? '#22c55e' : health > 25 ? '#f59e0b' : '#ef4444'} />
      </mesh>
    </group>
  );
}

function PlantModel({ uri }: { uri: string }) {
  const { scene } = useGLTF(uri);
  return <primitive object={scene.clone()} />;
}

// Spray Gun Component
function SprayGun({ position, rotation, isSpraying }: SprayProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [modelUri, setModelUri] = useState<string | null>(null);
  const particlesRef = useRef<THREE.Points>(null);

  useEffect(() => {
    const loadModel = async () => {
      await sprayModelAsset.downloadAsync();
      setModelUri(sprayModelAsset.localUri || sprayModelAsset.uri);
    };
    loadModel();
  }, []);

  // Spray particles
  const particles = useMemo(() => {
    const count = 100;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.5;
      positions[i * 3 + 1] = Math.random() * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (particlesRef.current && isSpraying) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += 0.05; // Move particles up
        if (positions[i + 1] > 3) {
          positions[i + 1] = 0;
        }
      }
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  if (!modelUri) {
    return (
      <mesh position={position} rotation={rotation}>
        <cylinderGeometry args={[0.1, 0.15, 0.5, 8]} />
        <meshStandardMaterial color="#1e90ff" />
      </mesh>
    );
  }

  return (
    <group position={position} rotation={rotation}>
      <Suspense fallback={
        <mesh>
          <cylinderGeometry args={[0.1, 0.15, 0.5, 8]} />
          <meshStandardMaterial color="#1e90ff" />
        </mesh>
      }>
        <SprayModel uri={modelUri} ref={meshRef} />
      </Suspense>
      
      {/* Spray particles */}
      {isSpraying && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={100}
              array={particles}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.05}
            color="#00bfff"
            transparent
            opacity={0.7}
            sizeAttenuation
          />
        </points>
      )}
    </group>
  );
}

function SprayModel({ uri }: { uri: string }) {
  const { scene } = useGLTF(uri);
  return <primitive object={scene.clone()} scale={0.5} />;
}

// Pest Component
function Pest({ id, position, targetPlant, health, speed, type }: PestProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [currentPos, setCurrentPos] = useState(position);

  const pestColors = {
    caterpillar: '#228B22',
    aphid: '#90EE90',
    beetle: '#8B4513',
    moth: '#DDA0DD',
  };

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Move towards plant
      const targetX = targetPlant === 0 ? -2 : 2;
      const dx = targetX - meshRef.current.position.x;
      const dz = 0 - meshRef.current.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      
      if (dist > 0.5) {
        meshRef.current.position.x += (dx / dist) * speed * delta;
        meshRef.current.position.z += (dz / dist) * speed * delta;
      }
      
      // Wiggle animation
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 5) * 0.2;
    }
  });

  return (
    <mesh ref={meshRef} position={currentPos}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial color={pestColors[type]} />
    </mesh>
  );
}

// Main Game Scene
export default function Game3DScene({
  onScoreChange,
  onHealthChange,
  onAmmoChange,
  onWaveChange,
  onGameOver,
  isPaused,
  level,
}: Game3DSceneProps) {
  const [plants, setPlants] = useState([
    { id: 'plant1', position: [-2, 0, 0] as [number, number, number], health: 100, modelType: 'plant03' as const },
    { id: 'plant2', position: [2, 0, 0] as [number, number, number], health: 100, modelType: 'plant04' as const },
  ]);
  
  const [pests, setPests] = useState<PestProps[]>([]);
  const [sprayPosition, setSprayPosition] = useState<[number, number, number]>([0, 0, 5]);
  const [sprayRotation, setSprayRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [isSpraying, setIsSpraying] = useState(false);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [ammo, setAmmo] = useState(100);

  // Spawn pests based on wave
  useEffect(() => {
    if (isPaused) return;
    
    const spawnInterval = setInterval(() => {
      const pestTypes: PestProps['type'][] = ['caterpillar', 'aphid', 'beetle', 'moth'];
      const newPest: PestProps = {
        id: `pest-${Date.now()}`,
        position: [
          (Math.random() - 0.5) * 10,
          0.2,
          -10 + Math.random() * 2,
        ],
        targetPlant: Math.random() > 0.5 ? 0 : 1,
        health: 20 + wave * 5,
        speed: 0.5 + wave * 0.1,
        type: pestTypes[Math.floor(Math.random() * pestTypes.length)],
      };
      
      setPests(prev => [...prev, newPest]);
    }, Math.max(2000 - wave * 100, 500));

    return () => clearInterval(spawnInterval);
  }, [wave, isPaused]);

  // Update parent components
  useEffect(() => {
    onScoreChange(score);
  }, [score]);

  useEffect(() => {
    const totalHealth = plants.reduce((sum, p) => sum + p.health, 0) / plants.length;
    onHealthChange(totalHealth);
    if (totalHealth <= 0) {
      onGameOver();
    }
  }, [plants]);

  useEffect(() => {
    onAmmoChange(ammo);
  }, [ammo]);

  useEffect(() => {
    onWaveChange(wave);
  }, [wave]);

  const handleSpray = () => {
    if (ammo <= 0) return;
    setIsSpraying(true);
    setAmmo(prev => prev - 1);
    
    // Check for pest hits
    setPests(prev => {
      const remaining = prev.filter(pest => {
        const dx = pest.position[0] - sprayPosition[0];
        const dz = pest.position[2] - sprayPosition[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < 2) {
          setScore(s => s + 10);
          return false;
        }
        return true;
      });
      return remaining;
    });

    setTimeout(() => setIsSpraying(false), 200);
  };

  return (
    <View style={styles.container}>
      <Canvas
        style={styles.canvas}
        gl={{ antialias: true }}
        onPointerDown={handleSpray}
      >
        <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#87CEEB" />
        
        {/* Environment */}
        <Environment preset="forest" />
        
        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <meshStandardMaterial color="#2d5a27" />
        </mesh>

        {/* Plants */}
        {plants.map((plant, index) => (
          <Plant
            key={plant.id}
            position={plant.position}
            modelType={plant.modelType}
            health={plant.health}
            scale={1.5}
          />
        ))}

        {/* Spray Gun */}
        <SprayGun
          position={sprayPosition}
          rotation={sprayRotation}
          isSpraying={isSpraying}
        />

        {/* Pests */}
        {pests.map(pest => (
          <Pest key={pest.id} {...pest} />
        ))}

        {/* Controls */}
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 2.5}
          minPolarAngle={Math.PI / 4}
        />
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  canvas: {
    flex: 1,
  },
});
