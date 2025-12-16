import React, { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  Sky,
  Environment,
  ContactShadows,
  Sparkles,
  Cloud,
  Stars
} from '@react-three/drei';
import * as THREE from 'three';
import { LayerMaterial, Depth, Noise, Fresnel } from 'lamina';

// Procedural terrain with grass
const ProceduralTerrain = ({ size = 50, segments = 100 }) => {
  const terrainRef = useRef();

  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    const positions = geometry.attributes.position.array;

    // Generate height map with Perlin-like noise
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];

      // Multiple octaves of noise for natural terrain
      let height = 0;
      height += Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.3;
      height += Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.1;
      height += Math.sin(x * 0.5) * Math.cos(y * 0.5) * 0.05;

      positions[i + 2] = height;
    }

    geometry.computeVertexNormals();
    return geometry;
  }, [size, segments]);

  return (
    <mesh
      ref={terrainRef}
      geometry={terrainGeometry}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <LayerMaterial side={THREE.DoubleSide}>
        <Depth
          colorA={new THREE.Color(0x2d5016)}
          colorB={new THREE.Color(0x1a3010)}
          alpha={1}
          mode="normal"
          near={0}
          far={2}
          origin={[0, 0, 0]}
        />
        <Noise
          mapping="local"
          type="cell"
          scale={50}
          colorA={new THREE.Color(0x4a7028)}
          colorB={new THREE.Color(0x2d5016)}
          mode="overlay"
          alpha={0.5}
        />
      </LayerMaterial>
    </mesh>
  );
};

// Grass blades instances
const GrassField = ({ count = 5000, radius = 20 }) => {
  const grassData = useMemo(() => {
    const data = [];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * radius;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;

      // Height based on distance from center
      const terrainHeight =
        Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.3 +
        Math.sin(x * 0.3) * Math.cos(z * 0.3) * 0.1;

      data.push({
        position: [x, terrainHeight, z],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.8 + Math.random() * 0.4
      });
    }

    return data;
  }, [count, radius]);

  const bladesRef = useRef();

  useFrame((state) => {
    if (bladesRef.current) {
      // Gentle wind animation
      bladesRef.current.children.forEach((blade, i) => {
        const time = state.clock.elapsedTime;
        const offset = i * 0.01;
        blade.rotation.x = Math.sin(time * 2 + offset) * 0.1;
      });
    }
  });

  return (
    <group ref={bladesRef}>
      {grassData.map((grass, i) => (
        <mesh
          key={`grass-${i}`}
          position={grass.position}
          rotation={grass.rotation}
          scale={grass.scale}
          castShadow
        >
          <coneGeometry args={[0.02, 0.3, 3, 1]} />
          <meshStandardMaterial
            color={0x3a5a2a}
            roughness={0.8}
            metalness={0}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
};

// Background trees
const BackgroundTrees = ({ count = 20, radius = 25 }) => {
  const trees = useMemo(() => {
    const treeData = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = radius + Math.random() * 5;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      const scale = 0.8 + Math.random() * 0.6;

      treeData.push({
        position: [x, 0, z],
        scale
      });
    }

    return treeData;
  }, [count, radius]);

  return (
    <group>
      {trees.map((tree, i) => (
        <group key={`tree-${i}`} position={tree.position} scale={tree.scale}>
          {/* Trunk */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.4, 3, 8]} />
            <meshStandardMaterial color={0x4a3020} roughness={0.9} />
          </mesh>

          {/* Foliage layers */}
          <mesh position={[0, 3.5, 0]} castShadow>
            <coneGeometry args={[2, 3, 8]} />
            <meshStandardMaterial color={0x2d5016} roughness={0.7} />
          </mesh>
          <mesh position={[0, 5, 0]} castShadow>
            <coneGeometry args={[1.5, 2.5, 8]} />
            <meshStandardMaterial color={0x3a6020} roughness={0.7} />
          </mesh>
          <mesh position={[0, 6.2, 0]} castShadow>
            <coneGeometry args={[1, 2, 8]} />
            <meshStandardMaterial color={0x4a7028} roughness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Atmospheric particles (dust, pollen)
const AtmosphericParticles = ({ count = 200 }) => {
  const particlesRef = useRef();

  const particlePositions = useMemo(() => {
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = Math.random() * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }

    return positions;
  }, [count]);

  useFrame((state, delta) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array;

      for (let i = 0; i < count; i++) {
        // Drift motion
        positions[i * 3] += Math.sin(state.clock.elapsedTime + i) * 0.01 * delta;
        positions[i * 3 + 1] += Math.cos(state.clock.elapsedTime * 0.5 + i) * 0.01 * delta;
        positions[i * 3 + 2] += Math.sin(state.clock.elapsedTime * 0.3 + i) * 0.01 * delta;

        // Wrap around boundaries
        if (positions[i * 3] > 15) positions[i * 3] = -15;
        if (positions[i * 3] < -15) positions[i * 3] = 15;
        if (positions[i * 3 + 1] > 10) positions[i * 3 + 1] = 0;
        if (positions[i * 3 + 2] > 15) positions[i * 3 + 2] = -15;
        if (positions[i * 3 + 2] < -15) positions[i * 3 + 2] = 15;
      }

      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={particlePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color={0xffffff}
        transparent
        opacity={0.3}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

// Advanced lighting setup
const AdvancedLighting = ({ timeOfDay = 'day' }) => {
  const lightRef = useRef();

  useFrame((state) => {
    if (lightRef.current) {
      // Subtle sun movement
      const time = state.clock.elapsedTime * 0.1;
      lightRef.current.position.x = Math.sin(time) * 20;
      lightRef.current.position.z = Math.cos(time) * 20;
    }
  });

  const lightConfig = {
    day: {
      sunColor: 0xfff5e1,
      sunIntensity: 2,
      ambientColor: 0x87ceeb,
      ambientIntensity: 0.5,
      skyTurbidity: 10,
      skyRayleigh: 2,
      sunPosition: [50, 30, 50]
    },
    sunset: {
      sunColor: 0xff7f50,
      sunIntensity: 1.5,
      ambientColor: 0xff6b35,
      ambientIntensity: 0.4,
      skyTurbidity: 20,
      skyRayleigh: 0.5,
      sunPosition: [50, 5, 50]
    },
    night: {
      sunColor: 0x4169e1,
      sunIntensity: 0.3,
      ambientColor: 0x191970,
      ambientIntensity: 0.2,
      skyTurbidity: 5,
      skyRayleigh: 1,
      sunPosition: [50, -20, 50]
    }
  };

  const config = lightConfig[timeOfDay] || lightConfig.day;

  return (
    <>
      {/* Directional sun light */}
      <directionalLight
        ref={lightRef}
        position={config.sunPosition}
        intensity={config.sunIntensity}
        color={config.sunColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={100}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-bias={-0.0001}
      />

      {/* Ambient light */}
      <ambientLight
        intensity={config.ambientIntensity}
        color={config.ambientColor}
      />

      {/* Hemisphere light for natural outdoor lighting */}
      <hemisphereLight
        skyColor={0x87ceeb}
        groundColor={0x2d5016}
        intensity={0.6}
      />

      {/* Fill lights for softer shadows */}
      <directionalLight
        position={[-20, 10, -20]}
        intensity={0.3}
        color={0xffffff}
      />
      <directionalLight
        position={[20, 10, -20]}
        intensity={0.3}
        color={0xffffff}
      />
    </>
  );
};

// Main Environment Component
const Environment3D = ({
  timeOfDay = 'day',
  weatherEffect = 'clear',
  showBackgroundTrees = true,
  showGrass = true,
  showParticles = true
}) => {
  return (
    <group>
      {/* Sky */}
      <Sky
        distance={450000}
        sunPosition={timeOfDay === 'day' ? [100, 20, 100] : [100, -10, 100]}
        inclination={0}
        azimuth={0.25}
        turbidity={timeOfDay === 'day' ? 10 : 20}
        rayleigh={timeOfDay === 'day' ? 2 : 0.5}
      />

      {/* Stars (only at night) */}
      {timeOfDay === 'night' && (
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
      )}

      {/* Advanced Lighting */}
      <AdvancedLighting timeOfDay={timeOfDay} />

      {/* HDRI Environment for realistic reflections */}
      <Environment preset="sunset" background={false} />

      {/* Terrain */}
      <ProceduralTerrain size={100} segments={100} />

      {/* Contact Shadows for ground realism */}
      <ContactShadows
        position={[0, 0.01, 0]}
        opacity={0.5}
        scale={50}
        blur={2}
        far={10}
        resolution={256}
        color="#000000"
      />

      {/* Grass Field */}
      {showGrass && <GrassField count={8000} radius={25} />}

      {/* Background Trees */}
      {showBackgroundTrees && <BackgroundTrees count={30} radius={30} />}

      {/* Atmospheric Particles */}
      {showParticles && <AtmosphericParticles count={300} />}

      {/* Sparkles for magical atmosphere */}
      <Sparkles
        count={50}
        scale={[40, 20, 40]}
        size={2}
        speed={0.3}
        opacity={0.3}
        color={0xffffff}
      />

      {/* Weather Effects */}
      {weatherEffect === 'cloudy' && (
        <>
          <Cloud position={[-10, 8, -10]} speed={0.1} opacity={0.4} />
          <Cloud position={[15, 10, -15]} speed={0.15} opacity={0.3} />
          <Cloud position={[0, 12, -20]} speed={0.08} opacity={0.5} />
        </>
      )}

      {weatherEffect === 'foggy' && (
        <fog attach="fog" args={[0xcccccc, 10, 50]} />
      )}

      {/* Volumetric light shafts (god rays simulation) */}
      {timeOfDay === 'day' && (
        <mesh position={[0, 5, -20]} rotation={[0, 0, 0]}>
          <coneGeometry args={[8, 15, 8, 1, true]} />
          <meshBasicMaterial
            color={0xfff5e1}
            transparent
            opacity={0.05}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  );
};

export default Environment3D;
