import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Trail, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function EnhancedPestMesh({ pest, onHit }) {
  const groupRef = useRef();
  const segmentRefs = useRef([]);
  const glowRef = useRef();
  const isDying = pest.health <= 0;
  const isSpecial = pest.isSpecial || pest.specialType;

  const { bodyColor, headColor, emissiveColor, glowIntensity } = useMemo(() => {
    const colors = {
      aphid: { body: 0x88dd66, head: 0x2a2a2a, emissive: 0x44aa33, glow: 0.3 },
      thrip: { body: 0xaa8844, head: 0x3a3a1a, emissive: 0x886622, glow: 0.2 },
      spider_mite: { body: 0xdd5544, head: 0x2a1a1a, emissive: 0xaa3322, glow: 0.4 },
      whitefly: { body: 0xeeeeee, head: 0x4a4a4a, emissive: 0xcccccc, glow: 0.6 },
      caterpillar: { body: 0x77bb55, head: 0x3a5a2a, emissive: 0x55aa33, glow: 0.25 },
      grasshopper: { body: 0x99cc66, head: 0x2a3a1a, emissive: 0x77aa44, glow: 0.35 },
      fungus_gnat: { body: 0x555555, head: 0x1a1a1a, emissive: 0x333333, glow: 0.15 },
      root_borer: { body: 0x8b6f47, head: 0x3a2a1a, emissive: 0x6a5437, glow: 0.2 },
      healer: { body: 0x00ff88, head: 0x004422, emissive: 0x00dd66, glow: 1.2 },
      trapper: { body: 0xff8800, head: 0x442200, emissive: 0xdd6600, glow: 0.9 },
      berserker: { body: 0xff0000, head: 0x440000, emissive: 0xdd0000, glow: 1.5 },
      summoner: { body: 0x9966ff, head: 0x220044, emissive: 0x7744dd, glow: 1.0 },
      tank: { body: 0x666666, head: 0x222222, emissive: 0x444444, glow: 0.5 },
      speedster: { body: 0x00ffff, head: 0x004444, emissive: 0x00dddd, glow: 1.3 }
    };
    const type = pest.specialType || pest.type;
    return colors[type] || { body: 0x88dd66, head: 0x2a2a2a, emissive: 0x44aa33, glow: 0.3 };
  }, [pest.type, pest.specialType]);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    if (isDying) {
      groupRef.current.position.y -= delta * 4;
      groupRef.current.rotation.x += delta * 6;
      groupRef.current.rotation.z += delta * 4;
      groupRef.current.scale.multiplyScalar(1 - delta * 2.5);
      if (groupRef.current.position.y < -3) {
        groupRef.current.visible = false;
      }
      return;
    }

    const targetPos = new THREE.Vector3(pest.position.x, pest.position.y, pest.position.z);
    const lerpSpeed = pest.behavior === 'fast' ? 0.18 : pest.behavior === 'resistant' ? 0.06 : 0.12;
    groupRef.current.position.lerp(targetPos, lerpSpeed);

    if (pest.behavior === 'zigzag') {
      const zigzag = Math.sin(state.clock.elapsedTime * 5) * 0.35;
      groupRef.current.position.x += zigzag * delta;
    }

    if (pest.behavior === 'swarm') {
      const swarmOffset = Math.sin(state.clock.elapsedTime * 10 + pest.id * 2.5) * 0.18;
      groupRef.current.position.x += swarmOffset * delta;
      groupRef.current.position.z += Math.cos(state.clock.elapsedTime * 10 + pest.id * 2.5) * 0.18 * delta;
    }

    if (pest.behavior === 'jumper') {
      const jumpPhase = (state.clock.elapsedTime * 2.5 + pest.id) % 2;
      if (jumpPhase < 0.35) {
        groupRef.current.position.y = targetPos.y + Math.sin(jumpPhase * Math.PI * 2.86) * 0.6;
      }
    }

    if (pest.behavior === 'burrowing' && pest.underground) {
      groupRef.current.position.y = -0.6;
      if (Date.now() > pest.emergeTime) {
        groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetPos.y, 0.05);
      }
    }

    if (pest.behavior === 'camouflaged') {
      const opacity = 0.25 + Math.sin(state.clock.elapsedTime * 2.5) * 0.25;
      groupRef.current.traverse(child => {
        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = opacity;
        }
      });
    }

    const wiggle = Math.sin(state.clock.elapsedTime * 7 + pest.id) * 0.12;
    groupRef.current.rotation.x = wiggle;

    segmentRefs.current.forEach((seg, i) => {
      if (seg) {
        seg.position.y = Math.sin(state.clock.elapsedTime * 7 + i * 0.7) * 0.005;
        seg.rotation.y = Math.sin(state.clock.elapsedTime * 5 + i) * 0.1;
      }
    });

    if (pest.behavior === 'flying') {
      const bobHeight = Math.sin(state.clock.elapsedTime * 3.5 + pest.id) * 0.35;
      groupRef.current.position.y = targetPos.y + bobHeight;
      const wingFlap = Math.abs(Math.sin(state.clock.elapsedTime * 10));
      groupRef.current.rotation.z = wingFlap * 0.25;
    }

    if (pest.alerted && pest.alertTarget) {
      const panicSpeed = 1.8;
      const fleeDirection = new THREE.Vector3(
        groupRef.current.position.x - pest.alertTarget.x,
        0,
        groupRef.current.position.z - pest.alertTarget.z
      ).normalize();
      groupRef.current.position.x += fleeDirection.x * delta * panicSpeed;
      groupRef.current.position.z += fleeDirection.z * delta * panicSpeed;
    }

    if (pest.slowed && Date.now() < pest.slowedUntil) {
      const slowScale = 0.4;
      groupRef.current.position.lerp(targetPos, lerpSpeed * slowScale);
    }

    if (pest.isEnraged) {
      groupRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 8) * 0.1);
      if (glowRef.current) {
        glowRef.current.material.emissiveIntensity = 1.5 + Math.sin(state.clock.elapsedTime * 10) * 0.5;
      }
    }

    if (pest.isHealing) {
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 15) * 0.02;
    }

    if (pest.isDashing) {
      groupRef.current.scale.x = 1.5;
      groupRef.current.scale.y = 0.8;
    } else {
      groupRef.current.scale.x = THREE.MathUtils.lerp(groupRef.current.scale.x, 1, 0.1);
      groupRef.current.scale.y = THREE.MathUtils.lerp(groupRef.current.scale.y, 1, 0.1);
    }
  });

  const segments = pest.size === 'tiny' ? 4 : pest.size === 'small' ? 5 : pest.size === 'medium' ? 6 : 8;
  const useTrail = isSpecial || pest.behavior === 'fast' || pest.behavior === 'flying';

  const PestContent = (
    <group ref={groupRef} position={[pest.position.x, pest.position.y, pest.position.z]}>
      {Array.from({ length: segments }).map((_, i) => {
        const radius = 0.03 * (1 - i * 0.05) * (pest.size === 'tiny' ? 0.6 : pest.size === 'large' ? 1.4 : 1);
        const segmentScale = pest.size === 'tiny' ? 0.7 : pest.size === 'large' ? 1.3 : 1;
        
        return (
          <mesh
            key={i}
            ref={(el) => (segmentRefs.current[i] = el)}
            position-x={i * 0.035}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[radius, 12, 10]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? bodyColor : bodyColor * 0.75}
              roughness={0.5}
              metalness={isSpecial ? 0.6 : 0.2}
              emissive={emissiveColor}
              emissiveIntensity={pest.isEnraged ? glowIntensity * 2 : glowIntensity}
            />
          </mesh>
        );
      })}
      
      <mesh ref={glowRef} position-x={segments * 0.035} castShadow receiveShadow>
        <sphereGeometry args={[0.035, 12, 10]} />
        <meshStandardMaterial
          color={headColor}
          roughness={0.4}
          metalness={isSpecial ? 0.7 : 0.3}
          emissive={emissiveColor}
          emissiveIntensity={pest.isEnraged ? glowIntensity * 2.5 : glowIntensity * 1.2}
        />
      </mesh>

      {isSpecial && (
        <mesh position={[segments * 0.0175, 0, 0]} scale={1.8}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color={emissiveColor} transparent opacity={0.2} side={THREE.BackSide} />
        </mesh>
      )}

      {pest.behavior === 'flying' && (
        <>
          <mesh position={[segments * 0.018, 0.04, 0.025]} rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[0.1, 0.05]} />
            <meshStandardMaterial
              color={0xffffff}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
              emissive={0xaaffff}
              emissiveIntensity={0.3}
            />
          </mesh>
          <mesh position={[segments * 0.018, 0.04, -0.025]} rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[0.1, 0.05]} />
            <meshStandardMaterial
              color={0xffffff}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
              emissive={0xaaffff}
              emissiveIntensity={0.3}
            />
          </mesh>
        </>
      )}

      {pest.currentArmor > 0 && (
        <mesh position={[segments * 0.0175, 0, 0]} scale={1.3}>
          <dodecahedronGeometry args={[0.07, 0]} />
          <meshStandardMaterial
            color={0x888888}
            roughness={0.2}
            metalness={0.9}
            emissive={0x444444}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}

      {(isSpecial || pest.behavior === 'fast') && (
        <pointLight position={[0, 0, 0]} intensity={glowIntensity} distance={1.5} color={emissiveColor} />
      )}
    </group>
  );

  if (useTrail && !isDying) {
    return (
      <Trail
        width={0.3}
        length={12}
        color={new THREE.Color(emissiveColor)}
        attenuation={(t) => t * t}
      >
        {PestContent}
      </Trail>
    );
  }

  return PestContent;
}

export default function EnhancedPests3D({ pests, onPestHit }) {
  return (
    <group>
      {pests.map((pest) => (
        <EnhancedPestMesh key={pest.id} pest={pest} onHit={onPestHit} />
      ))}
    </group>
  );
}