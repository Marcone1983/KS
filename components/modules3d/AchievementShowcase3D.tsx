import React, { useRef, useState, useEffect, Suspense } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, AppState } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Environment, ContactShadows } from '@react-three/drei/native';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, runOnJS } from 'react-native-reanimated';

// --- Achievement Data ---
type Achievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  modelPath?: string; // Optional: for custom models per achievement
};

const initialAchievements: Achievement[] = [
  { id: 'first_strike', title: 'First Strike', description: 'Win your first match', unlocked: false },
  { id: 'headhunter', title: 'Headhunter', description: 'Achieve 100 headshots', unlocked: false },
  { id: 'master_strategist', title: 'Master Strategist', description: 'Win 50 matches', unlocked: false },
  { id: 'legendary', title: 'Legendary', description: 'Reach the highest rank', unlocked: false },
];

// --- 3D Badge Component ---
const Badge = ({ unlocked, position, rotation, scale, onSelect, selected }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      if (hovered) {
        meshRef.current.scale.set(scale * 1.2, scale * 1.2, scale * 1.2);
      } else {
        meshRef.current.scale.set(scale, scale, scale);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      rotation={rotation}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={onSelect}
    >
      <cylinderGeometry args={[1, 1, 0.2, 64]} />
      <meshStandardMaterial color={unlocked ? '#FFD700' : '#555'} metalness={0.8} roughness={0.2} />
    </mesh>
  );
};

// --- 3D Scene ---
const Scene = ({ achievements, onSelectAchievement, selectedAchievement }) => {
  return (
    <Suspense fallback={null}>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <spotLight position={[-10, 10, 5]} angle={0.3} penumbra={1} intensity={2} castShadow />

      {achievements.map((ach, index) => (
        <Badge
          key={ach.id}
          unlocked={ach.unlocked}
          position={[(index % 2) * 4 - 2, Math.floor(index / 2) * -4 + 2, 0]}
          rotation={[0, 0, 0]}
          scale={1}
          onSelect={() => onSelectAchievement(ach)}
          selected={selectedAchievement?.id === ach.id}
        />
      ))}

      <OrbitControls enablePan={false} enableZoom={true} minDistance={5} maxDistance={20} />
      <Environment preset="sunset" />
      <ContactShadows position={[0, -5, 0]} opacity={0.7} scale={20} blur={1} far={10} resolution={256} color="#000000" />
    </Suspense>
  );
};

// --- Main Component ---
const AchievementShowcase3D = () => {
  const [achievements, setAchievements] = useState<Achievement[]>(initialAchievements);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(50);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  useEffect(() => {
    const loadAchievements = async () => {
      try {
        const savedAchievements = await AsyncStorage.getItem('achievements');
        if (savedAchievements) {
          setAchievements(JSON.parse(savedAchievements));
        } else {
          // For demonstration, unlock one achievement initially
          const updatedAchievements = initialAchievements.map(a => a.id === 'first_strike' ? { ...a, unlocked: true } : a);
          setAchievements(updatedAchievements);
          await AsyncStorage.setItem('achievements', JSON.stringify(updatedAchievements));
        }
      } catch (error) {
        console.error('Failed to load achievements:', error);
      }
    };

    loadAchievements();
  }, []);

  const handleSelectAchievement = (achievement: Achievement) => {
    setSelectedAchievement(achievement);
    opacity.value = withTiming(0, { duration: 150 }, () => {
      translateY.value = withTiming(50, { duration: 150 }, () => {
        runOnJS(setSelectedAchievement)(achievement);
        opacity.value = withTiming(1, { duration: 300 });
        translateY.value = withSpring(0);
      });
    });
  };

  const handleUnlockAchievement = async (id: string) => {
    const updatedAchievements = achievements.map(ach =>
      ach.id === id ? { ...ach, unlocked: true } : ach
    );
    setAchievements(updatedAchievements);
    await AsyncStorage.setItem('achievements', JSON.stringify(updatedAchievements));
  };

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Scene achievements={achievements} onSelectAchievement={handleSelectAchievement} selectedAchievement={selectedAchievement} />
      </Canvas>
      {selectedAchievement && (
        <Animated.View style={[styles.detailsPanel, animatedStyle]}>
          <Text style={styles.title}>{selectedAchievement.title}</Text>
          <Text style={styles.description}>{selectedAchievement.description}</Text>
          {!selectedAchievement.unlocked && (
            <TouchableOpacity style={styles.unlockButton} onPress={() => handleUnlockAchievement(selectedAchievement.id)}>
              <Text style={styles.unlockButtonText}>Unlock Now</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
      {/* Demo button to unlock an achievement */}
      <TouchableOpacity style={styles.demoButton} onPress={() => handleUnlockAchievement('headhunter')}>
        <Text style={styles.demoButtonText}>Unlock 'Headhunter'</Text>
      </TouchableOpacity>
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  canvas: {
    flex: 1,
  },
  detailsPanel: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  title: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  description: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  unlockButton: {
    backgroundColor: '#228B22',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'center',
  },
  unlockButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#228B22',
    padding: 10,
    borderRadius: 5,
  },
  demoButtonText: {
    color: 'white',
  },
});

export default AchievementShowcase3D;
