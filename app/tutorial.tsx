import { useRouter } from "expo-router";
import React, { useState, useRef, Suspense } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Animated as RNAnimated } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { useSounds } from '@/hooks/use-sounds';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, Easing } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  scene: '3d_plant' | '3d_spray' | '3d_shop' | '3d_breeding' | '3d_garden';
  action?: string;
  tip?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Benvenuto in Kurstaki Strike!',
    description: 'Un gioco dove coltivi piante e le proteggi dai parassiti. Iniziamo il tutorial!',
    icon: '🌱',
    scene: '3d_plant',
  },
  {
    id: 'plants',
    title: 'Le Tue Piante',
    description: 'Le piante sono il cuore del gioco. Devi farle crescere, nutrirle e proteggerle.',
    icon: '🌿',
    scene: '3d_plant',
    tip: 'Ogni pianta ha bisogno di acqua e nutrienti per crescere sana!',
  },
  {
    id: 'spray',
    title: 'Lo Spray',
    description: 'Usa lo spray per eliminare i parassiti che attaccano le tue piante.',
    icon: '🔫',
    scene: '3d_spray',
    action: 'Tocca lo schermo per spruzzare!',
    tip: 'Mira ai parassiti per eliminarli prima che danneggino le piante.',
  },
  {
    id: 'pests',
    title: 'I Parassiti',
    description: 'Afidi, bruchi e altri insetti attaccheranno le tue piante. Eliminali!',
    icon: '🐛',
    scene: '3d_spray',
    tip: 'Alcuni parassiti sono più resistenti di altri. Usa power-up per i boss!',
  },
  {
    id: 'shop',
    title: 'Lo Shop',
    description: 'Acquista nutrienti, power-up e decorazioni per migliorare il tuo garden.',
    icon: '🛒',
    scene: '3d_shop',
    tip: 'Guadagna monete completando sfide e eliminando parassiti.',
  },
  {
    id: 'breeding',
    title: 'Breeding',
    description: 'Incrocia le piante per creare nuove varietà con caratteristiche uniche.',
    icon: '🧬',
    scene: '3d_breeding',
    tip: 'Ogni incrocio può produrre risultati diversi. Sperimenta!',
  },
  {
    id: 'garden',
    title: 'Il Tuo Garden',
    description: 'Personalizza il tuo garden e condividilo con altri giocatori.',
    icon: '🏡',
    scene: '3d_garden',
    tip: 'Visita i garden degli altri per prendere ispirazione!',
  },
  {
    id: 'ready',
    title: 'Sei Pronto!',
    description: 'Ora sai tutto quello che serve. Buona fortuna, giardiniere!',
    icon: '🎉',
    scene: '3d_garden',
  },
];

// 3D Scene Components
function PlantScene() {
  const plantRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (plantRef.current) {
      plantRef.current.rotation.y += 0.005;
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
      plantRef.current.scale.set(breathe, breathe, breathe);
    }
  });

  return (
    <group ref={plantRef}>
      {/* Pot */}
      <mesh position={[0, -0.6, 0]}>
        <cylinderGeometry args={[0.4, 0.35, 0.5, 16]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Soil */}
      <mesh position={[0, -0.33, 0]}>
        <cylinderGeometry args={[0.38, 0.38, 0.06, 16]} />
        <meshStandardMaterial color="#3d2914" />
      </mesh>
      {/* Stem */}
      <mesh position={[0, 0.2, 0]}>
        <cylinderGeometry args={[0.05, 0.07, 1, 8]} />
        <meshStandardMaterial color="#2d5016" />
      </mesh>
      {/* Leaves */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh 
          key={i} 
          position={[
            Math.cos(i * Math.PI / 3) * 0.3,
            0.3 + i * 0.15,
            Math.sin(i * Math.PI / 3) * 0.3
          ]}
          rotation={[0.3, i * Math.PI / 3, 0.2]}
        >
          <sphereGeometry args={[0.15, 8, 8]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      ))}
      {/* Flower */}
      <mesh position={[0, 0.9, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

function SprayScene() {
  const sprayRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  
  useFrame((state) => {
    if (sprayRef.current) {
      sprayRef.current.rotation.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.01;
    }
  });

  const particlePositions = new Float32Array(100 * 3);
  for (let i = 0; i < 100; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * 2;
    particlePositions[i * 3 + 1] = Math.random() * 2;
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
  }

  return (
    <group>
      {/* Spray Bottle */}
      <group ref={sprayRef}>
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.2, 0.6, 16]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 0.2, 16]} />
          <meshStandardMaterial color="#1e40af" />
        </mesh>
        <mesh position={[0.15, 0.5, 0]} rotation={[0, 0, -Math.PI / 4]}>
          <cylinderGeometry args={[0.03, 0.03, 0.15, 8]} />
          <meshStandardMaterial color="#1e40af" />
        </mesh>
      </group>
      
      {/* Spray Particles */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={100}
            array={particlePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.05} color="#22c55e" transparent opacity={0.6} />
      </points>
    </group>
  );
}

function ShopScene() {
  const itemsRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (itemsRef.current) {
      itemsRef.current.rotation.y += 0.01;
      itemsRef.current.children.forEach((child, i) => {
        child.position.y = Math.sin(state.clock.elapsedTime * 2 + i) * 0.1;
      });
    }
  });

  return (
    <group ref={itemsRef}>
      {/* Potion */}
      <mesh position={[-0.6, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.4, 16]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.8} />
      </mesh>
      {/* Crystal */}
      <mesh position={[0, 0, 0]}>
        <octahedronGeometry args={[0.2]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.3} />
      </mesh>
      {/* Coin */}
      <mesh position={[0.6, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.05, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function BreedingScene() {
  const dnaRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (dnaRef.current) {
      dnaRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={dnaRef}>
      {/* DNA Helix */}
      {Array.from({ length: 20 }).map((_, i) => (
        <group key={i}>
          <mesh position={[Math.cos(i * 0.5) * 0.3, i * 0.1 - 1, Math.sin(i * 0.5) * 0.3]}>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
          <mesh position={[Math.cos(i * 0.5 + Math.PI) * 0.3, i * 0.1 - 1, Math.sin(i * 0.5 + Math.PI) * 0.3]}>
            <sphereGeometry args={[0.08]} />
            <meshStandardMaterial color="#a855f7" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function GardenScene() {
  const gardenRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (gardenRef.current) {
      gardenRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group ref={gardenRef}>
      {/* Ground */}
      <mesh position={[0, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#166534" />
      </mesh>
      {/* Plants */}
      {[[-0.5, 0.5], [0.5, 0.5], [-0.5, -0.5], [0.5, -0.5], [0, 0]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, -0.3, 0]}>
            <cylinderGeometry args={[0.15, 0.12, 0.2, 8]} />
            <meshStandardMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <coneGeometry args={[0.2, 0.5, 8]} />
            <meshStandardMaterial color={['#22c55e', '#16a34a', '#15803d', '#166534', '#14532d'][i]} />
          </mesh>
        </group>
      ))}
      {/* Fence */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 1.4, -0.2, Math.sin(angle) * 1.4]}>
            <boxGeometry args={[0.05, 0.4, 0.05]} />
            <meshStandardMaterial color="#92400e" />
          </mesh>
        );
      })}
    </group>
  );
}

export default function TutorialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  
  const [currentStep, setCurrentStep] = useState(0);
  const fadeAnim = useRef(new RNAnimated.Value(1)).current;
  
  const step = TUTORIAL_STEPS[currentStep];
  const progress = (currentStep + 1) / TUTORIAL_STEPS.length;

  const pulseScale = useSharedValue(1);
  
  React.useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const goToStep = (newStep: number) => {
    if (newStep < 0 || newStep >= TUTORIAL_STEPS.length) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    play('ui_tab_switch');
    
    RNAnimated.sequence([
      RNAnimated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    
    setTimeout(() => setCurrentStep(newStep), 150);
  };

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    play('ui_success');
    
    await AsyncStorage.setItem('tutorialCompleted', 'true');
    router.replace('/(tabs)');
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    play('ui_back');
    
    await AsyncStorage.setItem('tutorialCompleted', 'true');
    router.replace('/(tabs)');
  };

  const renderScene = () => {
    switch (step.scene) {
      case '3d_plant':
        return <PlantScene />;
      case '3d_spray':
        return <SprayScene />;
      case '3d_shop':
        return <ShopScene />;
      case '3d_breeding':
        return <BreedingScene />;
      case '3d_garden':
        return <GardenScene />;
      default:
        return <PlantScene />;
    }
  };

  return (
    <LinearGradient colors={['#0f172a', '#1e293b', '#334155']} style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
        {/* Skip Button */}
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <ThemedText style={styles.skipText}>Salta</ThemedText>
        </Pressable>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <ThemedText style={styles.progressText}>{currentStep + 1}/{TUTORIAL_STEPS.length}</ThemedText>
        </View>

        {/* 3D Scene */}
        <View style={styles.scene3D}>
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-5, 3, -5]} intensity={0.5} color="#22c55e" />
            <PerspectiveCamera makeDefault position={[0, 0.5, 3]} />
            <Suspense fallback={null}>
              {renderScene()}
            </Suspense>
          </Canvas>
        </View>

        {/* Content */}
        <RNAnimated.View style={[styles.contentCard, { opacity: fadeAnim }]}>
          <ThemedText style={styles.stepIcon}>{step.icon}</ThemedText>
          <ThemedText style={styles.stepTitle}>{step.title}</ThemedText>
          <ThemedText style={styles.stepDescription}>{step.description}</ThemedText>
          
          {step.action && (
            <Animated.View style={[styles.actionBadge, pulseStyle]}>
              <ThemedText style={styles.actionText}>👆 {step.action}</ThemedText>
            </Animated.View>
          )}
          
          {step.tip && (
            <View style={styles.tipContainer}>
              <ThemedText style={styles.tipLabel}>💡 Suggerimento</ThemedText>
              <ThemedText style={styles.tipText}>{step.tip}</ThemedText>
            </View>
          )}
        </RNAnimated.View>

        {/* Navigation */}
        <View style={[styles.navigation, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Pressable 
            style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
            onPress={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
          >
            <ThemedText style={styles.navButtonText}>← Indietro</ThemedText>
          </Pressable>
          
          {currentStep < TUTORIAL_STEPS.length - 1 ? (
            <Pressable 
              style={[styles.navButton, styles.navButtonPrimary]}
              onPress={() => goToStep(currentStep + 1)}
            >
              <ThemedText style={styles.navButtonTextPrimary}>Avanti →</ThemedText>
            </Pressable>
          ) : (
            <Pressable 
              style={[styles.navButton, styles.navButtonSuccess]}
              onPress={handleComplete}
            >
              <ThemedText style={styles.navButtonTextPrimary}>Inizia a Giocare! 🎮</ThemedText>
            </Pressable>
          )}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  skipButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  skipText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  progressText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  scene3D: {
    height: height * 0.35,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
  },
  contentCard: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  stepIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  actionBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  actionText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipContainer: {
    backgroundColor: 'rgba(251, 191, 36, 0.2)',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  tipLabel: {
    color: '#fbbf24',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  tipText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 20,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  navButtonSuccess: {
    backgroundColor: '#22c55e',
  },
  navButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
  },
  navButtonTextPrimary: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
