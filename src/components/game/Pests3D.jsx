import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function PestMesh({ pest, onHit }) {
  const groupRef = useRef();
  const segmentRefs = useRef([]);
  const isDying = pest.health <= 0;

  const { bodyColor, headColor } = useMemo(() => {
    const colors = {
      aphid: { body: 0x88dd66, head: 0x2a2a2a },
      thrip: { body: 0xaa8844, head: 0x3a3a1a },
      spider_mite: { body: 0xdd5544, head: 0x2a1a1a },
      whitefly: { body: 0xeeeeee, head: 0x4a4a4a },
      caterpillar: { body: 0x77bb55, head: 0x3a5a2a },
      grasshopper: { body: 0x99cc66, head: 0x2a3a1a },
      fungus_gnat: { body: 0x555555, head: 0x1a1a1a },
      root_borer: { body: 0x8b6f47, head: 0x3a2a1a }
    };
    return colors[pest.type] || { body: 0x88dd66, head: 0x2a2a2a };
  }, [pest.type]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (isDying) {
      groupRef.current.position.y -= delta * 3;
      groupRef.current.rotation.x += delta * 5;
      groupRef.current.scale.multiplyScalar(1 - delta * 2);
      if (groupRef.current.position.y < -2) {
        groupRef.current.visible = false;
      }
      return;
    }

    const targetPos = new THREE.Vector3(
      pest.position.x,
      pest.position.y,
      pest.position.z
    );

    groupRef.current.position.lerp(targetPos, 0.1);

    const wiggle = Math.sin(state.clock.elapsedTime * 6 + pest.id) * 0.1;
    groupRef.current.rotation.x = wiggle;

    segmentRefs.current.forEach((seg, i) => {
      if (seg) {
        seg.position.y = Math.sin(state.clock.elapsedTime * 6 + i * 0.6) * 0.004;
      }
    });

    if (pest.behavior === 'flying') {
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 3 + pest.id) * 0.02;
    }
  });

  const segments = pest.size === 'tiny' ? 4 : pest.size === 'small' ? 5 : 6;

  return (
    <group ref={groupRef} position={[pest.position.x, pest.position.y, pest.position.z]}>
      {Array.from({ length: segments }).map((_, i) => {
        const radius = 0.025 * (1 - i * 0.06) * (pest.size === 'tiny' ? 0.7 : pest.size === 'large' ? 1.3 : 1);
        return (
          <mesh
            key={i}
            ref={(el) => (segmentRefs.current[i] = el)}
            position-x={i * 0.03}
            castShadow
          >
            <sphereGeometry args={[radius, 6, 5]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? bodyColor : bodyColor * 0.8}
              roughness={0.6}
              emissive={i % 2 === 0 ? bodyColor : bodyColor * 0.8}
              emissiveIntensity={0.15}
            />
          </mesh>
        );
      })}
      
      <mesh position-x={segments * 0.03} castShadow>
        <sphereGeometry args={[0.028, 6, 5]} />
        <meshStandardMaterial
          color={headColor}
          roughness={0.5}
          emissive={headColor}
          emissiveIntensity={0.2}
        />
      </mesh>

      {pest.behavior === 'flying' && (
        <>
          <mesh position={[segments * 0.015, 0.03, 0.02]} rotation-z={Math.PI / 4}>
            <planeGeometry args={[0.08, 0.04]} />
            <meshStandardMaterial
              color={0xffffff}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[segments * 0.015, 0.03, -0.02]} rotation-z={Math.PI / 4}>
            <planeGeometry args={[0.08, 0.04]} />
            <meshStandardMaterial
              color={0xffffff}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

export default function Pests3D({ pests, onPestHit }) {
  return (
    <group>
      {pests.map((pest) => (
        <PestMesh key={pest.id} pest={pest} onHit={onPestHit} />
      ))}
    </group>
  );
}