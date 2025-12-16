import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ProceduralTerrain({ windStrength = 0.2 }) {
  const grassInstancesRef = useRef([]);
  
  const terrainGeometry = useMemo(() => {
    const size = 60;
    const segments = 80;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    
    const positions = geo.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      
      let height = 0;
      height += Math.sin(x * 0.15) * Math.cos(y * 0.15) * 0.2;
      height += Math.sin(x * 0.35) * Math.cos(y * 0.35) * 0.08;
      height += Math.sin(x * 0.6) * Math.cos(y * 0.6) * 0.04;
      
      positions[i + 2] = height;
    }
    
    geo.computeVertexNormals();
    return geo;
  }, []);

  const grassInstances = useMemo(() => {
    const instances = [];
    const count = 3000;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * 15;
      const x = Math.cos(angle) * distance;
      const z = Math.sin(angle) * distance;
      
      const terrainHeight = 
        Math.sin(x * 0.15) * Math.cos(z * 0.15) * 0.2 +
        Math.sin(x * 0.35) * Math.cos(z * 0.35) * 0.08;

      instances.push({
        position: [x, terrainHeight, z],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.8 + Math.random() * 0.5,
        windOffset: Math.random() * Math.PI * 2
      });
    }
    
    return instances;
  }, []);

  useFrame((state) => {
    grassInstancesRef.current.forEach((grass, i) => {
      if (grass) {
        const instance = grassInstances[i];
        grass.rotation.x = Math.sin(state.clock.elapsedTime * 2 + instance.windOffset) * windStrength * 0.15;
      }
    });
  });

  return (
    <group>
      <mesh 
        geometry={terrainGeometry} 
        rotation-x={-Math.PI / 2} 
        receiveShadow
      >
        <meshStandardMaterial 
          color={0x2a3a2a} 
          roughness={0.9} 
          metalness={0.0}
        />
      </mesh>

      {grassInstances.map((instance, i) => (
        <mesh
          key={i}
          ref={(el) => (grassInstancesRef.current[i] = el)}
          position={instance.position}
          rotation={instance.rotation}
          scale={instance.scale}
          castShadow
        >
          <coneGeometry args={[0.025, 0.35, 4, 1]} />
          <meshStandardMaterial 
            color={0x3a5a2a} 
            roughness={0.85} 
            flatShading 
          />
        </mesh>
      ))}

      {Array.from({ length: 25 }).map((_, i) => {
        const angle = (i / 25) * Math.PI * 2;
        const distance = 18 + Math.random() * 8;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const treeScale = 0.7 + Math.random() * 0.7;

        return (
          <group key={i} position={[x, 0, z]} scale={treeScale}>
            <mesh position-y={1.6} castShadow>
              <cylinderGeometry args={[0.32, 0.42, 3.2, 10]} />
              <meshStandardMaterial color={0x4a3020} roughness={0.92} />
            </mesh>
            
            <mesh position-y={3.8} castShadow>
              <coneGeometry args={[2.2, 3.2, 10]} />
              <meshStandardMaterial color={0x2d5016} roughness={0.75} />
            </mesh>
            
            <mesh position-y={5.3} castShadow>
              <coneGeometry args={[1.7, 2.7, 10]} />
              <meshStandardMaterial color={0x3a6020} roughness={0.75} />
            </mesh>
            
            <mesh position-y={6.6} castShadow>
              <coneGeometry args={[1.1, 2.2, 10]} />
              <meshStandardMaterial color={0x4a7028} roughness={0.75} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}