// @ts-nocheck
import React, { useRef, useState, useEffect, Suspense } from 'react';
import { StyleSheet, View, TouchableOpacity, Text as RNText } from 'react-native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Text, Box, Line } from '@react-three/drei/native';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

// --- Configuration & Theming ---
const THEME = {
  background: '#1a1a2e',
  unlocked: '#228B22', // Green
  locked: '#888888',
  connection: '#FFD700', // Gold
  textColor: '#FFFFFF',
};

// --- Data Structure ---
const researchData = {
  nodes: [
    { id: 'root', label: 'Core Tech', position: [0, 0, 0], parent: null },
    { id: 'node1', label: 'Propulsion', position: [-4, 2, 0], parent: 'root' },
    { id: 'node2', label: 'Weapons', position: [4, 2, 0], parent: 'root' },
    { id: 'node3', label: 'Defense', position: [0, -3, 0], parent: 'root' },
    { id: 'node4', label: 'Ion Drives', position: [-6, 4, 0], parent: 'node1' },
    { id: 'node5', label: 'Laser', position: [6, 4, 0], parent: 'node2' },
  ],
};

const STORAGE_KEY = '@ResearchTree:unlockedNodes';

// --- 3D Components ---
const Node = ({ node, unlocked, onUnlock }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  const scale = useSharedValue(unlocked ? 1.2 : 1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  useEffect(() => {
    scale.value = withTiming(unlocked ? 1.2 : 1, { duration: 500, easing: Easing.out(Easing.exp) });
  }, [unlocked]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  const handlePress = () => {
    if (!unlocked) {
      onUnlock(node.id);
    }
  };

  return (
    <group position={node.position}>
      <Box
        ref={meshRef}
        args={[1.5, 1.5, 1.5]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={handlePress}
      >
        <meshStandardMaterial color={unlocked ? THEME.unlocked : (hovered ? '#aaaaaa' : THEME.locked)} emissive={unlocked ? THEME.unlocked : '#000000'} emissiveIntensity={0.5} />
      </Box>
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.5}
        color={THEME.textColor}
        anchorX="center"
        anchorY="middle"
      >
        {node.label}
      </Text>
    </group>
  );
};

const Connection = ({ start, end }) => {
  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  return <Line points={points} color={THEME.connection} lineWidth={3} />;
};

// --- Main Component ---
const ResearchTree3D = () => {
  const [unlockedNodes, setUnlockedNodes] = useState(['root']);

  useEffect(() => {
    const loadState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedState !== null) {
          setUnlockedNodes(JSON.parse(savedState));
        }
      } catch (e) {
        console.error('Failed to load state.', e);
      }
    };
    loadState();
  }, []);

  const saveState = async (newState) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error('Failed to save state.', e);
    }
  };

  const handleUnlock = (nodeId) => {
    const nodeToUnlock = researchData.nodes.find(n => n.id === nodeId);
    if (nodeToUnlock && unlockedNodes.includes(nodeToUnlock.parent)) {
      const newState = [...unlockedNodes, nodeId];
      setUnlockedNodes(newState);
      saveState(newState);
    }
  };

  return (
    <View style={styles.container}>
      <Canvas style={{ flex: 1 }}>
        <color attach="background" args={[THEME.background]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Suspense fallback={null}>
          {researchData.nodes.map(node => (
            <Node key={node.id} node={node} unlocked={unlockedNodes.includes(node.id)} onUnlock={handleUnlock} />
          ))}
          {researchData.nodes
            .filter(node => node.parent && unlockedNodes.includes(node.id) && unlockedNodes.includes(node.parent))
            .map(node => {
              const parentNode = researchData.nodes.find(p => p.id === node.parent);
              return <Connection key={`${node.id}-conn`} start={parentNode.position} end={node.position} />;
            })}
        </Suspense>
        <PerspectiveCamera makeDefault position={[0, 0, 15]} fov={75} />
        <OrbitControls enablePan={true} enableZoom={true} />
      </Canvas>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
});

export default ResearchTree3D;
