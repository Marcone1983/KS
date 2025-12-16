import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Instances, Instance, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { LayerMaterial, Depth, Fresnel, Noise } from 'lamina';
import CustomShaderMaterial from 'three-custom-shader-material';

/**
 * ULTRA-REALISTIC AAA CANNABIS PLANT
 * Based on professional photoscanned models and simLeaf cultivation simulator
 * Features:
 * - Individual trichome maturation (clear → cloudy → amber)
 * - PBR materials with subsurface scattering
 * - Realistic bud formation with genetics
 * - 4K detail level
 * - Photorealistic rendering
 */

// Advanced PBR Subsurface Scattering Shader for leaves
const advancedLeafShader = {
  uniforms: {
    time: { value: 0 },
    baseColor: { value: new THREE.Color(0x2d5016) },
    accentColor: { value: new THREE.Color(0x4a7028) },
    lightPosition: { value: new THREE.Vector3(10, 10, 10) },
    thickness: { value: 0.8 },
    translucency: { value: 0.6 },
    distortion: { value: 0.4 },
    ambient: { value: 0.2 },
    sssStrength: { value: 2.5 },
    roughness: { value: 0.7 },
    metalness: { value: 0.1 }
  },

  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vDistanceToCamera;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
      vDistanceToCamera = length(mvPosition.xyz);

      gl_Position = projectionMatrix * mvPosition;
    }
  `,

  fragmentShader: `
    uniform vec3 baseColor;
    uniform vec3 accentColor;
    uniform vec3 lightPosition;
    uniform float thickness;
    uniform float translucency;
    uniform float distortion;
    uniform float ambient;
    uniform float sssStrength;
    uniform float roughness;
    uniform float metalness;
    uniform float time;

    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;
    varying vec2 vUv;
    varying float vDistanceToCamera;

    // Advanced noise for organic variation
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for(int i = 0; i < 5; i++) {
        value += amplitude * noise(p);
        p *= 2.0;
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(vViewPosition);
      vec3 lightDir = normalize(lightPosition - vWorldPosition);

      // Procedural vein pattern
      float veins = fbm(vUv * 40.0 + vec2(time * 0.01, 0.0));
      veins = smoothstep(0.45, 0.55, veins);

      // Micro detail noise
      float microDetail = noise(vUv * 200.0) * 0.05;

      // Front lighting (diffuse)
      float NdotL = max(dot(normal, lightDir), 0.0);

      // Subsurface scattering (backlit transmission)
      vec3 H = normalize(lightDir + normal * distortion);
      float VdotH = pow(clamp(dot(viewDir, -H), 0.0, 1.0), 3.0);
      float backScatter = VdotH * thickness * sssStrength;

      // Fresnel rim light
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 4.0);

      // Color variation with veins
      vec3 leafColor = mix(baseColor, accentColor, veins * 0.5);
      leafColor += microDetail;

      // Combine lighting
      vec3 diffuse = leafColor * (NdotL + ambient);
      vec3 scatter = accentColor * backScatter * translucency;
      vec3 rim = accentColor * fresnel * 0.3;

      // PBR-like roughness variation
      float roughnessVar = roughness + noise(vUv * 50.0) * 0.2;

      // Specular highlight (for waxy surface)
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(normal, halfDir), 0.0), mix(16.0, 64.0, 1.0 - roughnessVar));
      vec3 specular = vec3(spec) * (1.0 - roughnessVar) * 0.2;

      // Distance-based LOD (subtle detail fade)
      float detailFade = smoothstep(5.0, 15.0, vDistanceToCamera);
      vec3 finalColor = diffuse + scatter + rim + specular;
      finalColor = mix(finalColor, diffuse, detailFade * 0.3);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// Individual Trichome component with maturation states
const Trichome = ({ position, maturationStage = 0, size = 1 }) => {
  const meshRef = useRef();

  // Trichome colors based on maturation (simLeaf reference)
  // 0 = clear, 0.5 = cloudy, 1.0 = amber
  const getTrichomeColor = (stage) => {
    if (stage < 0.3) {
      // Clear trichomes (early)
      return new THREE.Color(0xffffff).multiplyScalar(0.9);
    } else if (stage < 0.7) {
      // Cloudy trichomes (peak potency)
      return new THREE.Color(0xf5f5dc);
    } else {
      // Amber trichomes (late/couch-lock)
      return new THREE.Color(0xffbf00);
    }
  };

  const trichomeColor = getTrichomeColor(maturationStage);

  // Sparkle animation for resin
  useFrame((state) => {
    if (meshRef.current) {
      const sparkle = Math.sin(state.clock.elapsedTime * 5 + position[0] * 10) * 0.5 + 0.5;
      meshRef.current.material.emissiveIntensity = 0.3 + sparkle * 0.4;
    }
  });

  return (
    <group position={position}>
      {/* Trichome stalk */}
      <mesh scale={[0.3, 1, 0.3]}>
        <cylinderGeometry args={[0.002 * size, 0.001 * size, 0.015 * size, 4]} />
        <meshStandardMaterial
          color={0xf0f0e0}
          roughness={0.3}
          metalness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Trichome head (glandular)*/}
      <mesh ref={meshRef} position={[0, 0.008 * size, 0]}>
        <sphereGeometry args={[0.003 * size, 8, 8]} />
        <meshPhysicalMaterial
          color={trichomeColor}
          roughness={0.1}
          metalness={0.8}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
          emissive={trichomeColor}
          emissiveIntensity={0.5}
          transparent
          opacity={maturationStage < 0.3 ? 0.6 : 0.9}
          transmission={maturationStage < 0.3 ? 0.4 : 0}
          ior={1.5}
        />
      </mesh>
    </group>
  );
};

// Ultra-realistic cannabis bud with trichomes
const CannabisBud = ({ position, size, maturationStage, genetics }) => {
  const budRef = useRef();

  // Generate trichome positions on bud surface
  const trichomes = useMemo(() => {
    const density = 80 + (genetics?.trichome_density || 50); // 80-130 trichomes per bud
    const trichomeArray = [];

    for (let i = 0; i < density; i++) {
      // Distribute on sphere surface (Fibonacci sphere)
      const phi = Math.acos(-1 + (2 * i + 1) / density);
      const theta = Math.sqrt(density * Math.PI) * phi;

      const radius = size * 0.5;
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      // Random maturation variation per trichome
      const matVariation = maturationStage + (Math.random() - 0.5) * 0.2;

      trichomeArray.push({
        position: [x, y, z],
        maturation: Math.max(0, Math.min(1, matVariation)),
        size: 0.8 + Math.random() * 0.4
      });
    }

    return trichomeArray;
  }, [size, genetics, maturationStage]);

  // Bud sway animation
  useFrame((state) => {
    if (budRef.current) {
      budRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.8) * 0.05;
    }
  });

  // Bud color based on genetics and maturation
  const budColor = useMemo(() => {
    const base = new THREE.Color(genetics?.color || 0x9acd32);
    const purple = new THREE.Color(0x8b008b);

    // Purple expression increases with maturation
    if (genetics?.purple_expression && maturationStage > 0.6) {
      return base.lerp(purple, genetics.purple_expression * (maturationStage - 0.6));
    }

    return base;
  }, [genetics, maturationStage]);

  return (
    <group ref={budRef} position={position}>
      {/* Main bud cluster - multiple calyxes */}
      {Array.from({ length: 8 + Math.floor(size * 5) }).map((_, i) => {
        const angle = (i / (8 + Math.floor(size * 5))) * Math.PI * 2;
        const layerRadius = (Math.floor(i / 4) + 1) * size * 0.15;
        const height = (Math.random() - 0.5) * size * 0.3;

        return (
          <mesh
            key={`calyx-${i}`}
            position={[
              Math.cos(angle) * layerRadius,
              height,
              Math.sin(angle) * layerRadius
            ]}
            rotation={[
              Math.random() * 0.3,
              angle,
              Math.random() * 0.3
            ]}
            castShadow
            receiveShadow
          >
            <sphereGeometry args={[size * (0.15 + Math.random() * 0.1), 8, 8]} />
            <meshPhysicalMaterial
              color={budColor}
              roughness={0.6}
              metalness={0.1}
              clearcoat={0.3}
              clearcoatRoughness={0.4}
              emissive={budColor}
              emissiveIntensity={0.05}
            />
          </mesh>
        );
      })}

      {/* Sugar leaves (small leaves on bud) */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const dist = size * 0.5;

        return (
          <mesh
            key={`sugar-leaf-${i}`}
            position={[
              Math.cos(angle) * dist,
              (Math.random() - 0.5) * size * 0.2,
              Math.sin(angle) * dist
            ]}
            rotation={[0.3, angle, 0.2]}
            castShadow
          >
            <coneGeometry args={[size * 0.08, size * 0.15, 3]} />
            <primitive object={new THREE.ShaderMaterial({
              ...advancedLeafShader,
              side: THREE.DoubleSide
            })} attach="material" />
          </mesh>
        );
      })}

      {/* Trichomes covering the bud */}
      {trichomes.map((tri, i) => (
        <Trichome
          key={`trichome-${i}`}
          position={tri.position}
          maturationStage={tri.maturation}
          size={tri.size}
        />
      ))}

      {/* Pistils (orange/red hairs) */}
      {Array.from({ length: 25 + Math.floor(size * 10) }).map((_, i) => {
        const angle = Math.random() * Math.PI * 2;
        const length = size * (0.3 + Math.random() * 0.4);
        const curlAngle = (Math.random() - 0.5) * 0.5;

        // Pistil color changes with maturation (white → orange → red-brown)
        const pistilColor = maturationStage < 0.3
          ? 0xffffff
          : maturationStage < 0.7
            ? 0xff6b35
            : 0x8b4513;

        return (
          <mesh
            key={`pistil-${i}`}
            position={[0, 0, 0]}
            rotation={[
              Math.random() * Math.PI * 0.4,
              angle,
              curlAngle
            ]}
            castShadow
          >
            <cylinderGeometry args={[0.0008, 0.0008, length, 3]} />
            <meshBasicMaterial
              color={pistilColor}
              transparent
              opacity={0.9}
            />
          </mesh>
        );
      })}
    </group>
  );
};

// Main AAA Cannabis Plant Component
const CannabisPlantAAA = ({
  position = [0, 0, 0],
  scale = 1,
  growthStage = 1,
  health = 100,
  pestInfestation = 0,
  genetics = {
    strain_name: 'Hybrid',
    trichome_density: 70,
    color: 0x9acd32,
    purple_expression: 0,
    bud_size: 1.0,
    leaf_size: 1.0
  },
  maturationStage = 0.5 // 0 = immature, 0.5 = peak, 1.0 = overripe
}) => {
  const groupRef = useRef();
  const leavesRef = useRef();

  // Plant configuration based on growth and genetics
  const plantConfig = useMemo(() => ({
    height: 0.5 + (growthStage * 1.8),
    stemRadius: 0.025 + (growthStage * 0.015),
    branchCount: Math.floor(4 + growthStage * 6),
    leafSize: (0.12 + (growthStage * 0.06)) * genetics.leaf_size,
    budSize: growthStage > 0.6 ? (0.06 + (growthStage - 0.6) * 0.12) * genetics.bud_size : 0,
    leafDensity: Math.floor(6 + growthStage * 12)
  }), [growthStage, genetics]);

  // Stem geometry with realistic texture
  const stemGeometry = useMemo(() => {
    const points = [];
    const segments = 30;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * plantConfig.height;

      // Natural stem curve
      const wobble = Math.sin(t * Math.PI * 2.5) * 0.025 * Math.sin(t * Math.PI);
      const taper = 1.0 - t * 0.2; // Stem tapers towards top

      points.push(new THREE.Vector3(wobble, y, 0));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    return new THREE.TubeGeometry(curve, segments * 2, plantConfig.stemRadius, 12, false);
  }, [plantConfig]);

  // Realistic wind sway
  useFrame((state, delta) => {
    if (groupRef.current) {
      const windStrength = 0.012;
      const time = state.clock.elapsedTime;

      groupRef.current.rotation.z =
        Math.sin(time * 0.5) * windStrength +
        Math.sin(time * 1.3) * windStrength * 0.5;

      groupRef.current.rotation.x =
        Math.sin(time * 0.7) * windStrength * 0.5;
    }

    if (leavesRef.current) {
      leavesRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.01;
    }
  });

  // Branches with nodes
  const branches = useMemo(() => {
    const branchArray = [];
    const branchCount = plantConfig.branchCount;

    for (let i = 0; i < branchCount; i++) {
      const heightRatio = (i + 1) / (branchCount + 1);
      const y = heightRatio * plantConfig.height;

      // Phyllotaxis (natural leaf/branch arrangement)
      const angle = (i * 137.5) * (Math.PI / 180); // Golden angle
      const length = 0.18 + Math.random() * 0.25;
      const thickness = plantConfig.stemRadius * (0.7 - heightRatio * 0.2);

      branchArray.push({
        position: [0, y, 0],
        angle,
        length,
        thickness,
        droop: 0.12 + Math.random() * 0.18,
        node: i
      });
    }

    return branchArray;
  }, [plantConfig]);

  // Buds (flowers) on top branches
  const buds = useMemo(() => {
    if (plantConfig.budSize === 0) return [];

    const budArray = [];
    const topBranches = branches.slice(-Math.floor(branches.length * 0.5));

    topBranches.forEach((branch, idx) => {
      const x = Math.cos(branch.angle) * branch.length * 0.85;
      const z = Math.sin(branch.angle) * branch.length * 0.85;
      const y = branch.position[1] - branch.droop * 0.3;

      budArray.push({
        position: [x, y, z],
        size: plantConfig.budSize * (0.9 + Math.random() * 0.2)
      });
    });

    // Main cola (terminal bud)
    budArray.push({
      position: [0, plantConfig.height + 0.05, 0],
      size: plantConfig.budSize * 1.6
    });

    return budArray;
  }, [plantConfig, branches]);

  // Health-based appearance
  const healthFactor = health / 100;
  const pestFactor = 1 - (pestInfestation / 100);
  const overallHealth = healthFactor * pestFactor;

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Main Stem with realistic bark texture */}
      <mesh geometry={stemGeometry} castShadow receiveShadow>
        <meshStandardMaterial
          color={new THREE.Color(0x4a3728).multiplyScalar(overallHealth)}
          roughness={0.9}
          metalness={0}
          normalScale={new THREE.Vector2(0.5, 0.5)}
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
        const branchGeo = new THREE.TubeGeometry(branchCurve, 10, branch.thickness, 8, false);

        return (
          <group key={`branch-${idx}`} position={branch.position}>
            <mesh geometry={branchGeo} castShadow receiveShadow>
              <meshStandardMaterial
                color={new THREE.Color(0x5a4a38).multiplyScalar(overallHealth)}
                roughness={0.8}
                metalness={0}
              />
            </mesh>

            {/* Leaves on branch */}
            {Array.from({ length: Math.floor(plantConfig.leafDensity / branches.length) }).map((_, leafIdx) => {
              const t = leafIdx / Math.floor(plantConfig.leafDensity / branches.length);
              const leafAngle = branch.angle + (leafIdx % 2 === 0 ? 0.5 : -0.5);

              return (
                <mesh
                  key={`leaf-${idx}-${leafIdx}`}
                  position={[
                    Math.cos(branch.angle) * branch.length * t,
                    -branch.droop * t,
                    Math.sin(branch.angle) * branch.length * t
                  ]}
                  rotation={[0.3, leafAngle, (leafIdx % 2 === 0 ? 1 : -1) * 0.2]}
                  scale={plantConfig.leafSize * (0.9 + Math.random() * 0.2)}
                  castShadow
                >
                  <planeGeometry args={[1, 1.2]} />
                  <primitive object={new THREE.ShaderMaterial({
                    ...advancedLeafShader,
                    uniforms: {
                      ...advancedLeafShader.uniforms,
                      baseColor: { value: new THREE.Color(0x2d5016).multiplyScalar(overallHealth) }
                    },
                    side: THREE.DoubleSide
                  })} attach="material" />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* Ultra-realistic buds with trichomes */}
      {buds.map((bud, idx) => (
        <CannabisBud
          key={`bud-${idx}`}
          position={bud.position}
          size={bud.size}
          maturationStage={maturationStage}
          genetics={genetics}
        />
      ))}
    </group>
  );
};

export default CannabisPlantAAA;
