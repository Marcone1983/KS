import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Environment, Effects } from '@react-three/drei/native';
import { Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME = {
  primary: '#228B22', // Verde
  secondary: '#FFD700', // Oro
  background: '#1a1a2e', // Sfondo scuro
};

// Placeholder per i modelli 3D dei parassiti
const Parasite = (props) => {
  const mesh = useRef<THREE.Mesh>(null!)
  const [direction] = useState(new THREE.Vector3((Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2).normalize());
  const speed = 0.5;

  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.position.add(direction.clone().multiplyScalar(speed * delta));
      if (mesh.current.position.length() > 10) {
        mesh.current.position.set(0, 0, 0);
      }
      mesh.current.rotation.x += delta;
      mesh.current.rotation.y += delta;
    }
  });

  return (
    <mesh {...props} ref={mesh}>
      <icosahedronGeometry args={[0.5, 0]} />
      <meshStandardMaterial color={'hotpink'} roughness={0.5} metalness={0.8} />
    </mesh>
  );
};

const GameCoreAAA = () => {
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const comboTimeout = useRef<NodeJS.Timeout | null>(null);
  const scoreOpacity = useSharedValue(0);
  const scoreScale = useSharedValue(1);
  const comboScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  useEffect(() => {
    const loadScore = async () => {
      try {
        const savedScore = await AsyncStorage.getItem('score');
        if (savedScore !== null) {
          setScore(parseInt(savedScore, 10));
        }
      } catch (error) {
        console.error('Failed to load score from storage', error);
      }
    };
    loadScore();
  }, []);

  useEffect(() => {
    scoreOpacity.value = withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) });
    const saveScore = async () => {
      try {
        await AsyncStorage.setItem('score', score.toString());
      } catch (error) {
        console.error('Failed to save score to storage', error);
      }
    };
    saveScore();
  }, [score]);

  const animatedScoreStyle = useAnimatedStyle(() => {
    return {
      opacity: scoreOpacity.value,
      transform: [{ scale: scoreScale.value }],
    };
  });

  const animatedComboStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: comboScale.value }],
    };
  });

  const animatedButtonStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  const handleAttack = () => {
    setScore(prev => prev + 10 * (combo + 1));
    scoreScale.value = withTiming(1.2, { duration: 100 }, () => {
      scoreScale.value = withTiming(1, { duration: 100 });
    });
    setCombo(prev => prev + 1);
    comboScale.value = withTiming(1.2, { duration: 100 }, () => {
      comboScale.value = withTiming(1, { duration: 100 });
    });
    if (comboTimeout.current) {
      clearTimeout(comboTimeout.current);
    }
    comboTimeout.current = setTimeout(() => {
      setCombo(0);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <Canvas style={{ flex: 1 }}>
        <PerspectiveCamera makeDefault position={[0, 5, 15]} fov={75} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Environment preset="sunset" />

        <Parasite position={[-2, 0, 0]} />
        <Parasite position={[2, 0, 0]} />

        <OrbitControls />

        <Effects>
          <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} height={300} />
          <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
          <Vignette eskil={false} offset={0.1} darkness={1.1} />
        </Effects>
      </Canvas>
      <View style={styles.uiContainer}>
        <Animated.View style={[styles.scoreContainer, animatedScoreStyle]}>
          <Text style={styles.scoreText}>Score: {score}</Text>
          <Animated.View style={animatedComboStyle}><Text style={styles.comboText}>Combo: x{combo}</Text></Animated.View>
        </Animated.View>
        <TouchableOpacity 
          activeOpacity={0.9}
          onPressIn={() => buttonScale.value = withTiming(0.95, { duration: 100 })}
          onPressOut={() => buttonScale.value = withTiming(1, { duration: 100 })}
          onPress={handleAttack}
        >
          <Animated.View style={[styles.attackButton, animatedButtonStyle]}>
          <Text style={styles.attackButtonText}>Attack</Text>
          </Animated.View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  uiContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scoreContainer: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 10,
    marginBottom: 20,
  },
  scoreText: {
    color: THEME.secondary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  comboText: {
    color: THEME.primary,
    fontSize: 18,
    textAlign: 'center',
  },
  attackButton: {
    backgroundColor: THEME.primary,
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  attackButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});

export default GameCoreAAA;
