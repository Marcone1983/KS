import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { LayerMaterial, Depth, Fresnel } from 'lamina';

const CannabisPlant3D = ({
  position = [0, 0, 0],
  scale = 1,
  growthStage = 1,
  health = 100,
  pestInfestation = 0
}) => {
  const groupRef = useRef();
  const leavesRef = useRef();

  // Plant parameters based on growth stage
  const plantConfig = useMemo(() => ({
    height: 0.5 + (growthStage * 1.5),
    stemRadius: 0.02 + (growthStage * 0.01),
    branchCount: Math.floor(3 + growthStage * 5),
    leafSize: 0.1 + (growthStage * 0.05),
    budSize: growthStage > 0.6 ? 0.05 + (growthStage - 0.6) * 0.1 : 0,
    leafDensity: Math.floor(5 + growthStage * 10)
  }), [growthStage]);

  // Generate stem geometry
  const stemGeometry = useMemo(() => {
    const points = [];
    const segments = 20;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * plantConfig.height;
      const wobble = Math.sin(t * Math.PI * 3) * 0.02;
      points.push(new THREE.Vector3(wobble, y, 0));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, segments * 2, plantConfig.stemRadius, 8, false);
  }, [plantConfig]);

  // Generate branch positions
  const branches = useMemo(() => {
    const branchArray = [];
    const branchCount = plantConfig.branchCount;

    for (let i = 0; i < branchCount; i++) {
      const heightRatio = (i + 1) / (branchCount + 1);
      const y = heightRatio * plantConfig.height;
      const angle = (i * 137.5) * (Math.PI / 180); // Golden angle for natural distribution
      const length = 0.15 + Math.random() * 0.2;
      const thickness = plantConfig.stemRadius * 0.6;

      branchArray.push({
        position: [0, y, 0],
        angle,
        length,
        thickness,
        droop: 0.1 + Math.random() * 0.15
      });
    }

    return branchArray;
  }, [plantConfig]);

  // Generate single cannabis leaf shape
  const createLeafShape = (size) => {
    const shape = new THREE.Shape();
    const fingers = 7; // Classic 7-finger cannabis leaf
    const fingerWidth = size * 0.15;
    const fingerLength = size;

    shape.moveTo(0, 0);

    for (let i = 0; i < fingers; i++) {
      const angleOffset = ((i - (fingers - 1) / 2) / fingers) * Math.PI * 0.6;
      const x = Math.sin(angleOffset) * fingerWidth * (i === Math.floor(fingers / 2) ? 1 : 0.8);
      const y = fingerLength * (1 - Math.abs(angleOffset) * 0.4);

      if (i === 0) {
        shape.lineTo(x - fingerWidth * 0.5, y);
      } else {
        shape.quadraticCurveTo(
          x - fingerWidth * 0.3, y * 0.95,
          x, y
        );
      }

      shape.quadraticCurveTo(
        x + fingerWidth * 0.3, y * 0.95,
        x + fingerWidth * 0.5, y * 0.85
      );
    }

    for (let i = fingers - 1; i >= 0; i--) {
      const angleOffset = ((i - (fingers - 1) / 2) / fingers) * Math.PI * 0.6;
      const x = -Math.sin(angleOffset) * fingerWidth * (i === Math.floor(fingers / 2) ? 1 : 0.8);
      const y = fingerLength * (1 - Math.abs(angleOffset) * 0.4);

      shape.quadraticCurveTo(
        x - fingerWidth * 0.3, y * 0.95,
        x - fingerWidth * 0.5, y * 0.85
      );
    }

    shape.lineTo(0, 0);

    const extrudeSettings = {
      steps: 1,
      depth: 0.002,
      bevelEnabled: true,
      bevelThickness: 0.001,
      bevelSize: 0.001,
      bevelSegments: 2
    };

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  };

  // Generate leaf data for instancing
  const leafData = useMemo(() => {
    const leaves = [];

    branches.forEach((branch, branchIdx) => {
      const leavesPerBranch = Math.floor(plantConfig.leafDensity / branches.length);

      for (let i = 0; i < leavesPerBranch; i++) {
        const t = i / leavesPerBranch;
        const x = Math.cos(branch.angle) * branch.length * t;
        const z = Math.sin(branch.angle) * branch.length * t;
        const y = branch.position[1] - branch.droop * t * branch.length;

        const rotation = [
          (Math.random() - 0.5) * 0.3,
          branch.angle + (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.2 - t * 0.3
        ];

        const scale = plantConfig.leafSize * (0.8 + Math.random() * 0.4) * (1 - t * 0.2);

        leaves.push({
          position: [x, y, z],
          rotation,
          scale
        });
      }
    });

    return leaves;
  }, [branches, plantConfig]);

  // Generate buds/flowers for mature plants
  const buds = useMemo(() => {
    if (plantConfig.budSize === 0) return [];

    const budArray = [];
    const topBranches = branches.slice(-Math.floor(branches.length * 0.4));

    topBranches.forEach(branch => {
      const x = Math.cos(branch.angle) * branch.length * 0.9;
      const z = Math.sin(branch.angle) * branch.length * 0.9;
      const y = branch.position[1];

      budArray.push({
        position: [x, y, z],
        scale: plantConfig.budSize
      });
    });

    // Main cola (top bud)
    budArray.push({
      position: [0, plantConfig.height, 0],
      scale: plantConfig.budSize * 1.5
    });

    return budArray;
  }, [plantConfig, branches]);

  // Gentle animation for natural movement
  useFrame((state, delta) => {
    if (leavesRef.current) {
      leavesRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }

    if (groupRef.current) {
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.01;
    }
  });

  // Health-based color adjustments
  const leafColor = useMemo(() => {
    const healthFactor = health / 100;
    const pestFactor = 1 - (pestInfestation / 100);

    const baseGreen = new THREE.Color(0x2d5016);
    const unhealthyYellow = new THREE.Color(0x8b7d3a);

    return baseGreen.lerp(unhealthyYellow, 1 - (healthFactor * pestFactor));
  }, [health, pestInfestation]);

  const leafGeometry = useMemo(() => createLeafShape(1), []);

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Main Stem */}
      <mesh geometry={stemGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={0x4a3728}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Branches */}
      {branches.map((branch, idx) => {
        const branchPoints = [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(
            Math.cos(branch.angle) * branch.length * 0.5,
            -branch.droop * 0.5,
            Math.sin(branch.angle) * branch.length * 0.5
          ),
          new THREE.Vector3(
            Math.cos(branch.angle) * branch.length,
            -branch.droop,
            Math.sin(branch.angle) * branch.length
          )
        ];

        const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
        const branchGeo = new THREE.TubeGeometry(branchCurve, 8, branch.thickness, 6, false);

        return (
          <mesh
            key={`branch-${idx}`}
            geometry={branchGeo}
            position={branch.position}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial
              color={0x5a4a38}
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
        );
      })}

      {/* Leaves using instancing for performance */}
      <group ref={leavesRef}>
        <Instances limit={leafData.length} geometry={leafGeometry} castShadow receiveShadow>
          <LayerMaterial side={THREE.DoubleSide}>
            <Depth
              colorA={leafColor}
              colorB={new THREE.Color(leafColor).multiplyScalar(0.7)}
              alpha={1}
              mode="normal"
              near={0}
              far={2}
              origin={[0, 0, 0]}
            />
            <Fresnel
              mode="softlight"
              color={new THREE.Color(0xffffff)}
              intensity={0.3}
              power={2}
              bias={0.05}
            />
          </LayerMaterial>

          {leafData.map((leaf, idx) => (
            <Instance
              key={`leaf-${idx}`}
              position={leaf.position}
              rotation={leaf.rotation}
              scale={leaf.scale}
            />
          ))}
        </Instances>
      </group>

      {/* Buds/Flowers */}
      {buds.map((bud, idx) => (
        <group key={`bud-${idx}`} position={bud.position}>
          {/* Bud cluster made of multiple small spheres */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const radius = bud.scale * 0.4;
            const height = (Math.random() - 0.5) * bud.scale * 0.3;

            return (
              <mesh
                key={`bud-sphere-${i}`}
                position={[
                  Math.cos(angle) * radius * Math.random(),
                  height,
                  Math.sin(angle) * radius * Math.random()
                ]}
                castShadow
              >
                <sphereGeometry args={[bud.scale * (0.3 + Math.random() * 0.2), 8, 8]} />
                <meshStandardMaterial
                  color={0x9acd32}
                  roughness={0.6}
                  metalness={0.1}
                  emissive={0x4a6e1a}
                  emissiveIntensity={0.2}
                />
              </mesh>
            );
          })}

          {/* Pistils (orange hairs) */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const length = bud.scale * (0.5 + Math.random() * 0.3);

            return (
              <mesh
                key={`pistil-${i}`}
                position={[0, 0, 0]}
                rotation={[
                  Math.random() * Math.PI * 0.3,
                  angle,
                  Math.random() * Math.PI * 0.3
                ]}
              >
                <cylinderGeometry args={[0.001, 0.001, length, 3]} />
                <meshBasicMaterial color={0xff6b35} />
              </mesh>
            );
          })}

          {/* Trichomes (crystals) - only on mature buds */}
          {growthStage > 0.8 && Array.from({ length: 30 }).map((_, i) => {
            const angle = Math.random() * Math.PI * 2;
            const radius = bud.scale * Math.random() * 0.5;
            const height = (Math.random() - 0.5) * bud.scale * 0.4;

            return (
              <mesh
                key={`trichome-${i}`}
                position={[
                  Math.cos(angle) * radius,
                  height,
                  Math.sin(angle) * radius
                ]}
                scale={0.01}
              >
                <sphereGeometry args={[1, 6, 6]} />
                <meshStandardMaterial
                  color={0xffffff}
                  roughness={0.1}
                  metalness={0.9}
                  emissive={0xffffff}
                  emissiveIntensity={0.5}
                  transparent
                  opacity={0.8}
                />
              </mesh>
            );
          })}
        </group>
      ))}

      {/* Roots (visible if plant is young or damaged) */}
      {(growthStage < 0.3 || health < 50) && (
        <group position={[0, 0, 0]}>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const rootPoints = [
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(
                Math.cos(angle) * 0.1,
                -0.05,
                Math.sin(angle) * 0.1
              ),
              new THREE.Vector3(
                Math.cos(angle) * 0.15,
                -0.1,
                Math.sin(angle) * 0.15
              )
            ];

            const rootCurve = new THREE.CatmullRomCurve3(rootPoints);
            const rootGeo = new THREE.TubeGeometry(rootCurve, 6, 0.005, 4, false);

            return (
              <mesh key={`root-${i}`} geometry={rootGeo}>
                <meshStandardMaterial
                  color={0x6b5744}
                  roughness={0.9}
                  metalness={0}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

export default CannabisPlant3D;
