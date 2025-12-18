// @ts-nocheck
/**
 * Kurstaki Strike - Game Screen
 * 3D Plant Defense Game with GLB Models
 * Uses expo-three and expo-gl for 3D rendering
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Dimensions,
  PanResponder,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer, THREE } from 'expo-three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Asset } from 'expo-asset';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Game Constants
const GAME_CONFIG = {
  INITIAL_PLANT_HEALTH: 100,
  INITIAL_AMMO: 99,
  SPRAY_DAMAGE: 15,
  SPRAY_RANGE: 4,
  PEST_SPAWN_INTERVAL: 2000,
  PEST_DAMAGE: 5,
  PEST_SPEED: 0.02,
  WAVE_PEST_COUNT: 5,
  BOSS_SPAWN_WAVE: 5,
};

// Pest Types
const PEST_TYPES = {
  caterpillar: { health: 30, speed: 0.015, damage: 5, color: 0x8BC34A, scale: 0.3 },
  spider: { health: 20, speed: 0.025, damage: 3, color: 0x607D8B, scale: 0.25 },
  aphid: { health: 15, speed: 0.03, damage: 2, color: 0x4CAF50, scale: 0.15 },
  beetle: { health: 50, speed: 0.01, damage: 8, color: 0x795548, scale: 0.35 },
};

interface Pest {
  id: string;
  type: keyof typeof PEST_TYPES;
  mesh: THREE.Mesh;
  health: number;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  isAlive: boolean;
}

interface SprayParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
}

export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const glRef = useRef<GLView>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const plantModelRef = useRef<THREE.Group | null>(null);
  const sprayModelRef = useRef<THREE.Group | null>(null);
  const pestsRef = useRef<Pest[]>([]);
  const sprayParticlesRef = useRef<SprayParticle[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const lastSpawnTimeRef = useRef<number>(0);
  
  // Game State
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [gameState, setGameState] = useState<'loading' | 'playing' | 'paused' | 'gameover' | 'victory'>('loading');
  const [level, setLevel] = useState(1);
  const [wave, setWave] = useState(1);
  const [totalWaves, setTotalWaves] = useState(3);
  const [score, setScore] = useState(0);
  const [plantHealth, setPlantHealth] = useState(GAME_CONFIG.INITIAL_PLANT_HEALTH);
  const [ammo, setAmmo] = useState(GAME_CONFIG.INITIAL_AMMO);
  const [isSpraying, setIsSpraying] = useState(false);
  const [pestsKilled, setPestsKilled] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  
  // Touch position for spray direction
  const [touchPosition, setTouchPosition] = useState({ x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 });

  // Check premium status
  useEffect(() => {
    const checkPremium = async () => {
      const premium = await AsyncStorage.getItem('isPremium');
      setIsPremium(premium === 'true');
    };
    checkPremium();
  }, []);

  // Load 3D models
  const loadModels = async (gl: WebGLRenderingContext) => {
    try {
      setLoadingProgress(10);
      
      // Create renderer
      const renderer = new Renderer({ gl });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
      renderer.setClearColor(0x1a1a2e, 1);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      rendererRef.current = renderer;
      
      setLoadingProgress(20);
      
      // Create scene
      const scene = new THREE.Scene();
      scene.fog = new THREE.Fog(0x1a1a2e, 5, 20);
      sceneRef.current = scene;
      
      setLoadingProgress(30);
      
      // Create camera
      const camera = new THREE.PerspectiveCamera(
        75,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        0.1,
        100
      );
      camera.position.set(0, 2, 5);
      camera.lookAt(0, 1, 0);
      cameraRef.current = camera;
      
      setLoadingProgress(40);
      
      // Add lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      scene.add(directionalLight);
      
      const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2d5016, 0.5);
      scene.add(hemisphereLight);
      
      setLoadingProgress(50);
      
      // Create ground/terrain
      const groundGeometry = new THREE.PlaneGeometry(20, 20);
      const groundMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2d5016,
        roughness: 0.8,
        metalness: 0.1,
      });
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = 0;
      ground.receiveShadow = true;
      scene.add(ground);
      
      setLoadingProgress(60);
      
      // Load plant model (plant03.glb or plant04.glb)
      const loader = new GLTFLoader();
      
      try {
        // Try to load the GLB model
        const plantAsset = Asset.fromModule(require('@/assets/models/plant03.glb'));
        await plantAsset.downloadAsync();
        
        const plantGltf = await new Promise<THREE.Group>((resolve, reject) => {
          loader.load(
            plantAsset.localUri || plantAsset.uri,
            (gltf) => resolve(gltf.scene),
            undefined,
            reject
          );
        });
        
        plantGltf.scale.set(1, 1, 1);
        plantGltf.position.set(0, 0, 0);
        plantGltf.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        scene.add(plantGltf);
        plantModelRef.current = plantGltf;
        
        setLoadingProgress(75);
      } catch (e) {
        console.log('GLB load failed, creating procedural plant:', e);
        // Fallback: Create procedural 3D plant
        const plantGroup = createProceduralPlant();
        scene.add(plantGroup);
        plantModelRef.current = plantGroup;
        setLoadingProgress(75);
      }
      
      // Load spray bottle model
      try {
        const sprayAsset = Asset.fromModule(require('@/assets/models/spray.glb'));
        await sprayAsset.downloadAsync();
        
        const sprayGltf = await new Promise<THREE.Group>((resolve, reject) => {
          loader.load(
            sprayAsset.localUri || sprayAsset.uri,
            (gltf) => resolve(gltf.scene),
            undefined,
            reject
          );
        });
        
        sprayGltf.scale.set(0.5, 0.5, 0.5);
        sprayGltf.position.set(2, 1, 3);
        sprayGltf.rotation.y = -Math.PI / 4;
        scene.add(sprayGltf);
        sprayModelRef.current = sprayGltf;
        
        setLoadingProgress(90);
      } catch (e) {
        console.log('Spray GLB load failed, creating procedural spray:', e);
        // Fallback: Create procedural spray bottle
        const sprayGroup = createProceduralSprayBottle();
        scene.add(sprayGroup);
        sprayModelRef.current = sprayGroup;
        setLoadingProgress(90);
      }
      
      // Add sky dome
      const skyGeometry = new THREE.SphereGeometry(50, 32, 32);
      const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x1a1a2e,
        side: THREE.BackSide,
      });
      const sky = new THREE.Mesh(skyGeometry, skyMaterial);
      scene.add(sky);
      
      setLoadingProgress(100);
      setIsLoading(false);
      setGameState('playing');
      
      // Start game loop
      startGameLoop(renderer, scene, camera);
      
    } catch (error) {
      console.error('Error loading 3D models:', error);
      setIsLoading(false);
    }
  };

  // Create procedural 3D plant (fallback if GLB fails)
  const createProceduralPlant = (): THREE.Group => {
    const plantGroup = new THREE.Group();
    
    // Main stem
    const stemGeometry = new THREE.CylinderGeometry(0.05, 0.08, 2, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a7c3f,
      roughness: 0.7,
    });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 1;
    stem.castShadow = true;
    plantGroup.add(stem);
    
    // Create leaves
    const leafMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a7d3a,
      roughness: 0.6,
      side: THREE.DoubleSide,
    });
    
    for (let i = 0; i < 7; i++) {
      const leafGroup = new THREE.Group();
      
      // Create cannabis-style leaf with multiple fingers
      const fingerCount = 5 + Math.floor(Math.random() * 4);
      for (let f = 0; f < fingerCount; f++) {
        const fingerLength = 0.3 + Math.random() * 0.2;
        const fingerWidth = 0.05 + Math.random() * 0.03;
        const fingerGeometry = new THREE.ConeGeometry(fingerWidth, fingerLength, 4);
        const finger = new THREE.Mesh(fingerGeometry, leafMaterial);
        
        const angle = ((f - Math.floor(fingerCount / 2)) / fingerCount) * Math.PI * 0.6;
        finger.position.x = Math.sin(angle) * 0.1;
        finger.position.y = fingerLength / 2;
        finger.position.z = Math.cos(angle) * 0.05;
        finger.rotation.z = -angle * 0.5;
        finger.castShadow = true;
        
        leafGroup.add(finger);
      }
      
      const height = 0.5 + i * 0.25;
      const angle = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
      leafGroup.position.set(
        Math.cos(angle) * 0.15,
        height,
        Math.sin(angle) * 0.15
      );
      leafGroup.rotation.y = angle;
      leafGroup.rotation.x = Math.PI * 0.3;
      leafGroup.scale.setScalar(0.8 + Math.random() * 0.4);
      
      plantGroup.add(leafGroup);
    }
    
    // Add buds at top
    const budGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const budMaterial = new THREE.MeshStandardMaterial({
      color: 0x7cb342,
      roughness: 0.4,
    });
    
    for (let i = 0; i < 3; i++) {
      const bud = new THREE.Mesh(budGeometry, budMaterial);
      const angle = (i / 3) * Math.PI * 2;
      bud.position.set(
        Math.cos(angle) * 0.1,
        2 + Math.random() * 0.2,
        Math.sin(angle) * 0.1
      );
      bud.scale.setScalar(0.5 + Math.random() * 0.3);
      bud.castShadow = true;
      plantGroup.add(bud);
    }
    
    return plantGroup;
  };

  // Create procedural spray bottle (fallback if GLB fails)
  const createProceduralSprayBottle = (): THREE.Group => {
    const sprayGroup = new THREE.Group();
    
    // Bottle body
    const bodyGeometry = new THREE.CylinderGeometry(0.15, 0.2, 0.6, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x2196F3,
      roughness: 0.3,
      metalness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3;
    sprayGroup.add(body);
    
    // Spray head
    const headGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.15, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.2,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.68;
    sprayGroup.add(head);
    
    // Nozzle
    const nozzleGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.1, 8);
    const nozzle = new THREE.Mesh(nozzleGeometry, headMaterial);
    nozzle.position.set(0.08, 0.75, 0);
    nozzle.rotation.z = -Math.PI / 4;
    sprayGroup.add(nozzle);
    
    // Trigger
    const triggerGeometry = new THREE.BoxGeometry(0.03, 0.1, 0.05);
    const trigger = new THREE.Mesh(triggerGeometry, headMaterial);
    trigger.position.set(-0.1, 0.65, 0);
    sprayGroup.add(trigger);
    
    sprayGroup.position.set(2, 1, 3);
    sprayGroup.rotation.y = -Math.PI / 4;
    
    return sprayGroup;
  };

  // Create pest 3D mesh
  const createPest3D = (type: keyof typeof PEST_TYPES): THREE.Mesh => {
    const pestConfig = PEST_TYPES[type];
    
    // Create pest body
    const geometry = new THREE.SphereGeometry(pestConfig.scale, 16, 16);
    geometry.scale(1, 0.6, 1.5); // Make it more bug-like
    
    const material = new THREE.MeshStandardMaterial({
      color: pestConfig.color,
      roughness: 0.5,
      metalness: 0.1,
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    
    // Add legs
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    for (let i = 0; i < 6; i++) {
      const legGeometry = new THREE.CylinderGeometry(0.01, 0.01, pestConfig.scale * 0.8, 4);
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      const angle = ((i % 3) - 1) * 0.4;
      const side = i < 3 ? 1 : -1;
      leg.position.set(side * pestConfig.scale * 0.3, -pestConfig.scale * 0.2, angle * pestConfig.scale);
      leg.rotation.z = side * Math.PI / 4;
      mesh.add(leg);
    }
    
    // Add eyes
    const eyeGeometry = new THREE.SphereGeometry(pestConfig.scale * 0.15, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(pestConfig.scale * 0.2, pestConfig.scale * 0.2, pestConfig.scale * 0.5);
    mesh.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(-pestConfig.scale * 0.2, pestConfig.scale * 0.2, pestConfig.scale * 0.5);
    mesh.add(rightEye);
    
    return mesh;
  };

  // Spawn pest
  const spawnPest = () => {
    if (!sceneRef.current) return;
    
    const types = Object.keys(PEST_TYPES) as (keyof typeof PEST_TYPES)[];
    const type = types[Math.floor(Math.random() * types.length)];
    const pestConfig = PEST_TYPES[type];
    
    const mesh = createPest3D(type);
    
    // Random spawn position around the plant
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 3;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    
    mesh.position.set(x, 0.3, z);
    sceneRef.current.add(mesh);
    
    const pest: Pest = {
      id: `pest_${Date.now()}_${Math.random()}`,
      type,
      mesh,
      health: pestConfig.health,
      position: new THREE.Vector3(x, 0.3, z),
      targetPosition: new THREE.Vector3(0, 0.5, 0), // Target the plant
      isAlive: true,
    };
    
    pestsRef.current.push(pest);
  };

  // Create spray particles
  const createSprayParticles = (origin: THREE.Vector3, direction: THREE.Vector3) => {
    if (!sceneRef.current) return;
    
    const particleCount = 20;
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00bcd4,
      transparent: true,
      opacity: 0.7,
    });
    
    for (let i = 0; i < particleCount; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.02, 4, 4);
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      particle.position.copy(origin);
      
      const spread = 0.3;
      const velocity = direction.clone().multiplyScalar(0.3 + Math.random() * 0.2);
      velocity.x += (Math.random() - 0.5) * spread;
      velocity.y += (Math.random() - 0.5) * spread;
      velocity.z += (Math.random() - 0.5) * spread;
      
      sceneRef.current.add(particle);
      sprayParticlesRef.current.push({
        mesh: particle,
        velocity,
        life: 1.0,
      });
    }
  };

  // Handle spray action
  const handleSpray = useCallback(() => {
    if (ammo <= 0 || gameState !== 'playing') return;
    
    setAmmo(prev => prev - 1);
    setIsSpraying(true);
    
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Calculate spray direction from touch position
    if (cameraRef.current && sprayModelRef.current) {
      const sprayOrigin = sprayModelRef.current.position.clone();
      sprayOrigin.y += 0.5;
      
      // Direction towards center of screen / plant
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(cameraRef.current.quaternion);
      
      createSprayParticles(sprayOrigin, direction);
      
      // Check for pest hits
      pestsRef.current.forEach(pest => {
        if (!pest.isAlive) return;
        
        const distance = sprayOrigin.distanceTo(pest.position);
        if (distance < GAME_CONFIG.SPRAY_RANGE) {
          // Calculate angle to pest
          const toPest = pest.position.clone().sub(sprayOrigin).normalize();
          const angle = direction.angleTo(toPest);
          
          if (angle < 0.5) { // Within spray cone
            const damage = GAME_CONFIG.SPRAY_DAMAGE * (1 - distance / GAME_CONFIG.SPRAY_RANGE);
            pest.health -= damage;
            
            if (pest.health <= 0) {
              pest.isAlive = false;
              if (sceneRef.current) {
                sceneRef.current.remove(pest.mesh);
              }
              setPestsKilled(prev => prev + 1);
              setScore(prev => prev + 100);
              
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            }
          }
        }
      });
    }
    
    setTimeout(() => setIsSpraying(false), 100);
  }, [ammo, gameState]);

  // Game loop
  const startGameLoop = (renderer: Renderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    let lastTime = 0;
    
    const animate = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;
      
      if (gameState === 'playing') {
        // Spawn pests
        if (time - lastSpawnTimeRef.current > GAME_CONFIG.PEST_SPAWN_INTERVAL) {
          const pestsInWave = pestsRef.current.filter(p => p.isAlive).length;
          if (pestsInWave < GAME_CONFIG.WAVE_PEST_COUNT) {
            spawnPest();
          }
          lastSpawnTimeRef.current = time;
        }
        
        // Update pests
        pestsRef.current.forEach(pest => {
          if (!pest.isAlive) return;
          
          // Move towards plant
          const direction = pest.targetPosition.clone().sub(pest.position).normalize();
          const speed = PEST_TYPES[pest.type].speed;
          pest.position.add(direction.multiplyScalar(speed));
          pest.mesh.position.copy(pest.position);
          
          // Rotate to face direction
          pest.mesh.lookAt(pest.targetPosition);
          
          // Check if reached plant
          if (pest.position.distanceTo(pest.targetPosition) < 0.5) {
            // Damage plant
            setPlantHealth(prev => {
              const newHealth = prev - PEST_TYPES[pest.type].damage;
              if (newHealth <= 0) {
                setGameState('gameover');
              }
              return Math.max(0, newHealth);
            });
            
            // Remove pest after attacking
            pest.isAlive = false;
            if (sceneRef.current) {
              sceneRef.current.remove(pest.mesh);
            }
          }
        });
        
        // Update spray particles
        sprayParticlesRef.current = sprayParticlesRef.current.filter(particle => {
          particle.life -= deltaTime * 2;
          if (particle.life <= 0) {
            if (sceneRef.current) {
              sceneRef.current.remove(particle.mesh);
            }
            return false;
          }
          
          particle.mesh.position.add(particle.velocity);
          particle.velocity.y -= 0.01; // Gravity
          (particle.mesh.material as THREE.MeshBasicMaterial).opacity = particle.life;
          
          return true;
        });
        
        // Animate plant (subtle sway)
        if (plantModelRef.current) {
          plantModelRef.current.rotation.z = Math.sin(time * 0.001) * 0.02;
        }
        
        // Check wave completion
        const alivePests = pestsRef.current.filter(p => p.isAlive).length;
        if (pestsKilled >= GAME_CONFIG.WAVE_PEST_COUNT * wave && alivePests === 0) {
          if (wave >= totalWaves) {
            // Level complete
            handleLevelComplete();
          } else {
            // Next wave
            setWave(prev => prev + 1);
            setPestsKilled(0);
          }
        }
      }
      
      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  // Handle level complete
  const handleLevelComplete = async () => {
    setGameState('victory');
    
    // Save progress
    const stats = await AsyncStorage.getItem('gameStats');
    const parsed = stats ? JSON.parse(stats) : {};
    await AsyncStorage.setItem('gameStats', JSON.stringify({
      ...parsed,
      highScore: Math.max(parsed.highScore || 0, score),
      totalPestsKilled: (parsed.totalPestsKilled || 0) + pestsKilled,
      levelsCompleted: (parsed.levelsCompleted || 0) + 1,
      currentLevel: level + 1,
    }));
    
    // Check if need to show paywall (after level 1 for non-premium)
    if (level === 1 && !isPremium) {
      setTimeout(() => {
        router.push('/paywall');
      }, 2000);
    }
  };

  // Touch handlers
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setTouchPosition({ x: locationX, y: locationY });
        handleSpray();
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setTouchPosition({ x: locationX, y: locationY });
      },
      onPanResponderRelease: () => {
        setIsSpraying(false);
      },
    })
  ).current;

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Context creation handler
  const onContextCreate = async (gl: WebGLRenderingContext) => {
    await loadModels(gl);
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={[styles.logoContainer, { top: insets.top + 10 }]}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </View>
      
      {/* 3D Game View */}
      <GLView
        ref={glRef}
        style={styles.glView}
        onContextCreate={onContextCreate}
        {...panResponder.panHandlers}
      />
      
      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <ThemedText style={styles.loadingText}>
            Caricamento modelli 3D... {loadingProgress}%
          </ThemedText>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${loadingProgress}%` }]} />
          </View>
        </View>
      )}
      
      {/* Game UI Overlay */}
      {gameState === 'playing' && (
        <View style={[styles.uiOverlay, { paddingTop: insets.top + 60 }]}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.levelBadge}>
              <ThemedText style={styles.levelText}>LV {level}</ThemedText>
            </View>
            
            <View style={styles.scoreContainer}>
              <ThemedText style={styles.scoreText}>{score}</ThemedText>
              <ThemedText style={styles.waveText}>Wave {wave}/{totalWaves}</ThemedText>
            </View>
            
            <View style={styles.ammoContainer}>
              <ThemedText style={styles.ammoIcon}>💧</ThemedText>
              <ThemedText style={styles.ammoText}>{ammo}</ThemedText>
            </View>
          </View>
          
          {/* Health Bar */}
          <View style={styles.healthBarContainer}>
            <View style={styles.healthBar}>
              <View 
                style={[
                  styles.healthFill, 
                  { 
                    width: `${plantHealth}%`,
                    backgroundColor: plantHealth > 50 ? '#4CAF50' : plantHealth > 25 ? '#FFC107' : '#F44336',
                  }
                ]} 
              />
            </View>
            <ThemedText style={styles.healthIcon}>💚</ThemedText>
          </View>
          
          {/* Instructions */}
          <View style={styles.instructionsContainer}>
            <ThemedText style={styles.instructionsText}>
              Tocca per spruzzare
            </ThemedText>
          </View>
        </View>
      )}
      
      {/* Game Over Overlay */}
      {gameState === 'gameover' && (
        <View style={styles.gameOverOverlay}>
          <ThemedText style={styles.gameOverTitle}>Game Over</ThemedText>
          <ThemedText style={styles.gameOverScore}>Punteggio: {score}</ThemedText>
          <ThemedText style={styles.gameOverKills}>Parassiti eliminati: {pestsKilled}</ThemedText>
          <View style={styles.gameOverButtons}>
            <ThemedText 
              style={styles.retryButton}
              onPress={() => {
                setGameState('playing');
                setPlantHealth(GAME_CONFIG.INITIAL_PLANT_HEALTH);
                setAmmo(GAME_CONFIG.INITIAL_AMMO);
                setScore(0);
                setPestsKilled(0);
                setWave(1);
                pestsRef.current.forEach(p => {
                  if (sceneRef.current) sceneRef.current.remove(p.mesh);
                });
                pestsRef.current = [];
              }}
            >
              Riprova
            </ThemedText>
            <ThemedText 
              style={styles.homeButton}
              onPress={() => router.push('/(tabs)')}
            >
              Home
            </ThemedText>
          </View>
        </View>
      )}
      
      {/* Victory Overlay */}
      {gameState === 'victory' && (
        <View style={styles.victoryOverlay}>
          <ThemedText style={styles.victoryTitle}>Vittoria!</ThemedText>
          <ThemedText style={styles.victoryScore}>Punteggio: {score}</ThemedText>
          <ThemedText style={styles.victoryKills}>Parassiti eliminati: {pestsKilled}</ThemedText>
          <ThemedText 
            style={styles.continueButton}
            onPress={() => {
              if (level === 1 && !isPremium) {
                router.push('/paywall');
              } else {
                setLevel(prev => prev + 1);
                setGameState('playing');
                setPlantHealth(GAME_CONFIG.INITIAL_PLANT_HEALTH);
                setAmmo(GAME_CONFIG.INITIAL_AMMO);
                setWave(1);
                setPestsKilled(0);
              }
            }}
          >
            {level === 1 && !isPremium ? 'Continua' : 'Livello Successivo'}
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  logoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  logo: {
    width: 150,
    height: 50,
  },
  glView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
  },
  progressBar: {
    width: 200,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  uiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelBadge: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
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
    fontSize: 28,
    fontWeight: 'bold',
  },
  waveText: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  ammoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ammoIcon: {
    fontSize: 16,
    marginRight: 4,
  },
  ammoText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  healthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  healthBar: {
    flex: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  healthFill: {
    height: '100%',
    borderRadius: 6,
  },
  healthIcon: {
    fontSize: 20,
    marginLeft: 8,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: -SCREEN_HEIGHT + 150,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameOverTitle: {
    color: '#F44336',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  gameOverScore: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 8,
  },
  gameOverKills: {
    color: '#9CA3AF',
    fontSize: 16,
    marginBottom: 40,
  },
  gameOverButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    overflow: 'hidden',
  },
  homeButton: {
    backgroundColor: '#607D8B',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    overflow: 'hidden',
  },
  victoryOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  victoryTitle: {
    color: '#4CAF50',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  victoryScore: {
    color: '#fff',
    fontSize: 24,
    marginBottom: 8,
  },
  victoryKills: {
    color: '#9CA3AF',
    fontSize: 16,
    marginBottom: 40,
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    overflow: 'hidden',
  },
});
