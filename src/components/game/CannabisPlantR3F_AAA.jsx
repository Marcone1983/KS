import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, MeshRefractionMaterial } from '@react-three/drei';
import * as THREE from 'three';

// GLSL Shader per Subsurface Scattering Avanzato
const advancedLeafShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    uniform float time;
    uniform float windStrength;
    uniform float growthStage;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vPosition = position;
      
      vec3 pos = position;
      
      // Multi-layer wind animation
      float windBase = sin(time * 1.5 + position.x * 3.0) * windStrength;
      float windDetail = sin(time * 3.0 + position.y * 5.0) * windStrength * 0.5;
      float windMicro = sin(time * 6.0 + position.x * 10.0 + position.y * 8.0) * windStrength * 0.25;
      
      float totalWind = (windBase + windDetail + windMicro) * 0.08;
      
      pos.z += totalWind;
      pos.x += totalWind * 0.6;
      pos.y += totalWind * 0.3;
      
      // Growth deformation
      pos *= (0.3 + growthStage * 0.7);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 leafColor;
    uniform vec3 diseaseColor;
    uniform float healthFactor;
    uniform float wetness;
    uniform float growthStage;
    uniform float diseaseLevel;
    uniform float time;
    uniform vec3 lightPosition;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    // Noise function
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(lightPosition - vWorldPosition);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      
      // Diffuse lighting
      float diff = max(dot(normal, lightDir), 0.0);
      
      // Subsurface scattering (light transmission through leaf)
      vec3 backLightDir = -lightDir;
      float backDiff = max(dot(normal, backLightDir), 0.0);
      float subsurface = pow(backDiff, 3.0) * 0.6;
      
      // Fresnel effect
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
      
      // Wetness specular
      float wetSpec = pow(max(dot(normal, halfDir), 0.0), 64.0) * wetness * 0.8;
      
      // Vein pattern (procedural)
      float veinPattern = smoothstep(0.48, 0.52, sin(vUv.y * 25.0 + noise(vUv * 10.0) * 2.0));
      veinPattern += smoothstep(0.47, 0.53, sin(vUv.x * 15.0 + vUv.y * 10.0));
      veinPattern *= 0.2;
      
      // Disease spots (procedural)
      float diseaseSpots = 0.0;
      if (diseaseLevel > 0.0) {
        float spotNoise = noise(vUv * 20.0 + time * 0.1);
        diseaseSpots = smoothstep(0.7, 0.9, spotNoise) * diseaseLevel;
      }
      
      // Color mixing
      vec3 veinColor = vec3(0.2, 0.4, 0.15);
      vec3 baseColor = mix(leafColor, veinColor, veinPattern);
      
      // Apply disease
      baseColor = mix(baseColor, diseaseColor, diseaseSpots);
      
      // Lighting
      vec3 ambient = baseColor * 0.3;
      vec3 diffuse = baseColor * diff * 0.6;
      vec3 scatter = baseColor * subsurface * vec3(0.3, 0.6, 0.2);
      vec3 rim = vec3(0.4, 0.7, 0.3) * fresnel * 0.3;
      
      vec3 finalColor = ambient + diffuse + scatter + rim + vec3(wetSpec);
      
      // Health degradation
      finalColor = mix(finalColor, vec3(0.4, 0.35, 0.2), (1.0 - healthFactor) * 0.6);
      
      gl_FragColor = vec4(finalColor, 0.92 + healthFactor * 0.08);
    }
  `
};

// Shader per Tricomi Cristallini (Trichomes)
const trichomeShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float maturity;
    uniform float time;
    uniform vec3 lightPosition;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      
      // Maturity color transition: clear → cloudy → amber
      vec3 clearColor = vec3(0.95, 0.98, 1.0);
      vec3 cloudyColor = vec3(0.9, 0.92, 0.95);
      vec3 amberColor = vec3(1.0, 0.7, 0.3);
      
      vec3 trichomeColor;
      if (maturity < 0.5) {
        trichomeColor = mix(clearColor, cloudyColor, maturity * 2.0);
      } else {
        trichomeColor = mix(cloudyColor, amberColor, (maturity - 0.5) * 2.0);
      }
      
      // Fresnel refraction
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
      
      // Sparkle effect
      float sparkle = sin(time * 10.0 + vPosition.x * 50.0 + vPosition.y * 50.0);
      sparkle = smoothstep(0.9, 1.0, sparkle) * 0.5;
      
      vec3 finalColor = trichomeColor + vec3(fresnel * 0.4) + vec3(sparkle);
      float opacity = 0.3 + maturity * 0.5 + fresnel * 0.2;
      
      gl_FragColor = vec4(finalColor, opacity);
    }
  `
};

function SerratedLeaf({ length, width, material }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const teeth = 12;
    
    shape.moveTo(0, 0);
    for (let i = 0; i <= teeth; i++) {
      const t = i / teeth;
      const y = t * length;
      const w = Math.sin(t * Math.PI) * width * (1 - t * 0.15);
      const tooth = (i % 2 === 0) ? w * 0.18 : w * 0.02;
      const curve = Math.pow(t, 1.2);
      shape.lineTo(w * curve + tooth, y);
    }
    for (let i = teeth; i >= 0; i--) {
      const t = i / teeth;
      const y = t * length;
      const w = Math.sin(t * Math.PI) * width * (1 - t * 0.15);
      const tooth = (i % 2 === 0) ? w * 0.18 : w * 0.02;
      const curve = Math.pow(t, 1.2);
      shape.lineTo(-w * curve - tooth, y);
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape, 12);
    const pos = geo.attributes.position;
    
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const detail = Math.sin(x * 8) * Math.cos(y * 8) * 0.005;
      const z = (y / length) * 0.025 + Math.abs(x) * 0.018 + detail;
      pos.setZ(i, z);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [length, width]);

  return <primitive object={new THREE.Mesh(geometry, material)} castShadow />;
}

function Trichome({ position, maturity = 0.5, scale = 1 }) {
  const meshRef = useRef();
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        maturity: { value: maturity },
        time: { value: 0 },
        lightPosition: { value: new THREE.Vector3(10, 15, 5) }
      },
      vertexShader: trichomeShader.vertexShader,
      fragmentShader: trichomeShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [maturity]);

  useFrame((state) => {
    if (material) {
      material.uniforms.time.value = state.clock.elapsedTime;
    }
  });

  return (
    <group position={position}>
      <mesh scale={scale * 0.8}>
        <sphereGeometry args={[0.004, 8, 8]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh position-y={-0.006} scale={[scale * 0.3, scale * 0.6, scale * 0.3]}>
        <cylinderGeometry args={[0.002, 0.001, 0.012, 6]} />
        <meshStandardMaterial color={0xd4e8d4} roughness={0.4} />
      </mesh>
    </group>
  );
}

export default function CannabisPlantR3F_AAA({ 
  position = [0, 0, -1.5], 
  health = 100, 
  pestCount = 0, 
  windStrength = 0.2,
  growthStage = 0.8,
  trichomeMaturity = 0.5,
  genetics = {},
  customColors = null,
  rainbow = false
}) {
  const groupRef = useRef();
  const leavesRef = useRef([]);

  const healthFactor = health / 100;
  const infestationFactor = Math.min(pestCount * 5, 100) / 100;
  const diseaseLevel = infestationFactor;

  const leafMaterial = useMemo(() => {
    const baseColor = customColors?.leaf 
      ? new THREE.Color(customColors.leaf) 
      : new THREE.Color(0x3a7d3a);
    const infectedColor = new THREE.Color(0x8b7d3a);
    const leafColor = baseColor.clone().lerp(infectedColor, infestationFactor * 0.6);
    
    return new THREE.ShaderMaterial({
      uniforms: {
        leafColor: { value: leafColor },
        diseaseColor: { value: new THREE.Color(0x6a5a2a) },
        healthFactor: { value: healthFactor },
        wetness: { value: 0.0 },
        growthStage: { value: growthStage },
        diseaseLevel: { value: diseaseLevel },
        windStrength: { value: windStrength },
        time: { value: 0 },
        lightPosition: { value: new THREE.Vector3(10, 15, 5) }
      },
      vertexShader: advancedLeafShader.vertexShader,
      fragmentShader: advancedLeafShader.fragmentShader,
      side: THREE.DoubleSide,
      transparent: true
    });
  }, [healthFactor, infestationFactor, windStrength, growthStage, customColors]);

  useFrame((state) => {
    if (leafMaterial) {
      leafMaterial.uniforms.time.value = state.clock.elapsedTime;
      leafMaterial.uniforms.windStrength.value = windStrength;
      
      if (rainbow) {
        const hue = (state.clock.elapsedTime * 0.1) % 1;
        const rainbowColor = new THREE.Color().setHSL(hue, 0.8, 0.5);
        leafMaterial.uniforms.leafColor.value = rainbowColor;
      }
    }
    
    if (groupRef.current) {
      const sway = Math.sin(state.clock.elapsedTime * 0.8) * windStrength * 0.015;
      groupRef.current.rotation.y = sway;
      groupRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 0.6) * windStrength * 0.008;
    }
  });

  const stemMaterial = useMemo(() => {
    const baseStemColor = customColors?.stem 
      ? new THREE.Color(customColors.stem) 
      : new THREE.Color(0x5a7d4a);
    return new THREE.MeshStandardMaterial({
      color: baseStemColor.clone().lerp(new THREE.Color(0x4a3a2a), diseaseLevel * 0.4),
      roughness: 0.85,
      metalness: 0.0,
      normalScale: new THREE.Vector2(0.5, 0.5)
    });
  }, [diseaseLevel, customColors]);

  const budMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xa08555).lerp(new THREE.Color(0x8b7355), trichomeMaturity),
    roughness: 0.45,
    metalness: 0.1,
    emissive: new THREE.Color(0x4a3a2a),
    emissiveIntensity: 0.15 + trichomeMaturity * 0.15
  }), [trichomeMaturity]);

  const pistilMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: new THREE.Color(1.0, 0.5 + trichomeMaturity * 0.3, 0.2),
    transparent: true,
    opacity: 0.95
  }), [trichomeMaturity]);

  const stemHeight = 2.8 * growthStage;
  const nodeCount = Math.floor(5 + growthStage * 4);

  // Generazione palmate per genetica
  const fingerCount = genetics?.fingerCount || 7;
  const leafWidth = (genetics?.leafWidth || 1.0) * 0.12;
  const leafLength = (genetics?.leafLength || 1.0) * 0.5;

  return (
    <group ref={groupRef} position={position}>
      {/* Fusto principale con texture procedurale */}
      <mesh position-y={stemHeight / 2} castShadow receiveShadow material={stemMaterial}>
        <cylinderGeometry args={[0.045, 0.055, stemHeight, 16]} />
      </mesh>

      {/* Radici visibili */}
      {growthStage > 0.2 && Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const rootLength = 0.2 * growthStage;
        return (
          <mesh
            key={`root-${i}`}
            position={[Math.cos(angle) * 0.08, -0.08, Math.sin(angle) * 0.08]}
            rotation-z={Math.cos(angle) * 0.6}
            rotation-x={Math.sin(angle) * 0.6}
            castShadow
          >
            <cylinderGeometry args={[0.015, 0.008, rootLength, 8]} />
            <meshStandardMaterial color={0x3a2a1a} roughness={0.95} />
          </mesh>
        );
      })}

      {/* Nodi con foglie palmate */}
      {Array.from({ length: nodeCount }).map((_, i) => {
        const t = (i + 1) / (nodeCount + 1);
        const nodeY = stemHeight * t;
        const rotation = i * Math.PI * 0.5;
        const branchLength = 0.4 + Math.random() * 0.18;
        const leafScale = 0.75 + t * 0.35;

        return (
          <group key={i} position-y={nodeY} rotation-y={rotation}>
            {[-1, 1].map((dir) => (
              <group key={dir}>
                <mesh 
                  position-x={dir * branchLength / 2} 
                  rotation-z={dir * Math.PI / 2}
                  castShadow
                  material={stemMaterial}
                >
                  <cylinderGeometry args={[0.02, 0.028, branchLength, 12]} />
                </mesh>
                
                <group position-x={dir * branchLength * 0.75} rotation-y={dir * Math.PI / 2}>
                  {/* Foglia centrale */}
                  <SerratedLeaf length={leafLength * leafScale} width={leafWidth * leafScale} material={leafMaterial} />
                  
                  {/* Dita laterali */}
                  {Array.from({ length: Math.floor(fingerCount / 2) }).map((_, f) => {
                    const fingerAngle = -1.2 + (f / Math.floor(fingerCount / 2)) * 2.4;
                    const fingerLength = leafLength * leafScale * (0.7 + Math.random() * 0.2);
                    const fingerWidth = leafWidth * leafScale * (0.8 + Math.random() * 0.15);
                    const fingerY = 0.12 + f * 0.1;
                    
                    return (
                      <React.Fragment key={f}>
                        <group position-y={fingerY} rotation-z={fingerAngle}>
                          <SerratedLeaf length={fingerLength} width={fingerWidth} material={leafMaterial} />
                        </group>
                        <group position-y={fingerY} rotation-z={-fingerAngle}>
                          <SerratedLeaf length={fingerLength} width={fingerWidth} material={leafMaterial} />
                        </group>
                      </React.Fragment>
                    );
                  })}
                </group>
              </group>
            ))}
          </group>
        );
      })}

      {/* Cima apicale */}
      {growthStage > 0.5 && (
        <group position-y={stemHeight * 0.96}>
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const radius = i === 0 ? 0 : 0.12;
            return (
              <group 
                key={i} 
                position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
                rotation-y={angle}
                rotation-x={i === 0 ? 0 : Math.PI / 3.2}
              >
                <SerratedLeaf length={leafLength * 0.9} width={leafWidth * 0.9} material={leafMaterial} />
              </group>
            );
          })}
        </group>
      )}

      {/* Cime/Buds con dettagli ultra-realistici */}
      {growthStage > 0.65 && Array.from({ length: Math.floor(3 + growthStage * 6) }).map((_, i) => {
        const t = (i + 1) / (Math.floor(3 + growthStage * 6) + 1);
        const budY = stemHeight * (0.55 + t * 0.38);
        const budSize = 0.05 + (1 - t) * 0.025;
        
        return (
          <group key={i} position={[
            (Math.random() - 0.5) * 0.18,
            budY,
            (Math.random() - 0.5) * 0.18
          ]}>
            {/* Calice principale */}
            <mesh material={budMaterial} castShadow>
              <sphereGeometry args={[budSize, 12, 10]} />
            </mesh>
            
            {/* Pistilli (peli arancioni) */}
            {Array.from({ length: 16 }).map((_, p) => {
              const angle = (p / 16) * Math.PI * 2;
              const height = p % 2 === 0 ? 0.05 : 0.045;
              return (
                <mesh
                  key={p}
                  position={[
                    Math.cos(angle) * budSize * 0.65,
                    budSize * 0.3,
                    Math.sin(angle) * budSize * 0.65
                  ]}
                  rotation-z={Math.cos(angle) * 0.4}
                  rotation-x={Math.sin(angle) * 0.4}
                  material={pistilMaterial}
                  castShadow
                >
                  <cylinderGeometry args={[0.0018, 0.0025, height, 5]} />
                </mesh>
              );
            })}
            
            {/* Tricomi cristallini (super dettagliati) */}
            {Array.from({ length: Math.floor(40 * growthStage) }).map((_, t) => {
              const angle = Math.random() * Math.PI * 2;
              const radius = Math.random() * budSize * 0.9;
              const height = (Math.random() - 0.3) * budSize;
              
              return (
                <Trichome
                  key={t}
                  position={[
                    Math.cos(angle) * radius,
                    height,
                    Math.sin(angle) * radius
                  ]}
                  maturity={trichomeMaturity}
                  scale={0.8 + Math.random() * 0.4}
                />
              );
            })}
            
            {/* Calici secondari */}
            {Array.from({ length: 3 }).map((_, c) => {
              const cAngle = (c / 3) * Math.PI * 2;
              return (
                <mesh
                  key={c}
                  position={[
                    Math.cos(cAngle) * budSize * 0.7,
                    budSize * 0.15,
                    Math.sin(cAngle) * budSize * 0.7
                  ]}
                  scale={0.6}
                  material={budMaterial}
                  castShadow
                >
                  <sphereGeometry args={[budSize * 0.7, 10, 8]} />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* Tricomi sparsi sulle foglie */}
      {growthStage > 0.75 && Array.from({ length: Math.floor(120 * growthStage) }).map((_, t) => {
        const height = Math.random() * stemHeight * 0.8 + stemHeight * 0.15;
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.08 + Math.random() * 0.22;
        
        return (
          <Trichome
            key={`leaf-trichome-${t}`}
            position={[
              Math.cos(angle) * radius,
              height,
              Math.sin(angle) * radius
            ]}
            maturity={trichomeMaturity}
            scale={0.6 + Math.random() * 0.3}
          />
        );
      })}
    </group>
  );
}