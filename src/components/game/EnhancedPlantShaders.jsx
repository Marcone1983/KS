import React, { useRef, useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

useGLTF.preload('/models/plant03.glb');
useGLTF.preload('/models/plant04.glb');

const advancedLeafShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    uniform float time;
    uniform float windStrength;
    
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vPosition = position;
      
      vec3 pos = position;
      
      float windBase = sin(time * 1.5 + worldPos.x * 3.0) * windStrength;
      float windDetail = sin(time * 3.0 + worldPos.y * 5.0) * windStrength * 0.5;
      float windMicro = sin(time * 6.0 + worldPos.x * 10.0 + worldPos.y * 8.0) * windStrength * 0.25;
      
      float heightFactor = (pos.y + 1.0) * 0.5;
      float totalWind = (windBase + windDetail + windMicro) * 0.08 * heightFactor;
      
      pos.z += totalWind;
      pos.x += totalWind * 0.6;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 leafColor;
    uniform float time;
    uniform vec3 lightPosition;
    uniform float iridescence;
    
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    float noise(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }
    
    vec3 getIridescence(vec3 normal, vec3 viewDir) {
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
      float angle = acos(dot(viewDir, normal));
      
      vec3 iridColor1 = vec3(0.2, 0.8, 0.5);
      vec3 iridColor2 = vec3(0.5, 0.2, 0.8);
      vec3 iridColor3 = vec3(0.8, 0.5, 0.2);
      
      float t = angle / 3.14159;
      vec3 iridColor;
      if (t < 0.5) {
        iridColor = mix(iridColor1, iridColor2, t * 2.0);
      } else {
        iridColor = mix(iridColor2, iridColor3, (t - 0.5) * 2.0);
      }
      
      return iridColor * fresnel * iridescence;
    }
    
    void main() {
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(lightPosition - vWorldPosition);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      
      float diff = max(dot(normal, lightDir), 0.0);
      
      vec3 backLightDir = -lightDir;
      float backDiff = max(dot(normal, backLightDir), 0.0);
      float subsurface = pow(backDiff, 3.0) * 0.6;
      
      float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
      
      float veinPattern = smoothstep(0.48, 0.52, sin(vUv.y * 25.0 + noise(vUv * 10.0) * 2.0));
      veinPattern += smoothstep(0.47, 0.53, sin(vUv.x * 15.0 + vUv.y * 10.0));
      veinPattern *= 0.2;
      
      vec3 veinColor = vec3(0.2, 0.4, 0.15);
      vec3 baseColor = mix(leafColor, veinColor, veinPattern);
      
      vec3 iridColor = getIridescence(normal, viewDir);
      
      float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.4;
      
      vec3 ambient = baseColor * 0.3;
      vec3 diffuse = baseColor * diff * 0.6;
      vec3 scatter = baseColor * subsurface * vec3(0.3, 0.6, 0.2);
      vec3 rim = vec3(0.4, 0.7, 0.3) * fresnel * 0.3;
      
      vec3 finalColor = ambient + diffuse + scatter + rim + vec3(spec) + iridColor;
      
      gl_FragColor = vec4(finalColor, 0.95);
    }
  `
};

export function EnhancedPlantModel({ modelPath, position, rotation, scale, windStrength = 0.2, iridescence = 0.3 }) {
  const groupRef = useRef();
  const { scene } = useGLTF(modelPath);
  const materialsRef = useRef([]);
  
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    const materials = [];
    
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        
        const originalColor = child.material.color ? child.material.color.clone() : new THREE.Color(0x3a7d3a);
        
        const leafMaterial = new THREE.ShaderMaterial({
          uniforms: {
            leafColor: { value: originalColor },
            time: { value: 0 },
            lightPosition: { value: new THREE.Vector3(10, 15, 5) },
            windStrength: { value: windStrength },
            iridescence: { value: iridescence }
          },
          vertexShader: advancedLeafShader.vertexShader,
          fragmentShader: advancedLeafShader.fragmentShader,
          side: THREE.DoubleSide,
          transparent: true
        });
        
        materials.push(leafMaterial);
        child.material = leafMaterial;
      }
    });
    
    materialsRef.current = materials;
    return clone;
  }, [scene, windStrength, iridescence]);

  useFrame((state) => {
    materialsRef.current.forEach((material) => {
      if (material.uniforms) {
        material.uniforms.time.value = state.clock.elapsedTime;
      }
    });
    
    if (groupRef.current) {
      const time = state.clock.elapsedTime;
      const sway = Math.sin(time * 1.5 + position[0] * 2) * windStrength * 0.02;
      groupRef.current.rotation.z = sway;
      groupRef.current.rotation.x = Math.cos(time * 1.2 + position[2] * 2) * windStrength * 0.015;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <primitive object={clonedScene} />
    </group>
  );
}

export function EnhancedScatteredPlants({ count = 25, areaRadius = 35, windStrength = 0.2 }) {
  const plants = useMemo(() => {
    const instances = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 15 + Math.random() * areaRadius;
      const modelPath = Math.random() > 0.5 ? '/models/plant03.glb' : '/models/plant04.glb';
      
      instances.push({
        modelPath,
        position: [
          Math.cos(angle) * distance,
          0,
          Math.sin(angle) * distance
        ],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: 0.8 + Math.random() * 0.6,
        iridescence: 0.2 + Math.random() * 0.4
      });
    }
    return instances;
  }, [count, areaRadius]);

  return (
    <group>
      {plants.map((plant, i) => (
        <EnhancedPlantModel
          key={i}
          modelPath={plant.modelPath}
          position={plant.position}
          rotation={plant.rotation}
          scale={plant.scale}
          windStrength={windStrength}
          iridescence={plant.iridescence}
        />
      ))}
    </group>
  );
}

export default EnhancedPlantModel;