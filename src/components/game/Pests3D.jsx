import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';

// Aphid (Afide) - Small sap-sucking insect
const Aphid = ({ position, scale = 1, movePattern }) => {
  const groupRef = useRef();
  const antennaLeftRef = useRef();
  const antennaRightRef = useRef();
  const moveOffset = useRef(Math.random() * 100);

  useFrame((state) => {
    const time = state.clock.elapsedTime + moveOffset.current;

    // Gentle swaying motion
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(time * 1.5) * 0.2;
      groupRef.current.rotation.x = Math.sin(time * 0.8) * 0.1;
    }

    // Antenna movement
    if (antennaLeftRef.current) {
      antennaLeftRef.current.rotation.z = Math.sin(time * 3) * 0.3;
    }
    if (antennaRightRef.current) {
      antennaRightRef.current.rotation.z = -Math.sin(time * 3) * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Body */}
      <mesh castShadow>
        <sphereGeometry args={[0.015, 12, 12]} />
        <meshStandardMaterial
          color={0x3a5a2a}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Abdomen */}
      <mesh position={[0, 0, -0.012]} castShadow>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial
          color={0x4a6a3a}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0, 0.015]} castShadow>
        <sphereGeometry args={[0.008, 10, 10]} />
        <meshStandardMaterial
          color={0x2a4a1a}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[0.004, 0.003, 0.02]}>
        <sphereGeometry args={[0.002, 8, 8]} />
        <meshBasicMaterial color={0x000000} />
      </mesh>
      <mesh position={[-0.004, 0.003, 0.02]}>
        <sphereGeometry args={[0.002, 8, 8]} />
        <meshBasicMaterial color={0x000000} />
      </mesh>

      {/* Antennae */}
      <group ref={antennaLeftRef} position={[0.003, 0.005, 0.018]}>
        <mesh rotation={[0.3, 0.2, 0.3]}>
          <cylinderGeometry args={[0.0005, 0.0005, 0.015, 4]} />
          <meshStandardMaterial color={0x1a2a0a} />
        </mesh>
      </group>
      <group ref={antennaRightRef} position={[-0.003, 0.005, 0.018]}>
        <mesh rotation={[0.3, -0.2, -0.3]}>
          <cylinderGeometry args={[0.0005, 0.0005, 0.015, 4]} />
          <meshStandardMaterial color={0x1a2a0a} />
        </mesh>
      </group>

      {/* Legs */}
      {[0, 1, 2].map((i) => {
        const angle = (i - 1) * 0.3;
        return (
          <React.Fragment key={`leg-${i}`}>
            {/* Left leg */}
            <mesh
              position={[0.008, -0.008, 0.005 - i * 0.008]}
              rotation={[0.5, angle, 0.8]}
            >
              <cylinderGeometry args={[0.0003, 0.0003, 0.012, 4]} />
              <meshStandardMaterial color={0x1a2a0a} />
            </mesh>
            {/* Right leg */}
            <mesh
              position={[-0.008, -0.008, 0.005 - i * 0.008]}
              rotation={[0.5, -angle, -0.8]}
            >
              <cylinderGeometry args={[0.0003, 0.0003, 0.012, 4]} />
              <meshStandardMaterial color={0x1a2a0a} />
            </mesh>
          </React.Fragment>
        );
      })}
    </group>
  );
};

// Spider Mite (Acaro) - Tiny red/brown spider-like pest
const SpiderMite = ({ position, scale = 1 }) => {
  const groupRef = useRef();
  const moveOffset = useRef(Math.random() * 100);

  useFrame((state) => {
    const time = state.clock.elapsedTime + moveOffset.current;

    if (groupRef.current) {
      // Scuttling motion
      groupRef.current.position.y += Math.sin(time * 8) * 0.0005;
      groupRef.current.rotation.y += 0.01;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Body (very small) */}
      <mesh castShadow>
        <sphereGeometry args={[0.008, 10, 10]} />
        <meshStandardMaterial
          color={0x8b2e0a}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Legs (8 like a spider) */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i / 4) * Math.PI * 2;
        const legLength = 0.015;
        return (
          <React.Fragment key={`leg-${i}`}>
            {/* Left leg */}
            <mesh
              position={[
                Math.cos(angle) * 0.006,
                -0.003,
                Math.sin(angle) * 0.006
              ]}
              rotation={[0.7, angle, 0]}
            >
              <cylinderGeometry args={[0.0002, 0.0002, legLength, 4]} />
              <meshStandardMaterial color={0x6b1e0a} />
            </mesh>
            {/* Right leg */}
            <mesh
              position={[
                Math.cos(angle + Math.PI) * 0.006,
                -0.003,
                Math.sin(angle + Math.PI) * 0.006
              ]}
              rotation={[0.7, angle + Math.PI, 0]}
            >
              <cylinderGeometry args={[0.0002, 0.0002, legLength, 4]} />
              <meshStandardMaterial color={0x6b1e0a} />
            </mesh>
          </React.Fragment>
        );
      })}
    </group>
  );
};

// Caterpillar (Bruco) - Segmented green worm
const Caterpillar = ({ position, scale = 1 }) => {
  const groupRef = useRef();
  const segmentRefs = useRef([]);
  const moveOffset = useRef(Math.random() * 100);

  useFrame((state) => {
    const time = state.clock.elapsedTime + moveOffset.current;

    // Undulating motion
    segmentRefs.current.forEach((segment, i) => {
      if (segment) {
        segment.position.y = Math.sin(time * 4 + i * 0.5) * 0.003;
        segment.rotation.x = Math.sin(time * 4 + i * 0.5) * 0.1;
      }
    });

    // Slow forward movement
    if (groupRef.current) {
      groupRef.current.position.z += Math.sin(time * 2) * 0.0001;
    }
  });

  const segments = 8;

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Body segments */}
      {Array.from({ length: segments }).map((_, i) => (
        <group
          key={`segment-${i}`}
          ref={(el) => (segmentRefs.current[i] = el)}
          position={[0, 0, i * 0.015]}
        >
          <mesh castShadow>
            <sphereGeometry args={[0.01 + (i === 0 ? 0.002 : 0), 12, 12]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? 0x5a7a3a : 0x6a8a4a}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>

          {/* Legs on middle segments */}
          {i > 1 && i < segments - 1 && (
            <>
              <mesh position={[0.008, -0.008, 0]} rotation={[0.5, 0, 0.8]}>
                <cylinderGeometry args={[0.0004, 0.0004, 0.008, 4]} />
                <meshStandardMaterial color={0x3a5a2a} />
              </mesh>
              <mesh position={[-0.008, -0.008, 0]} rotation={[0.5, 0, -0.8]}>
                <cylinderGeometry args={[0.0004, 0.0004, 0.008, 4]} />
                <meshStandardMaterial color={0x3a5a2a} />
              </mesh>
            </>
          )}

          {/* Head details */}
          {i === 0 && (
            <>
              {/* Eyes */}
              <mesh position={[0.005, 0.005, 0.008]}>
                <sphereGeometry args={[0.001, 6, 6]} />
                <meshBasicMaterial color={0x000000} />
              </mesh>
              <mesh position={[-0.005, 0.005, 0.008]}>
                <sphereGeometry args={[0.001, 6, 6]} />
                <meshBasicMaterial color={0x000000} />
              </mesh>

              {/* Mandibles */}
              <mesh position={[0.003, -0.002, 0.011]} rotation={[0, 0.3, 0]}>
                <boxGeometry args={[0.001, 0.002, 0.003]} />
                <meshStandardMaterial color={0x2a3a1a} />
              </mesh>
              <mesh position={[-0.003, -0.002, 0.011]} rotation={[0, -0.3, 0]}>
                <boxGeometry args={[0.001, 0.002, 0.003]} />
                <meshStandardMaterial color={0x2a3a1a} />
              </mesh>
            </>
          )}
        </group>
      ))}
    </group>
  );
};

// Whitefly (Mosca bianca) - Small white flying insect
const Whitefly = ({ position, scale = 1 }) => {
  const groupRef = useRef();
  const wingLeftRef = useRef();
  const wingRightRef = useRef();
  const moveOffset = useRef(Math.random() * 100);

  useFrame((state) => {
    const time = state.clock.elapsedTime + moveOffset.current;

    // Flying motion
    if (groupRef.current) {
      groupRef.current.position.y += Math.sin(time * 10) * 0.002;
      groupRef.current.position.x += Math.sin(time * 3) * 0.001;
      groupRef.current.position.z += Math.cos(time * 3) * 0.001;
      groupRef.current.rotation.y += 0.02;
    }

    // Wing flapping
    if (wingLeftRef.current && wingRightRef.current) {
      const flapAngle = Math.sin(time * 20) * 0.5;
      wingLeftRef.current.rotation.y = -Math.PI / 4 + flapAngle;
      wingRightRef.current.rotation.y = Math.PI / 4 - flapAngle;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Body */}
      <mesh castShadow>
        <sphereGeometry args={[0.008, 10, 10]} />
        <meshStandardMaterial
          color={0xf5f5dc}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0, 0.008]} castShadow>
        <sphereGeometry args={[0.004, 8, 8]} />
        <meshStandardMaterial
          color={0xe5e5cc}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      {/* Eyes */}
      <mesh position={[0.002, 0.002, 0.011]}>
        <sphereGeometry args={[0.001, 6, 6]} />
        <meshBasicMaterial color={0x8b0000} />
      </mesh>
      <mesh position={[-0.002, 0.002, 0.011]}>
        <sphereGeometry args={[0.001, 6, 6]} />
        <meshBasicMaterial color={0x8b0000} />
      </mesh>

      {/* Wings */}
      <group ref={wingLeftRef} position={[0.003, 0.002, 0]}>
        <mesh rotation={[0, -Math.PI / 4, 0.2]} castShadow>
          <boxGeometry args={[0.02, 0.001, 0.015]} />
          <meshPhysicalMaterial
            color={0xffffff}
            transparent={true}
            opacity={0.6}
            transmission={0.3}
            roughness={0.1}
            metalness={0.5}
            clearcoat={1}
          />
        </mesh>
      </group>
      <group ref={wingRightRef} position={[-0.003, 0.002, 0]}>
        <mesh rotation={[0, Math.PI / 4, -0.2]} castShadow>
          <boxGeometry args={[0.02, 0.001, 0.015]} />
          <meshPhysicalMaterial
            color={0xffffff}
            transparent={true}
            opacity={0.6}
            transmission={0.3}
            roughness={0.1}
            metalness={0.5}
            clearcoat={1}
          />
        </mesh>
      </group>

      {/* Legs */}
      {[0, 1, 2].map((i) => (
        <React.Fragment key={`leg-${i}`}>
          <mesh
            position={[0.005, -0.006, i * 0.004 - 0.004]}
            rotation={[0.5, 0.3, 0.8]}
          >
            <cylinderGeometry args={[0.0002, 0.0002, 0.008, 4]} />
            <meshStandardMaterial color={0xd5d5bc} />
          </mesh>
          <mesh
            position={[-0.005, -0.006, i * 0.004 - 0.004]}
            rotation={[0.5, -0.3, -0.8]}
          >
            <cylinderGeometry args={[0.0002, 0.0002, 0.008, 4]} />
            <meshStandardMaterial color={0xd5d5bc} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

// Thrips - Elongated slender insect
const Thrips = ({ position, scale = 1 }) => {
  const groupRef = useRef();
  const moveOffset = useRef(Math.random() * 100);

  useFrame((state) => {
    const time = state.clock.elapsedTime + moveOffset.current;

    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(time * 5) * 0.2;
      groupRef.current.position.y += Math.sin(time * 8) * 0.001;
    }
  });

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Elongated body */}
      <mesh castShadow>
        <cylinderGeometry args={[0.002, 0.002, 0.025, 8]} />
        <meshStandardMaterial
          color={0x3a2a1a}
          roughness={0.7}
          metalness={0.2}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 0.014, 0]} castShadow>
        <sphereGeometry args={[0.003, 8, 8]} />
        <meshStandardMaterial
          color={0x2a1a0a}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Thin wings */}
      <mesh position={[0.004, 0, 0]} rotation={[0, 0, 0.3]} castShadow>
        <boxGeometry args={[0.015, 0.001, 0.004]} />
        <meshPhysicalMaterial
          color={0xcccccc}
          transparent={true}
          opacity={0.5}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[-0.004, 0, 0]} rotation={[0, 0, -0.3]} castShadow>
        <boxGeometry args={[0.015, 0.001, 0.004]} />
        <meshPhysicalMaterial
          color={0xcccccc}
          transparent={true}
          opacity={0.5}
          roughness={0.2}
        />
      </mesh>

      {/* Tiny legs */}
      {[0, 1, 2].map((i) => (
        <React.Fragment key={`leg-${i}`}>
          <mesh
            position={[0.002, -0.008 + i * 0.008, 0]}
            rotation={[0.5, 0, 0.8]}
          >
            <cylinderGeometry args={[0.0001, 0.0001, 0.006, 4]} />
            <meshStandardMaterial color={0x2a1a0a} />
          </mesh>
          <mesh
            position={[-0.002, -0.008 + i * 0.008, 0]}
            rotation={[0.5, 0, -0.8]}
          >
            <cylinderGeometry args={[0.0001, 0.0001, 0.006, 4]} />
            <meshStandardMaterial color={0x2a1a0a} />
          </mesh>
        </React.Fragment>
      ))}
    </group>
  );
};

// Main Pests Component - Manages all pest instances
const Pests3D = ({ pestData = [] }) => {
  return (
    <group>
      {pestData.map((pest, idx) => {
        const Component = {
          aphid: Aphid,
          spiderMite: SpiderMite,
          caterpillar: Caterpillar,
          whitefly: Whitefly,
          thrips: Thrips
        }[pest.type];

        return Component ? (
          <Component
            key={`pest-${pest.type}-${idx}`}
            position={pest.position}
            scale={pest.scale || 1}
            movePattern={pest.movePattern}
          />
        ) : null;
      })}
    </group>
  );
};

export default Pests3D;
export { Aphid, SpiderMite, Caterpillar, Whitefly, Thrips };
