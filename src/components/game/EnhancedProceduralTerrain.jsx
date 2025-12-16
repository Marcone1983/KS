import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ScatteredPlants } from './PlantModel3D';

export default function EnhancedProceduralTerrain({ windStrength = 0.2, timeOfDay = 'day', weather = 'clear' }) {
  const grassInstancesRef = useRef([]);
  const rockRefs = useRef([]);
  const flowerRefs = useRef([]);
  const waterRef = useRef();
  
  const terrainGeometry = useMemo(() => {
    const size = 80;
    const segments = 120;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    
    const positions = geo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      let height = 0;
      height += Math.sin(x * 0.12) * Math.cos(y * 0.12) * 0.3;
      height += Math.sin(x * 0.4) * Math.cos(y * 0.4) * 0.12;
      height += Math.sin(x * 0.7) * Math.cos(y * 0.7) * 0.06;
      height += (Math.random() - 0.5) * 0.03;
      
      positions[i + 2] = height;
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  const grassInstances = useMemo(() => {
    const instances = [];
    const count = 5000;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * 20;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      const terrainHeight = 
        Math.sin(x * 0.12) * Math.cos(z * 0.12) * 0.3 +
        Math.sin(x * 0.4) * Math.cos(z * 0.4) * 0.12;

      instances.push({
        position: [x, terrainHeight, z],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.7 + Math.random() * 0.6,
        windOffset: Math.random() * Math.PI * 2,
        variant: Math.floor(Math.random() * 3)
      });
    }
    
    return instances;
  }, []);

  const rockInstances = useMemo(() => {
    const rocks = [];
    const count = 80;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 8 + Math.random() * 15;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      const terrainHeight = 
        Math.sin(x * 0.12) * Math.cos(z * 0.12) * 0.3 +
        Math.sin(x * 0.4) * Math.cos(z * 0.4) * 0.12;

      rocks.push({
        position: [x, terrainHeight + 0.1, z],
        rotation: [Math.random() * 0.5, Math.random() * Math.PI * 2, Math.random() * 0.5],
        scale: 0.3 + Math.random() * 0.8
      });
    }
    
    return rocks;
  }, []);

  const flowerInstances = useMemo(() => {
    const flowers = [];
    const count = 500;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * 18;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      const terrainHeight = 
        Math.sin(x * 0.12) * Math.cos(z * 0.12) * 0.3 +
        Math.sin(x * 0.4) * Math.cos(z * 0.4) * 0.12;

      flowers.push({
        position: [x, terrainHeight + 0.05, z],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.15 + Math.random() * 0.1,
        color: [0xffff00, 0xff6600, 0xff00ff, 0xffffff][Math.floor(Math.random() * 4)],
        windOffset: Math.random() * Math.PI * 2
      });
    }
    
    return flowers;
  }, []);

  useFrame((state) => {
    grassInstancesRef.current.forEach((grass, i) => {
      if (grass) {
        const instance = grassInstances[i];
        const windEffect = Math.sin(state.clock.elapsedTime * 2.5 + instance.windOffset) * windStrength;
        grass.rotation.x = windEffect * 0.2;
        grass.rotation.z = windEffect * 0.15;
      }
    });

    flowerRefs.current.forEach((flower, i) => {
      if (flower) {
        const instance = flowerInstances[i];
        const sway = Math.sin(state.clock.elapsedTime * 3 + instance.windOffset) * windStrength * 0.3;
        flower.rotation.x = sway;
      }
    });

    if (waterRef.current) {
      waterRef.current.position.y = 0.01 + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
      waterRef.current.material.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  const terrainColor = timeOfDay === 'night' ? 0x1a2a1a : timeOfDay === 'sunset' ? 0x3a4a2a : 0x2a3a2a;

  const waterMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: new THREE.Color(0x4488aa) },
        color2: { value: new THREE.Color(0x88ccff) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float time;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          vec3 pos = position;
          pos.z += sin(pos.x * 3.0 + time) * 0.02;
          pos.z += cos(pos.y * 2.5 + time * 1.2) * 0.015;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
          vec3 color = mix(color1, color2, vUv.y);
          float wave = sin(vPosition.x * 5.0 + time * 2.0) * 0.5 + 0.5;
          color = mix(color, color2, wave * 0.3);
          
          gl_FragColor = vec4(color, 0.7);
        }
      `,
      transparent: true
    });
  }, []);

  return (
    <group>
      <mesh 
        geometry={terrainGeometry} 
        rotation-x={-Math.PI / 2} 
        receiveShadow
      >
        <meshStandardMaterial 
          color={terrainColor} 
          roughness={0.95} 
          metalness={0.0}
        />
      </mesh>

      {grassInstances.map((instance, i) => (
        <mesh
          key={`grass-${i}`}
          ref={(el) => (grassInstancesRef.current[i] = el)}
          position={instance.position}
          rotation={instance.rotation}
          scale={instance.scale}
          castShadow
        >
          {instance.variant === 0 && <coneGeometry args={[0.03, 0.4, 5, 1]} />}
          {instance.variant === 1 && <cylinderGeometry args={[0.02, 0.025, 0.45, 6]} />}
          {instance.variant === 2 && <coneGeometry args={[0.025, 0.5, 4, 1]} />}
          <meshStandardMaterial 
            color={0x3a5a2a} 
            roughness={0.9} 
            flatShading 
          />
        </mesh>
      ))}

      {rockInstances.map((rock, i) => (
        <mesh
          key={`rock-${i}`}
          ref={(el) => (rockRefs.current[i] = el)}
          position={rock.position}
          rotation={rock.rotation}
          scale={rock.scale}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial 
            color={0x4a4a4a} 
            roughness={0.95} 
            metalness={0.0}
          />
        </mesh>
      ))}

      {flowerInstances.map((flower, i) => (
        <group
          key={`flower-${i}`}
          ref={(el) => (flowerRefs.current[i] = el)}
          position={flower.position}
          rotation={flower.rotation}
          scale={flower.scale}
        >
          <mesh position-y={0.15} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
            <meshStandardMaterial color={0x2a5a1a} roughness={0.8} />
          </mesh>
          <mesh position-y={0.3} castShadow>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color={flower.color} roughness={0.4} emissive={flower.color} emissiveIntensity={0.3} />
          </mesh>
          {Array.from({ length: 6 }).map((_, p) => {
            const petalAngle = (p / 6) * Math.PI * 2;
            return (
              <mesh
                key={p}
                position={[
                  Math.cos(petalAngle) * 0.06,
                  0.3,
                  Math.sin(petalAngle) * 0.06
                ]}
                rotation-x={Math.PI / 2}
                rotation-z={petalAngle}
                castShadow
              >
                <planeGeometry args={[0.05, 0.08]} />
                <meshStandardMaterial
                  color={flower.color}
                  roughness={0.3}
                  side={2}
                  emissive={flower.color}
                  emissiveIntensity={0.2}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      <mesh
        ref={waterRef}
        position={[-10, 0.01, -15]}
        rotation-x={-Math.PI / 2}
        receiveShadow
      >
        <planeGeometry args={[8, 8, 32, 32]} />
        <primitive object={waterMaterial} attach="material" />
      </mesh>

      <ScatteredPlants count={25} areaRadius={35} windStrength={windStrength} />

      <fog attach="fog" args={[weather === 'fog' ? '#b0b0b0' : '#87ceeb', 12, weather === 'fog' ? 20 : 40]} />
    </group>
  );
}