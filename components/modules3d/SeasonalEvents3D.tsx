import React, { Suspense, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AppState, Platform } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Text as DreiText } from '@react-three/drei/native';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

// --- THEME COLORS ---
const COLORS = {
  background: '#1a1a2e',
  primary: '#228B22', // Green
  accent: '#FFD700',   // Gold
  text: '#FFFFFF',
};

// --- 3D COMPONENTS ---

const ThemedTorus = ({ color }) => {
  const ref = useRef<THREE.Mesh>(null!);
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.x += delta * 0.1;
      ref.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={ref} scale={1.2}>
      <torusGeometry args={[1, 0.1, 16, 100]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.8} />
    </mesh>
  );
};

const SpecialBoss = () => {
    const ref = useRef<THREE.Group>(null!);
    useFrame(({ clock }) => {
        if (ref.current) {
            ref.current.position.y = Math.sin(clock.getElapsedTime()) * 0.3;
        }
    });

    return (
        <group ref={ref}>
            <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color={COLORS.primary} emissive={COLORS.primary} emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, -0.5, 0]}>
                <coneGeometry args={[0.8, 1, 32]} />
                <meshStandardMaterial color={COLORS.accent} roughness={0.1} metalness={1} />
            </mesh>
        </group>
    );
};

const ExclusiveReward = ({ claimed }) => {
    const ref = useRef<THREE.Group>(null!);
    const scale = claimed ? 0 : 1;

    useFrame((_, delta) => {
        if (ref.current) {
            ref.current.rotation.y += delta * 0.7;
        }
    });

    return (
        <group ref={ref} scale={scale}>
            <DreiText
                position={[0, 1.5, 0]}
                color={COLORS.accent}
                fontSize={0.5}
                anchorX="center"
                anchorY="middle"
            >
                REWARD
            </DreiText>
            <mesh>
                <octahedronGeometry args={[0.8]} />
                <meshStandardMaterial color={COLORS.accent} emissive={COLORS.accent} emissiveIntensity={0.8} wireframe />
            </mesh>
        </group>
    );
};

// --- MAIN COMPONENT ---

const SeasonalEvents3D = () => {
  const [isRewardClaimed, setRewardClaimed] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  const buttonScale = useSharedValue(1);
  const notificationOpacity = useSharedValue(0);

  useEffect(() => {
    const loadRewardStatus = async () => {
      try {
        const status = await AsyncStorage.getItem('@seasonalEvent:rewardClaimed');
        if (status !== null) {
          setRewardClaimed(JSON.parse(status));
        }
      } catch (e) {
        console.error('Failed to load reward status.', e);
      }
    };

    loadRewardStatus();

    const subscription = AppState.addEventListener('change', nextAppState => {
        setAppState(nextAppState);
    });

    return () => {
        subscription.remove();
    };
  }, []);

  useEffect(() => {
    const saveRewardStatus = async () => {
      try {
        await AsyncStorage.setItem('@seasonalEvent:rewardClaimed', JSON.stringify(isRewardClaimed));
      } catch (e) {
        console.error('Failed to save reward status.', e);
      }
    };

    saveRewardStatus();

    if (isRewardClaimed) {
        notificationOpacity.value = withSequence(withTiming(1, { duration: 500 }), withTiming(0, { duration: 2500 }));
    }

  }, [isRewardClaimed]);

  const handleClaimPress = () => {
    if (!isRewardClaimed) {
      setRewardClaimed(true);
      buttonScale.value = withSpring(1.2, {}, () => {
        buttonScale.value = withSpring(1);
      });
    }
  };

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const animatedNotificationStyle = useAnimatedStyle(() => {
    return {
        opacity: notificationOpacity.value,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Winter Solstice Festival</Text>
        <Text style={styles.subtitle}>Defeat the Frost Guardian!</Text>
      </View>

      <View style={styles.canvasContainer}>
        {appState === 'active' && (
            <Canvas>
                <Suspense fallback={null}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <PerspectiveCamera makeDefault position={[0, 1, 8]} fov={75} />
                    
                    <ThemedTorus color={COLORS.primary} />
                    <SpecialBoss />
                    <ExclusiveReward claimed={isRewardClaimed} />

                    {Platform.OS !== 'web' && <OrbitControls enablePan={false} enableZoom={false} />} 
                </Suspense>
            </Canvas>
        )}
      </View>

      <Animated.View style={[styles.notification, animatedNotificationStyle]}>
          <Text style={styles.notificationText}>Reward Claimed!</Text>
      </Animated.View>

      <View style={styles.footer}>
        <Animated.View style={animatedButtonStyle}>
          <TouchableOpacity
            style={[styles.button, isRewardClaimed && styles.buttonDisabled]}
            onPress={handleClaimPress}
            disabled={isRewardClaimed}
          >
            <Text style={styles.buttonText}>
              {isRewardClaimed ? 'Reward Claimed' : 'Claim Exclusive Reward'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

// --- STYLES ---

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    paddingTop: 60, // For iOS safe area
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.accent,
    textAlign: 'center',
  },
  canvasContainer: {
    flex: 1,
  },
  footer: {
    padding: 20,
    paddingBottom: 40, // For iOS safe area
  },
  button: {
    backgroundColor: COLORS.accent,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#a9a9a9',
  },
  buttonText: {
    color: COLORS.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
  notification: {
    position: 'absolute',
    top: '50%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 20,
    borderRadius: 10,
  },
  notificationText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default SeasonalEvents3D;
