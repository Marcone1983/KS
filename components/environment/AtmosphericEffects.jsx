import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function EnhancedRainSystem({ intensity = 1.0, windStrength = 0.2 }) {
  const particlesRef = useRef();
  const count = Math.floor(intensity * 2000);
  
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 50;
      positions[i3 + 1] = Math.random() * 25 + 5;
      positions[i3 + 2] = (Math.random() - 0.5) * 50;
      
      velocities[i3] = windStrength * 0.15;
      velocities[i3 + 1] = -0.3 - Math.random() * 0.2;
      velocities[i3 + 2] = 0;
    }
    
    return { positions, velocities };
  }, [count, windStrength]);
  
  useFrame(() => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];
      
      if (positions[i3 + 1] < 0) {
        positions[i3] = (Math.random() - 0.5) * 50;
        positions[i3 + 1] = 25 + Math.random() * 5;
        positions[i3 + 2] = (Math.random() - 0.5) * 50;
      }
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color={0xaaccff}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </points>
  );
}

export function FogParticles({ count = 500, density = 0.5, timeOfDay = 'day' }) {
  const particlesRef = useRef();
  
  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 40;
      positions[i3 + 1] = Math.random() * 6;
      positions[i3 + 2] = (Math.random() - 0.5) * 40;
      
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = Math.random() * 0.005;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    
    return { positions, velocities };
  }, [count]);
  
  useFrame((state) => {
    if (!particlesRef.current) return;
    
    const positions = particlesRef.current.geometry.attributes.position.array;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];
      
      if (positions[i3] > 20) positions[i3] = -20;
      if (positions[i3] < -20) positions[i3] = 20;
      if (positions[i3 + 1] > 8) positions[i3 + 1] = 0;
      if (positions[i3 + 2] > 20) positions[i3 + 2] = -20;
      if (positions[i3 + 2] < -20) positions[i3 + 2] = 20;
    }
    
    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });
  
  const fogColor = timeOfDay === 'night' ? 0x444466 : timeOfDay === 'sunset' ? 0x88aacc : 0xccddee;
  const fogOpacity = density * 0.6;
  
  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1.5}
        color={fogColor}
        transparent
        opacity={fogOpacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export function VolumetricLight({ position = [10, 15, 5], color = 0xffffaa, intensity = 1.0, timeOfDay = 'day' }) {
  const lightRef = useRef();
  
  useFrame((state) => {
    if (lightRef.current) {
      const time = state.clock.elapsedTime;
      lightRef.current.position.x = position[0] + Math.sin(time * 0.1) * 2;
      lightRef.current.position.y = position[1] + Math.sin(time * 0.05) * 1;
    }
  });
  
  const lightIntensity = timeOfDay === 'night' ? intensity * 0.3 : timeOfDay === 'sunset' ? intensity * 0.7 : intensity;
  const lightColor = timeOfDay === 'night' ? 0x6688aa : timeOfDay === 'sunset' ? 0xffaa66 : color;
  
  return (
    <>
      <pointLight
        ref={lightRef}
        position={position}
        color={lightColor}
        intensity={lightIntensity}
        distance={25}
        decay={2}
        castShadow
      />
      <mesh position={position}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color={lightColor} transparent opacity={0.4} />
      </mesh>
    </>
  );
}

export function DynamicWater({ position = [-10, 0.01, -15], size = [8, 8], timeOfDay = 'day' }) {
  const waterRef = useRef();
  
  const waterMaterial = useMemo(() => {
    const dayColor1 = new THREE.Color(0x4488aa);
    const dayColor2 = new THREE.Color(0x88ccff);
    const sunsetColor1 = new THREE.Color(0xff8844);
    const sunsetColor2 = new THREE.Color(0xffaa66);
    const nightColor1 = new THREE.Color(0x223344);
    const nightColor2 = new THREE.Color(0x445566);
    
    let color1, color2;
    if (timeOfDay === 'night') {
      color1 = nightColor1;
      color2 = nightColor2;
    } else if (timeOfDay === 'sunset') {
      color1 = sunsetColor1;
      color2 = sunsetColor2;
    } else {
      color1 = dayColor1;
      color2 = dayColor2;
    }
    
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color1: { value: color1 },
        color2: { value: color2 },
        reflectionStrength: { value: timeOfDay === 'day' ? 0.8 : 0.4 }
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        uniform float time;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          vec3 pos = position;
          float wave1 = sin(pos.x * 2.0 + time * 1.2) * 0.03;
          float wave2 = cos(pos.y * 1.5 + time * 0.8) * 0.025;
          float wave3 = sin((pos.x + pos.y) * 3.0 + time * 1.5) * 0.015;
          
          pos.z += wave1 + wave2 + wave3;
          
          vec3 tangent = normalize(vec3(1.0, 0.0, cos(pos.x * 2.0 + time * 1.2) * 2.0 * 0.03));
          vec3 bitangent = normalize(vec3(0.0, 1.0, -sin(pos.y * 1.5 + time * 0.8) * 1.5 * 0.025));
          vNormal = normalize(cross(tangent, bitangent));
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform float time;
        uniform float reflectionStrength;
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
        }
        
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(cameraPosition - vPosition);
          
          float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.0);
          
          vec3 waterColor = mix(color1, color2, vUv.y);
          
          float sparkle = noise(vUv * 50.0 + time);
          sparkle = smoothstep(0.95, 1.0, sparkle);
          
          float ripple = sin(vPosition.x * 8.0 + time * 3.0) * cos(vPosition.y * 6.0 + time * 2.5);
          ripple = ripple * 0.5 + 0.5;
          
          waterColor = mix(waterColor, color2 * 1.3, ripple * 0.2);
          waterColor += vec3(sparkle) * reflectionStrength * 0.5;
          waterColor = mix(waterColor, vec3(1.0), fresnel * reflectionStrength * 0.3);
          
          gl_FragColor = vec4(waterColor, 0.75);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }, [timeOfDay]);
  
  useFrame((state) => {
    if (waterRef.current && waterRef.current.material) {
      waterRef.current.material.uniforms.time.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <mesh
      ref={waterRef}
      position={position}
      rotation-x={-Math.PI / 2}
      receiveShadow
    >
      <planeGeometry args={[size[0], size[1], 64, 64]} />
      <primitive object={waterMaterial} attach="material" />
    </mesh>
  );
}

export function Butterflies({ count = 15 }) {
  const butterfliesRef = useRef([]);
  const positions = useMemo(() => {
    return Array.from({ length: count }, () => ({
      x: (Math.random() - 0.5) * 30,
      y: 0.5 + Math.random() * 3,
      z: (Math.random() - 0.5) * 30,
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.4,
      radius: 2 + Math.random() * 3
    }));
  }, [count]);
  
  useFrame((state) => {
    butterfliesRef.current.forEach((butterfly, i) => {
      if (butterfly) {
        const pos = positions[i];
        const time = state.clock.elapsedTime * pos.speed + pos.phase;
        
        butterfly.position.x = pos.x + Math.sin(time) * pos.radius;
        butterfly.position.y = pos.y + Math.sin(time * 2) * 0.3;
        butterfly.position.z = pos.z + Math.cos(time) * pos.radius;
        
        butterfly.rotation.y = time;
        butterfly.rotation.x = Math.sin(time * 4) * 0.2;
      }
    });
  });
  
  return (
    <group>
      {positions.map((pos, i) => (
        <group key={i} ref={(el) => (butterfliesRef.current[i] = el)} position={[pos.x, pos.y, pos.z]}>
          <mesh position-x={-0.04} rotation-z={0.1}>
            <planeGeometry args={[0.06, 0.08]} />
            <meshStandardMaterial
              color={[0xff88cc, 0x88ccff, 0xffff88, 0xff8844][i % 4]}
              side={THREE.DoubleSide}
              emissive={0x444444}
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh position-x={0.04} rotation-z={-0.1}>
            <planeGeometry args={[0.06, 0.08]} />
            <meshStandardMaterial
              color={[0xff88cc, 0x88ccff, 0xffff88, 0xff8844][i % 4]}
              side={THREE.DoubleSide}
              emissive={0x444444}
              emissiveIntensity={0.2}
            />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 6]} />
            <meshStandardMaterial color={0x332211} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Fireflies({ count = 150, timeOfDay = 'day' }) {
  const firefliesRef = useRef();
  const { positions, phases, sizes } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = 0.5 + Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
      phases[i] = Math.random() * Math.PI * 2;
      sizes[i] = 0.1 + Math.random() * 0.15;
    }
    
    return { positions, phases, sizes };
  }, [count]);
  
  useFrame((state) => {
    if (!firefliesRef.current) return;
    
    const positions = firefliesRef.current.geometry.attributes.position.array;
    const sizeArray = firefliesRef.current.geometry.attributes.size.array;
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = phases[i];
      
      positions[i3] += Math.sin(time * 1.5 + phase) * 0.015;
      positions[i3 + 1] += Math.cos(time * 2.5 + phase) * 0.012;
      positions[i3 + 2] += Math.cos(time * 1.5 + phase) * 0.015;
      
      const pulse = Math.sin(time * 3 + phase) * 0.5 + 0.5;
      sizeArray[i] = sizes[i] * (0.8 + pulse * 0.4);
      
      if (positions[i3] > 15) positions[i3] = -15;
      if (positions[i3] < -15) positions[i3] = 15;
      if (positions[i3 + 1] > 6) positions[i3 + 1] = 0.5;
      if (positions[i3 + 1] < 0.5) positions[i3 + 1] = 6;
      if (positions[i3 + 2] > 15) positions[i3 + 2] = -15;
      if (positions[i3 + 2] < -15) positions[i3 + 2] = 15;
    }
    
    firefliesRef.current.geometry.attributes.position.needsUpdate = true;
    firefliesRef.current.geometry.attributes.size.needsUpdate = true;
  });
  
  if (timeOfDay !== 'night' && timeOfDay !== 'sunset') return null;
  
  return (
    <points ref={firefliesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        color={0xffff66}
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </points>
  );
}