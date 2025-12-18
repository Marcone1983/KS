import React, { useRef, useState, useEffect, Suspense } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, Sparkles } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, interpolate, Extrapolate } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- 3D Plant Component ---
const Plant = ({ level }) => {
  const groupRef = useRef<THREE.Group>(null);
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withTiming(1 + level * 0.02, { 
      duration: 800, 
      easing: Easing.bounce 
    });
  }, [level, scale]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  const animatedStyle = useAnimatedStyle(() => {
    return { transform: [{ scale: scale.value }] };
  });

  const stemHeight = 1.5 + level * 0.25;
  const leafCount = 4 + Math.floor(level / 2);

  return (
    <Animated.View style={[{flex: 1}, animatedStyle]}>
        <group ref={groupRef}>
          {/* Stem */}
          <mesh position={[0, stemHeight / 2 - 1.5, 0]}>
            <cylinderGeometry args={[0.1, 0.15, stemHeight, 12]} />
            <meshStandardMaterial color="#228B22" roughness={0.8} />
          </mesh>

          {/* Leaves */}
          {Array.from({ length: leafCount }).map((_, i) => {
            const angle = (i / leafCount) * Math.PI * 2;
            const yPos = (stemHeight / leafCount) * i - 1;
            const radius = 0.5 + (yPos / stemHeight) * 0.5;
            return (
              <mesh
                key={i}
                position={[Math.sin(angle) * radius, yPos, Math.cos(angle) * radius]}
                rotation-y={angle}
                rotation-z={Math.PI / 4}
              >
                <capsuleGeometry args={[0.3, 0.6, 4, 8]} />
                <meshStandardMaterial color="#FFD700" metalness={0.7} roughness={0.3} />
              </mesh>
            );
          })}
        </group>
    </Animated.View>
  );
};

// --- Animated Stat Component ---
const AnimatedStat = ({ label, value }) => {
    const animatedValue = useSharedValue(0);

    useEffect(() => {
        animatedValue.value = value;
    }, [value]);

    const animatedTextStyle = useAnimatedStyle(() => {
        const displayValue = Math.floor(interpolate(animatedValue.value, [0, value], [0, value]));
        return {
            transform: [{ scale: withTiming(1, {duration: 500}) }],
            opacity: withTiming(1, {duration: 500})
        };
    });

    return (
        <View style={styles.statRow}>
            <Text style={styles.statText}>{label}: </Text>
            <Animated.Text style={[styles.statValue, animatedTextStyle]}>{Math.floor(value)}</Animated.Text>
        </View>
    );
};

// --- Main Component ---
const PlantUpgrades3D = () => {
  const [level, setLevel] = useState(1);
  const [stats, setStats] = useState({ power: 10, health: 100 });
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = await AsyncStorage.getItem('plantData');
        if (savedData !== null) {
          const { level: savedLevel, stats: savedStats } = JSON.parse(savedData);
          setLevel(savedLevel);
          setStats(savedStats);
        }
      } catch (error) {
        console.error('Failed to load data from storage', error);
      }
    };
    loadData();
  }, []);

  const saveData = async (newLevel, newStats) => {
      try {
        const dataToSave = JSON.stringify({ level: newLevel, stats: newStats });
        await AsyncStorage.setItem('plantData', dataToSave);
      } catch (error) {
        console.error('Failed to save data to storage', error);
      }
  };

  const handleUpgrade = () => {
    if(isUpgrading) return;

    setIsUpgrading(true);
    const newLevel = level + 1;
    const newStats = {
      power: stats.power + 5 * (1 + level * 0.1),
      health: stats.health + 20 * (1 + level * 0.05),
    };

    setLevel(newLevel);
    setStats(newStats);
    saveData(newLevel, newStats);

    setTimeout(() => setIsUpgrading(false), 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Plant Evolution</Text>
      </View>

      <View style={styles.canvasContainer}>
        <Canvas>
          <ambientLight intensity={1.2} />
          <pointLight position={[10, 10, 2]} intensity={2.5} color="#FFD700" />
          <pointLight position={[-10, -5, -10]} intensity={1.0} color="#228B22" />
          <Suspense fallback={null}>
            <Plant level={level} />
            {isUpgrading && <Sparkles count={50} scale={5} size={10} speed={0.5} color="#FFD700" />}
          </Suspense>
          <OrbitControls enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.8} />
        </Canvas>
      </View>

      <View style={styles.uiContainer}>
        <View style={styles.statsContainer}>
          <Text style={styles.levelText}>LEVEL {level}</Text>
          <AnimatedStat label="Power" value={stats.power} />
          <AnimatedStat label="Health" value={stats.health} />
        </View>
        <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade} activeOpacity={0.7}>
          <Text style={styles.upgradeButtonText}>EVOLVE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFD700',
    textAlign: 'center',
    fontFamily: 'System',
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  canvasContainer: {
    flex: 3,
  },
  uiContainer: {
    flex: 2,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statsContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    borderColor: 'rgba(255, 215, 0, 0.5)',
    borderWidth: 1,
    marginBottom: 25,
  },
  levelText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: 15,
    letterSpacing: 2,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  statText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'System',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    color: '#FFFFFF',
    fontFamily: 'System',
    fontWeight: '700',
  },
  upgradeButton: {
    backgroundColor: '#228B22',
    paddingVertical: 18,
    paddingHorizontal: 50,
    borderRadius: 30,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 18,
    elevation: 12,
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default PlantUpgrades3D;
