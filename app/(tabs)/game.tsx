// @ts-nocheck
/**
 * Kurstaki Strike - AAA 3D Game Screen
 * Rendering iperrealistica con Three.js, PBR, IBL, Post-processing
 * Modelli GLB: plant03.glb, plant04.glb, spray.glb
 */

import React, { Suspense, useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Dimensions,
  Platform,
  ActivityIndicator,
  Pressable,
  Image
} from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { 
  useGLTF, 
  Environment, 
  OrbitControls,
  PerspectiveCamera,
  useTexture,
  Html,
  ContactShadows,
  Sparkles,
  Float,
  MeshTransmissionMaterial,
  MeshDistortMaterial,
  useAnimations
} from '@react-three/drei/native';
import { 
  EffectComposer, 
  Bloom, 
  DepthOfField,
  Vignette,
  ChromaticAberration,
  ToneMapping,
  SMAA,
  BrightnessContrast,
  HueSaturation
} from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useSounds } from '@/hooks/use-sounds';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  runOnJS
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================
// CUSTOM SHADERS PER PIANTE FOTOREALISTICHE
// ============================================

const leafVertexShader = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;
  uniform float time;
  uniform float windStrength;
  uniform float windFrequency;
  
  // Simplex noise per vento realistico
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    
    vec3 pos = position;
    
    // Animazione vento realistica con noise
    float windNoise = snoise(vec3(worldPos.x * windFrequency, worldPos.z * windFrequency, time * 0.5));
    float windEffect = windNoise * windStrength * (pos.y * 0.15);
    
    // Movimento ondulatorio secondario
    float wave = sin(time * 2.0 + worldPos.x * 0.5) * 0.02;
    
    pos.x += windEffect + wave;
    pos.z += windEffect * 0.5;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    vViewPosition = -mvPosition.xyz;
    
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const leafFragmentShader = `
  uniform vec3 leafColor;
  uniform vec3 lightPosition;
  uniform float translucency;
  uniform float subsurfaceIntensity;
  uniform sampler2D leafTexture;
  uniform float time;
  
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(lightPosition - vWorldPosition);
    vec3 viewDir = normalize(vViewPosition);
    
    // Subsurface Scattering per foglie traslucide
    vec3 backLightDir = -lightDir;
    float backDiff = max(dot(normal, backLightDir), 0.0);
    float subsurface = pow(backDiff, 2.0) * subsurfaceIntensity;
    
    // Fresnel per bordi luminosi
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
    
    // Pattern venature procedurali
    float veinPattern = smoothstep(0.48, 0.52, sin(vUv.y * 40.0 + sin(vUv.x * 25.0) * 3.0));
    vec3 veinColor = leafColor * 0.6;
    vec3 baseColor = mix(leafColor, veinColor, veinPattern * 0.25);
    
    // Variazione colore naturale
    float colorVariation = snoise(vec3(vUv * 10.0, time * 0.1)) * 0.1;
    baseColor += colorVariation;
    
    // Illuminazione principale
    float diff = max(dot(normal, lightDir), 0.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfDir), 0.0), 32.0) * 0.3;
    
    // Colore finale con SSS
    vec3 diffuse = baseColor * (diff * 0.7 + 0.3);
    vec3 scatter = baseColor * subsurface * vec3(0.3, 0.6, 0.2) * translucency;
    vec3 rim = vec3(0.2, 0.5, 0.1) * fresnel * 0.3;
    
    vec3 finalColor = diffuse + scatter + rim + vec3(spec);
    
    // Tone mapping
    finalColor = finalColor / (finalColor + vec3(1.0));
    finalColor = pow(finalColor, vec3(1.0/2.2));
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
  
  // Noise function per fragment shader
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - 0.5;
    i = mod289(i);
    vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * vec3(1.0, 2.0, 1.0) - vec3(0.0, 1.0, 0.0);
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = inversesqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
`;

// ============================================
// COMPONENTE PIANTA 3D CON GLB
// ============================================

interface Plant3DProps {
  position: [number, number, number];
  scale?: number;
  health: number;
  modelType: 'plant03' | 'plant04';
  onHit?: () => void;
}

function Plant3D({ position, scale = 1, health, modelType, onHit }: Plant3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Carica il modello GLB
  const modelPath = modelType === 'plant03' 
    ? require('@/assets/models/plant03.glb')
    : require('@/assets/models/plant04.glb');
  
  const { scene, nodes, materials } = useGLTF(modelPath);
  
  // Uniforms per shader personalizzato
  const uniforms = useMemo(() => ({
    time: { value: 0 },
    windStrength: { value: 0.15 },
    windFrequency: { value: 0.8 },
    leafColor: { value: new THREE.Color(0x2d5a27) },
    lightPosition: { value: new THREE.Vector3(10, 20, 10) },
    translucency: { value: 0.6 },
    subsurfaceIntensity: { value: 0.8 },
  }), []);

  // Animazione
  useFrame((state) => {
    if (meshRef.current) {
      // Aggiorna tempo per shader
      uniforms.time.value = state.clock.elapsedTime;
      
      // Leggera oscillazione della pianta
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  // Colore basato sulla salute
  const healthColor = useMemo(() => {
    const t = health / 100;
    return new THREE.Color().lerpColors(
      new THREE.Color(0x8B4513), // Marrone (morta)
      new THREE.Color(0x228B22), // Verde (sana)
      t
    );
  }, [health]);

  return (
    <group ref={meshRef} position={position} scale={scale}>
      <Float 
        speed={1.5} 
        rotationIntensity={0.1} 
        floatIntensity={0.2}
      >
        <primitive 
          object={scene.clone()} 
          scale={0.5}
          castShadow
          receiveShadow
        />
      </Float>
      
      {/* Particelle luminose intorno alla pianta */}
      <Sparkles 
        count={20}
        scale={2}
        size={2}
        speed={0.3}
        color={healthColor}
        opacity={0.5}
      />
      
      {/* Ombra a contatto */}
      <ContactShadows 
        position={[0, -0.5, 0]}
        opacity={0.4}
        scale={3}
        blur={2}
        far={1}
      />
      
      {/* Indicatore salute */}
      <mesh position={[0, 2.5, 0]}>
        <planeGeometry args={[1.5, 0.15]} />
        <meshBasicMaterial color="#333" transparent opacity={0.8} />
      </mesh>
      <mesh position={[-0.75 + (health / 100) * 0.75, 2.5, 0.01]}>
        <planeGeometry args={[health / 100 * 1.5, 0.12]} />
        <meshBasicMaterial color={healthColor} />
      </mesh>
    </group>
  );
}

// ============================================
// COMPONENTE SPRUZZINO 3D CON GLB
// ============================================

interface SprayBottle3DProps {
  position: [number, number, number];
  isSpraying: boolean;
  targetPosition?: [number, number, number];
}

function SprayBottle3D({ position, isSpraying, targetPosition }: SprayBottle3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  // Carica il modello GLB dello spray
  const { scene, nodes, materials } = useGLTF(require('@/assets/models/spray.glb'));
  
  // Particelle spray
  const particleCount = 200;
  const particlePositions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
    }
    return positions;
  }, []);

  const particleVelocities = useRef<Float32Array>(new Float32Array(particleCount * 3));

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotazione verso il target
      if (targetPosition) {
        const targetVec = new THREE.Vector3(...targetPosition);
        meshRef.current.lookAt(targetVec);
      }
      
      // Animazione leggera
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }

    // Animazione particelle spray
    if (particlesRef.current && isSpraying) {
      const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
      
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // Reset particelle che escono dal range
        if (positions[i3 + 2] > 5 || Math.random() < 0.02) {
          positions[i3] = (Math.random() - 0.5) * 0.2;
          positions[i3 + 1] = (Math.random() - 0.5) * 0.2;
          positions[i3 + 2] = 0;
          
          particleVelocities.current[i3] = (Math.random() - 0.5) * 0.1;
          particleVelocities.current[i3 + 1] = (Math.random() - 0.5) * 0.1;
          particleVelocities.current[i3 + 2] = Math.random() * 0.3 + 0.2;
        }
        
        // Aggiorna posizioni
        positions[i3] += particleVelocities.current[i3];
        positions[i3 + 1] += particleVelocities.current[i3 + 1] - delta * 0.5; // Gravità
        positions[i3 + 2] += particleVelocities.current[i3 + 2];
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      {/* Modello spray GLB */}
      <primitive 
        object={scene.clone()} 
        scale={0.3}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
      />
      
      {/* Particelle spray */}
      {isSpraying && (
        <points ref={particlesRef} position={[0.5, 0, 0]}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particleCount}
              array={particlePositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.05}
            color="#87CEEB"
            transparent
            opacity={0.6}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
      
      {/* Luce dello spray */}
      {isSpraying && (
        <pointLight 
          position={[0.5, 0, 0]} 
          color="#87CEEB" 
          intensity={2} 
          distance={3}
        />
      )}
    </group>
  );
}

// ============================================
// COMPONENTE PARASSITA 3D CON MODELLI GLB
// ============================================

// Mapping dei modelli GLB per ogni tipo di parassita
const PEST_MODELS = {
  caterpillar: require('@/assets/models/pests/caterpillar.glb'),
  spider: require('@/assets/models/pests/spider_mite.glb'),
  aphid: require('@/assets/models/pests/aphid.glb'),
  beetle: require('@/assets/models/pests/mealybug.glb'),
  whitefly: require('@/assets/models/pests/whitefly.glb'),
  thrip: require('@/assets/models/pests/thrip.glb'),
  locust_boss: require('@/assets/models/pests/locust_boss.glb'),
};

interface Pest3DProps {
  id: string;
  position: [number, number, number];
  type: 'caterpillar' | 'spider' | 'aphid' | 'beetle' | 'whitefly' | 'thrip' | 'locust_boss';
  health: number;
  onDeath: (id: string) => void;
  isBoss?: boolean;
}

function PestModel3D({ type, scale = 1 }: { type: string; scale?: number }) {
  try {
    const modelPath = PEST_MODELS[type as keyof typeof PEST_MODELS];
    if (!modelPath) {
      // Fallback per tipi non supportati
      return (
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color="#ff0000" />
        </mesh>
      );
    }
    const { scene } = useGLTF(modelPath);
    return <primitive object={scene.clone()} scale={scale} />;
  } catch (e) {
    // Fallback se il modello non carica
    return (
      <mesh>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
    );
  }
}

function Pest3D({ id, position, type, health, onDeath, isBoss = false }: Pest3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [isDead, setIsDead] = useState(false);
  const [currentPos, setCurrentPos] = useState(position);
  
  // Scale basato sul tipo (boss più grande)
  const pestScale = useMemo(() => {
    if (isBoss || type === 'locust_boss') return 2.5;
    switch (type) {
      case 'caterpillar': return 1.2;
      case 'spider': return 1.0;
      case 'aphid': return 0.8;
      case 'beetle': return 1.0;
      case 'whitefly': return 0.7;
      case 'thrip': return 0.6;
      default: return 1.0;
    }
  }, [type, isBoss]);

  useFrame((state, delta) => {
    if (groupRef.current && !isDead) {
      // Movimento ondulatorio verticale
      groupRef.current.position.y = currentPos[1] + Math.sin(state.clock.elapsedTime * 3 + currentPos[0]) * 0.15;
      
      // Rotazione
      groupRef.current.rotation.y += delta * (isBoss ? 0.3 : 0.5);
      
      // Movimento verso la pianta (asse Z negativo)
      const speed = isBoss ? 0.1 : 0.2;
      groupRef.current.position.z -= delta * speed;
      
      // Aggiorna posizione corrente
      setCurrentPos([groupRef.current.position.x, currentPos[1], groupRef.current.position.z]);
    }
  });

  useEffect(() => {
    if (health <= 0 && !isDead) {
      setIsDead(true);
      // Effetto morte con delay
      setTimeout(() => onDeath(id), 300);
    }
  }, [health, isDead, id, onDeath]);

  if (isDead) return null;

  return (
    <Float speed={isBoss ? 1 : 2} rotationIntensity={0.3} floatIntensity={isBoss ? 0.3 : 0.5}>
      <group ref={groupRef} position={position}>
        {/* Modello GLB del parassita */}
        <Suspense fallback={
          <mesh>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#ff6b6b" wireframe />
          </mesh>
        }>
          <PestModel3D type={type} scale={pestScale} />
        </Suspense>
        
        {/* Barra salute sopra il parassita */}
        <group position={[0, 0.5, 0]}>
          {/* Background barra */}
          <mesh position={[0, 0, 0]}>
            <planeGeometry args={[0.4, 0.06]} />
            <meshBasicMaterial color="#1a1a1a" transparent opacity={0.8} />
          </mesh>
          {/* Barra salute */}
          <mesh position={[(health / 100 - 1) * 0.18, 0, 0.001]}>
            <planeGeometry args={[0.36 * (health / 100), 0.04]} />
            <meshBasicMaterial 
              color={health > 50 ? '#22c55e' : health > 25 ? '#eab308' : '#ef4444'} 
            />
          </mesh>
        </group>
        
        {/* Glow per boss */}
        {isBoss && (
          <pointLight 
            position={[0, 0, 0]} 
            color="#ff4444" 
            intensity={2} 
            distance={3} 
          />
        )}
      </group>
    </Float>
  );
}

// ============================================
// AMBIENTE 3D CON ILLUMINAZIONE AAA
// ============================================

function GameEnvironment() {
  return (
    <>
      {/* Illuminazione HDR basata su immagine */}
      <Environment preset="forest" background blur={0.5} />
      
      {/* Luce solare principale */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      {/* Luce ambientale */}
      <ambientLight intensity={0.3} color="#B4D7E8" />
      
      {/* Luce di riempimento */}
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#FFE4B5" />
      
      {/* Luce rim per contorni */}
      <spotLight
        position={[0, 10, -15]}
        angle={0.5}
        penumbra={1}
        intensity={1}
        color="#87CEEB"
      />
      
      {/* Terreno */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial 
          color="#3d2817"
          roughness={0.9}
          metalness={0}
        />
      </mesh>
      
      {/* Nebbia volumetrica */}
      <fog attach="fog" args={['#87CEEB', 10, 50]} />
    </>
  );
}

// ============================================
// POST-PROCESSING AAA
// ============================================

function PostProcessingAAA() {
  return (
    <EffectComposer multisampling={4}>
      {/* Anti-aliasing SMAA */}
      <SMAA />
      
      {/* Bloom per effetti luminosi */}
      <Bloom
        intensity={0.5}
        luminanceThreshold={0.8}
        luminanceSmoothing={0.9}
        mipmapBlur
      />
      
      {/* Profondità di campo */}
      <DepthOfField
        focusDistance={0.01}
        focalLength={0.02}
        bokehScale={3}
      />
      
      {/* Vignettatura cinematografica */}
      <Vignette
        offset={0.3}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
      
      {/* Aberrazione cromatica leggera */}
      <ChromaticAberration
        offset={[0.001, 0.001]}
        blendFunction={BlendFunction.NORMAL}
      />
      
      {/* Tone mapping cinematografico */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      
      {/* Regolazione colore */}
      <BrightnessContrast brightness={0.05} contrast={0.1} />
      <HueSaturation saturation={0.1} />
    </EffectComposer>
  );
}

// ============================================
// SCENA 3D PRINCIPALE
// ============================================

interface GameSceneProps {
  plants: Array<{ id: string; position: [number, number, number]; health: number; type: 'plant03' | 'plant04' }>;
  pests: Array<{ id: string; position: [number, number, number]; type: 'caterpillar' | 'spider' | 'aphid' | 'beetle'; health: number }>;
  sprayPosition: [number, number, number];
  isSpraying: boolean;
  onPestDeath: (id: string) => void;
}

function GameScene({ plants, pests, sprayPosition, isSpraying, onPestDeath }: GameSceneProps) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />
      
      {/* Controlli */}
      <OrbitControls 
        enablePan={false}
        minDistance={5}
        maxDistance={20}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
      />
      
      {/* Ambiente */}
      <GameEnvironment />
      
      {/* Piante */}
      {plants.map((plant) => (
        <Plant3D
          key={plant.id}
          position={plant.position}
          health={plant.health}
          modelType={plant.type}
          scale={1.5}
        />
      ))}
      
      {/* Parassiti */}
      {pests.map((pest) => (
        <Pest3D
          key={pest.id}
          id={pest.id}
          position={pest.position}
          type={pest.type}
          health={pest.health}
          onDeath={onPestDeath}
        />
      ))}
      
      {/* Spruzzino */}
      <SprayBottle3D
        position={sprayPosition}
        isSpraying={isSpraying}
      />
      
      {/* Post-processing */}
      <PostProcessingAAA />
    </>
  );
}

// ============================================
// COMPONENTE PRINCIPALE GAME
// ============================================

export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play, playLoop, stopLoop } = useSounds();
  
  // Stato del gioco
  const [isLoading, setIsLoading] = useState(true);
  const [isPremium, setIsPremium] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [maxWaves, setMaxWaves] = useState(3);
  const [ammo, setAmmo] = useState(99);
  const [combo, setCombo] = useState(0);
  const [isSpraying, setIsSpraying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Piante
  const [plants, setPlants] = useState([
    { id: 'plant1', position: [-2, 0, 0] as [number, number, number], health: 100, type: 'plant03' as const },
    { id: 'plant2', position: [0, 0, 0] as [number, number, number], health: 100, type: 'plant04' as const },
    { id: 'plant3', position: [2, 0, 0] as [number, number, number], health: 100, type: 'plant03' as const },
  ]);
  
  // Parassiti
  const [pests, setPests] = useState<Array<{
    id: string;
    position: [number, number, number];
    type: 'caterpillar' | 'spider' | 'aphid' | 'beetle';
    health: number;
  }>>([]);
  
  // Posizione spray
  const [sprayPosition, setSprayPosition] = useState<[number, number, number]>([0, 2, 5]);

  // Animazioni
  const scoreScale = useSharedValue(1);
  const comboOpacity = useSharedValue(0);

  // Carica stato premium
  useEffect(() => {
    const loadPremiumStatus = async () => {
      try {
        const premium = await AsyncStorage.getItem('isPremium');
        setIsPremium(premium === 'true');
      } catch (error) {
        console.error('Error loading premium status:', error);
      }
      setIsLoading(false);
    };
    loadPremiumStatus();
  }, []);

  // Genera parassiti
  useEffect(() => {
    if (!isLoading && !gameOver && !isPaused) {
      const spawnPest = () => {
        const types: Array<'caterpillar' | 'spider' | 'aphid' | 'beetle'> = ['caterpillar', 'spider', 'aphid', 'beetle'];
        const newPest = {
          id: `pest_${Date.now()}_${Math.random()}`,
          position: [
            (Math.random() - 0.5) * 8,
            Math.random() * 2 + 1,
            -10
          ] as [number, number, number],
          type: types[Math.floor(Math.random() * types.length)],
          health: 100
        };
        setPests(prev => [...prev, newPest]);
      };

      const interval = setInterval(spawnPest, 2000 / wave);
      return () => clearInterval(interval);
    }
  }, [isLoading, wave, gameOver, isPaused]);

  // Gestione spray
  const handleSpray = useCallback(() => {
    if (ammo > 0 && !gameOver) {
      setIsSpraying(true);
      setAmmo(prev => prev - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      play('spray_start');
      
      // Colpisci parassiti nel raggio
      setPests(prev => prev.map(pest => {
        const distance = Math.sqrt(
          Math.pow(pest.position[0] - sprayPosition[0], 2) +
          Math.pow(pest.position[2] - sprayPosition[2], 2)
        );
        
        if (distance < 3) {
          return { ...pest, health: pest.health - 50 };
        }
        return pest;
      }));
      
      setTimeout(() => {
        setIsSpraying(false);
        play('spray_stop');
      }, 500);
    } else if (ammo <= 0) {
      play('spray_empty');
    }
  }, [ammo, gameOver, sprayPosition, play]);

  // Gestione morte parassita
  const handlePestDeath = useCallback((id: string) => {
    setScore(prev => prev + 100 * (combo + 1));
    setCombo(prev => prev + 1);
    play('pest_die_fall');
    
    // Animazione score
    scoreScale.value = withSequence(
      withSpring(1.3),
      withSpring(1)
    );
    
    // Animazione combo
    comboOpacity.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 1000 })
    );
    
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [combo, play]);

  // Reset combo dopo inattività
  useEffect(() => {
    const timeout = setTimeout(() => setCombo(0), 2000);
    return () => clearTimeout(timeout);
  }, [combo]);

  // Verifica game over
  useEffect(() => {
    const allPlantsDead = plants.every(p => p.health <= 0);
    if (allPlantsDead) {
      setGameOver(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      play('challenge_fail');
    }
  }, [plants]);

  // Verifica paywall dopo livello 1
  useEffect(() => {
    if (currentLevel > 1 && !isPremium) {
      router.push('/paywall');
    }
  }, [currentLevel, isPremium, router]);

  // Stili animati
  const scoreAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }]
  }));

  const comboAnimatedStyle = useAnimatedStyle(() => ({
    opacity: comboOpacity.value,
    transform: [{ scale: interpolate(comboOpacity.value, [0, 1], [0.5, 1]) }]
  }));

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Caricamento modelli 3D...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Canvas 3D */}
      <View style={styles.canvasContainer}>
        <Canvas
          shadows
          dpr={[1, 2]}
          gl={{ 
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true
          }}
          onCreated={({ gl }) => {
            gl.setClearColor('#87CEEB');
          }}
        >
          <Suspense fallback={null}>
            <GameScene
              plants={plants}
              pests={pests}
              sprayPosition={sprayPosition}
              isSpraying={isSpraying}
              onPestDeath={handlePestDeath}
            />
          </Suspense>
        </Canvas>
      </View>

      {/* HUD */}
      <View style={[styles.hud, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>✕</Text>
          </TouchableOpacity>
          
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LV {currentLevel}</Text>
          </View>
          
          <Animated.View style={[styles.scoreContainer, scoreAnimatedStyle]}>
            <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
            <Text style={styles.waveText}>Wave {wave}/{maxWaves}</Text>
          </Animated.View>
          
          <View style={styles.ammoContainer}>
            <Text style={styles.ammoIcon}>💧</Text>
            <Text style={styles.ammoText}>{ammo}</Text>
          </View>
        </View>

        {/* Barra salute totale */}
        <View style={styles.healthBarContainer}>
          <View style={styles.healthBarBackground}>
            <View 
              style={[
                styles.healthBarFill, 
                { width: `${plants.reduce((sum, p) => sum + p.health, 0) / plants.length}%` }
              ]} 
            />
          </View>
          <Text style={styles.healthIcon}>💚</Text>
        </View>

        {/* Combo indicator */}
        {combo > 0 && (
          <Animated.View style={[styles.comboContainer, comboAnimatedStyle]}>
            <Text style={styles.comboText}>COMBO x{combo}</Text>
          </Animated.View>
        )}
      </View>

      {/* Pulsante spray */}
      <Pressable
        style={styles.sprayButton}
        onPressIn={handleSpray}
        disabled={ammo <= 0 || gameOver}
      >
        <Text style={styles.sprayButtonText}>
          {ammo > 0 ? '🔫 SPRAY' : '❌ NO AMMO'}
        </Text>
      </Pressable>

      {/* Istruzioni */}
      <View style={[styles.instructions, { paddingBottom: insets.bottom + 80 }]}>
        <Text style={styles.instructionsText}>Tocca per spruzzare sui parassiti</Text>
      </View>

      {/* Game Over overlay */}
      {gameOver && (
        <View style={styles.gameOverOverlay}>
          <Text style={styles.gameOverTitle}>GAME OVER</Text>
          <Text style={styles.gameOverScore}>Punteggio: {score.toLocaleString()}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => {
              setGameOver(false);
              setScore(0);
              setWave(1);
              setAmmo(99);
              setPlants(plants.map(p => ({ ...p, health: 100 })));
              setPests([]);
            }}
          >
            <Text style={styles.retryButtonText}>RIPROVA</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Logo */}
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

// ============================================
// STILI
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#fff',
    marginTop: 16,
    fontSize: 16,
  },
  canvasContainer: {
    flex: 1,
  },
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 20,
  },
  levelBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  waveText: {
    color: '#ccc',
    fontSize: 12,
  },
  ammoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  ammoIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  ammoText: {
    color: '#87CEEB',
    fontSize: 18,
    fontWeight: 'bold',
  },
  healthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  healthBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  healthIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  comboContainer: {
    position: 'absolute',
    top: 120,
    alignSelf: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  comboText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sprayButton: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sprayButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  instructions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverTitle: {
    color: '#FF4444',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  gameOverScore: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logo: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    width: 120,
    height: 60,
    opacity: 0.8,
  },
});

// Precarica i modelli GLB
useGLTF.preload(require('@/assets/models/plant03.glb'));
useGLTF.preload(require('@/assets/models/plant04.glb'));
useGLTF.preload(require('@/assets/models/spray.glb'));
