import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const cannabisLeafShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    uniform float time;
    uniform float windStrength;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;
      
      vec3 pos = position;
      float wave = sin(time * 2.0 + position.x * 5.0 + position.y * 3.0) * windStrength * 0.08;
      pos.z += wave;
      pos.x += wave * 0.5;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 leafColor;
    uniform float healthFactor;
    uniform float wetness;
    uniform float time;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    void main() {
      vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
      float diff = max(dot(vNormal, lightDir), 0.0);
      
      // Subsurface scattering
      float subsurface = pow(max(0.0, dot(vNormal, lightDir)), 4.0) * 0.5;
      
      // Wetness effect
      float wetGloss = wetness * 0.4;
      vec3 viewDir = normalize(cameraPosition - vPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      float spec = pow(max(dot(vNormal, halfDir), 0.0), 32.0) * wetGloss;
      
      // Vein pattern
      float veins = smoothstep(0.45, 0.55, sin(vUv.y * 20.0)) * 0.15;
      
      vec3 baseColor = mix(leafColor, vec3(0.3, 0.5, 0.2), veins);
      vec3 finalColor = baseColor * (0.4 + diff * 0.6 + subsurface) + vec3(spec);
      
      // Health degradation
      finalColor = mix(finalColor, vec3(0.5, 0.4, 0.2), (1.0 - healthFactor) * 0.5);
      
      gl_FragColor = vec4(finalColor, 0.95);
    }
  `
};

function SerratedLeaf({ length, width, material }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    const teeth = 8;
    
    shape.moveTo(0, 0);
    for (let i = 0; i <= teeth; i++) {
      const t = i / teeth;
      const y = t * length;
      const w = Math.sin(t * Math.PI) * width * (1 - t * 0.18);
      const tooth = (i % 2 === 0) ? w * 0.12 : 0;
      shape.lineTo(w + tooth, y);
    }
    for (let i = teeth; i >= 0; i--) {
      const t = i / teeth;
      const y = t * length;
      const w = Math.sin(t * Math.PI) * width * (1 - t * 0.18);
      const tooth = (i % 2 === 0) ? w * 0.12 : 0;
      shape.lineTo(-w - tooth, y);
    }
    shape.closePath();

    const geo = new THREE.ShapeGeometry(shape, 8);
    const pos = geo.attributes.position;
    
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = (y / length) * 0.02 + Math.abs(x) * 0.015;
      pos.setZ(i, z);
    }
    
    geo.computeVertexNormals();
    return geo;
  }, [length, width]);

  return <mesh geometry={geometry} material={material} castShadow rotation-x={-Math.PI / 2} />;
}

function PalmLeaf({ scale, material }) {
  const fingers = [
    { angle: 0, length: 0.5, width: 0.12, offset: 0 },
    { angle: -0.5, length: 0.48, width: 0.11, offset: 0.1 },
    { angle: 0.5, length: 0.48, width: 0.11, offset: 0.1 },
    { angle: -0.85, length: 0.42, width: 0.1, offset: 0.18 },
    { angle: 0.85, length: 0.42, width: 0.1, offset: 0.18 },
    { angle: -1.15, length: 0.36, width: 0.09, offset: 0.26 },
    { angle: 1.15, length: 0.36, width: 0.09, offset: 0.26 }
  ];

  return (
    <group>
      {fingers.map((finger, i) => (
        <group key={i} position-y={finger.offset * scale} rotation-z={finger.angle}>
          <SerratedLeaf 
            length={finger.length * scale} 
            width={finger.width * scale} 
            material={material} 
          />
        </group>
      ))}
    </group>
  );
}

export default function CannabisPlantR3F({ position = [0, 0, -1.5], health = 100, pestCount = 0, windStrength = 0.2 }) {
  const groupRef = useRef();
  const materialRef = useRef();

  const healthFactor = health / 100;
  const infestationFactor = Math.min(pestCount * 5, 100) / 100;

  const leafMaterial = useMemo(() => {
    const color = new THREE.Color(0x4a9d4a).lerp(new THREE.Color(0x8b7d3a), infestationFactor * 0.5);
    
    return new THREE.ShaderMaterial({
      uniforms: {
        leafColor: { value: color },
        healthFactor: { value: healthFactor },
        wetness: { value: 0.0 },
        windStrength: { value: windStrength },
        time: { value: 0 }
      },
      vertexShader: cannabisLeafShader.vertexShader,
      fragmentShader: cannabisLeafShader.fragmentShader,
      side: THREE.DoubleSide,
      transparent: true
    });
  }, [healthFactor, infestationFactor, windStrength]);

  useFrame((state) => {
    if (leafMaterial) {
      leafMaterial.uniforms.time.value = state.clock.elapsedTime;
      leafMaterial.uniforms.windStrength.value = windStrength;
    }
    
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * windStrength * 0.02;
    }
  });

  const stemMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x5a7d4a,
    roughness: 0.82,
    metalness: 0.02
  }), []);

  const budMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: 0x9b8355,
    roughness: 0.55,
    emissive: 0x4a3a2a,
    emissiveIntensity: 0.12
  }), []);

  const pistilMaterial = useMemo(() => new THREE.MeshBasicMaterial({
    color: 0xff9944,
    transparent: true,
    opacity: 0.95
  }), []);

  const growthStage = Math.min(1.0, healthFactor);
  const stemHeight = 2.5 * growthStage;
  const nodeCount = Math.floor(4 + growthStage * 3);

  return (
    <group ref={groupRef} position={position}>
      <mesh position-y={stemHeight / 2} castShadow receiveShadow material={stemMaterial}>
        <cylinderGeometry args={[0.04, 0.05, stemHeight, 12]} />
      </mesh>

      {Array.from({ length: nodeCount }).map((_, i) => {
        const t = (i + 1) / (nodeCount + 1);
        const nodeY = stemHeight * t;
        const rotation = i * Math.PI * 0.6;
        const branchLength = 0.35 + Math.random() * 0.15;
        const leafScale = 0.7 + t * 0.4;

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
                  <cylinderGeometry args={[0.018, 0.024, branchLength, 8]} />
                </mesh>
                
                <group position-x={dir * branchLength * 0.7} rotation-y={dir * Math.PI / 2}>
                  <PalmLeaf scale={leafScale} material={leafMaterial} />
                </group>
              </group>
            ))}
          </group>
        );
      })}

      {growthStage > 0.4 && (
        <group position-y={stemHeight * 0.95}>
          {Array.from({ length: 6 }).map((_, i) => {
            const angle = (i / 6) * Math.PI * 2;
            const radius = i === 0 ? 0 : 0.1;
            return (
              <group 
                key={i} 
                position={[Math.cos(angle) * radius, 0, Math.sin(angle) * radius]}
                rotation-y={angle}
                rotation-x={i === 0 ? 0 : Math.PI / 3.5}
              >
                <PalmLeaf scale={0.85} material={leafMaterial} />
              </group>
            );
          })}
        </group>
      )}

      {growthStage > 0.6 && Array.from({ length: Math.floor(2 + growthStage * 4) }).map((_, i) => {
        const t = (i + 1) / (Math.floor(2 + growthStage * 4) + 1);
        const budY = stemHeight * (0.5 + t * 0.4);
        return (
          <group key={i} position={[
            (Math.random() - 0.5) * 0.15,
            budY,
            (Math.random() - 0.5) * 0.15
          ]}>
            <mesh material={budMaterial}>
              <sphereGeometry args={[0.045, 8, 6]} />
            </mesh>
            
            {Array.from({ length: 12 }).map((_, p) => {
              const angle = (p / 12) * Math.PI * 2;
              return (
                <mesh
                  key={p}
                  position={[Math.cos(angle) * 0.028, 0.015, Math.sin(angle) * 0.028]}
                  rotation-z={Math.cos(angle) * 0.35}
                  rotation-x={Math.sin(angle) * 0.35}
                  material={pistilMaterial}
                >
                  <cylinderGeometry args={[0.002, 0.002, 0.04, 4]} />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {growthStage > 0.75 && Array.from({ length: Math.floor(growthStage * 50) }).map((_, i) => {
        const height = Math.random() * stemHeight * 0.7 + stemHeight * 0.2;
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.05 + Math.random() * 0.15;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * radius, height, Math.sin(angle) * radius]}
          >
            <sphereGeometry args={[0.003, 4, 3]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}