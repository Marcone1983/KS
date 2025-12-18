// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- THEME COLORS ---
const COLORS = {
  background: '#1a1a2e',
  primary: '#228B22', // Green
  accent: '#FFD700',   // Gold
  text: '#FFFFFF',
};

// --- DATA PERSISTENCE ---
const STORAGE_KEY = '@playerProgression';

const saveData = async (data) => {
  try {
    const jsonValue = JSON.stringify(data);
    await AsyncStorage.setItem(STORAGE_KEY, jsonValue);
  } catch (e) {
    console.error("Failed to save data", e);
  }
};

const loadData = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem(STORAGE_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error("Failed to load data", e);
    return null;
  }
};

// --- 3D COMPONENTS ---

const XPBar3D = ({ progress }) => {
  const barRef = useRef();
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, { duration: 500 });
  }, [progress]);

  useFrame(() => {
    if (barRef.current) {
      barRef.current.scale.x = animatedProgress.value;
      // Add a subtle pulsation effect
      const pulsation = Math.sin(Date.now() * 0.005) * 0.02 + 1;
      barRef.current.scale.y = pulsation;
      barRef.current.scale.z = pulsation;
    }
  });

  return (
    <group position={[0, -1.5, 0]}>
      {/* Background of the bar */}
      <mesh>
        <boxGeometry args={[2.02, 0.22, 0.22]} />
        <meshStandardMaterial color="#000" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Foreground (the actual XP) */}
      <mesh ref={barRef} position={[-1 + progress, 0, 0]}>
        <boxGeometry args={[2, 0.2, 0.2]} />
        <meshStandardMaterial color={COLORS.primary} emissive={COLORS.primary} emissiveIntensity={0.7} toneMapped={false} />
      </mesh>
    </group>
  );
};

const SkillNode = ({ position, unlocked, onUnlock, skillName }) => {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.rotation.x += 0.005;
      if (hovered) {
        meshRef.current.scale.set(1.2, 1.2, 1.2);
      } else {
        meshRef.current.scale.set(1, 1, 1);
      }
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerDown={() => onUnlock(skillName)}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <octahedronGeometry args={[0.2, 0]} />
      <meshStandardMaterial 
        color={unlocked ? COLORS.accent : '#555'} 
        emissive={unlocked ? COLORS.accent : '#000'}
        emissiveIntensity={unlocked ? 1 : 0}
        metalness={0.9}
        roughness={0.1}
        wireframe={!unlocked}
      />
    </mesh>
  );
};

const SkillTree = ({ unlockedSkills, onUnlockSkill }) => {
    const skills = useMemo(() => [
        { name: 'Power Strike', position: [0, 1, 0] },
        { name: 'Rapid Fire', position: [-1, 0, 0] },
        { name: 'Healing Aura', position: [1, 0, 0] },
        { name: 'Stealth', position: [0, -1, 0] },
    ], []);

    const lines = useMemo(() => {
        const linePositions = [
            ...skills[0].position, ...skills[1].position,
            ...skills[0].position, ...skills[2].position,
            ...skills[1].position, ...skills[3].position,
            ...skills[2].position, ...skills[3].position,
        ];
        const lineGeometry = new THREE.BufferGeometry();
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        return lineGeometry;
    }, [skills]);

    return (
        <group position={[0, 0.5, -2]}>
            {skills.map(skill => (
                <SkillNode 
                    key={skill.name} 
                    position={skill.position} 
                    skillName={skill.name}
                    unlocked={unlockedSkills.includes(skill.name)}
                    onUnlock={onUnlockSkill}
                />
            ))}
            <lineSegments geometry={lines}>
                <lineBasicMaterial color={COLORS.primary} />
            </lineSegments>
        </group>
    );
};

const LevelUpEffect = ({ active }) => {
  const particlesRef = useRef();

  useFrame(() => {
    if (active && particlesRef.current) {
      particlesRef.current.rotation.y += 0.1;
      const time = Date.now() * 0.001;
      particlesRef.current.children.forEach((particle, i) => {
        const t = time + i * 0.1;
        particle.position.y = Math.sin(t) * 0.5;
        particle.scale.setScalar(Math.max(0, Math.cos(t * 2)));
      });
    }
  });

  if (!active) return null;

  return (
    <group ref={particlesRef}>
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color={COLORS.accent} emissive={COLORS.accent} emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  );
};

// --- MAIN COMPONENT ---

const PlayerProgression3D = () => {
  const [level, setLevel] = useState(1);
  const [xp, setXp] = useState(0);
  const [skillPoints, setSkillPoints] = useState(0);
  const [unlockedSkills, setUnlockedSkills] = useState([]);
  const [prestige, setPrestige] = useState(0);
  const [showLevelUp, setShowLevelUp] = useState(false);

  const xpToNextLevel = useMemo(() => level * 100, [level]);
  const xpProgress = useMemo(() => xp / xpToNextLevel, [xp, xpToNextLevel]);

  const levelUpAnim = useSharedValue(1);
  const prestigeAnim = useSharedValue(0);

  useEffect(() => {
    const init = async () => {
      const savedData = await loadData();
      if (savedData) {
        setLevel(savedData.level || 1);
        setXp(savedData.xp || 0);
        setSkillPoints(savedData.skillPoints || 0);
        setUnlockedSkills(savedData.unlockedSkills || []);
        setPrestige(savedData.prestige || 0);
      }
    };
    init();
  }, []);

  useEffect(() => {
    saveData({ level, xp, skillPoints, unlockedSkills, prestige });
  }, [level, xp, skillPoints, unlockedSkills, prestige]);

  const handleGainXp = () => {
    let newXp = xp + 25;
    if (newXp >= xpToNextLevel) {
      const remainingXp = newXp - xpToNextLevel;
      setLevel(level + 1);
      setXp(remainingXp);
      setSkillPoints(skillPoints + 1);
      triggerLevelUpEffect();
    } else {
      setXp(newXp);
    }
  };

  const handleUnlockSkill = (skillName) => {
    if (skillPoints > 0 && !unlockedSkills.includes(skillName)) {
      setUnlockedSkills([...unlockedSkills, skillName]);
      setSkillPoints(skillPoints - 1);
    }
  };

  const handlePrestige = () => {
    if (level >= 5) { // Prestige requirement
      setPrestige(prestige + 1);
      setLevel(1);
      setXp(0);
      setSkillPoints(0);
      setUnlockedSkills([]);
      triggerPrestigeEffect();
    }
  };

  const triggerLevelUpEffect = () => {
    setShowLevelUp(true);
    levelUpAnim.value = 0;
    levelUpAnim.value = withSpring(1, { damping: 2, stiffness: 80 });
    setTimeout(() => setShowLevelUp(false), 2000);
  };

  const triggerPrestigeEffect = () => {
    prestigeAnim.value = 0;
    prestigeAnim.value = withTiming(1, { duration: 1500 });
  };

  const animatedLevelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: levelUpAnim.value }],
    opacity: levelUpAnim.value
  }));

  const prestigeIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${prestigeAnim.value * 360}deg` }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Animated.View style={[styles.levelContainer, animatedLevelStyle]}>
          <Text style={styles.levelText}>{level}</Text>
        </Animated.View>
        <View style={styles.playerInfo}>
          <Text style={styles.playerName}>Player One</Text>
          <Text style={styles.playerTitle}>Kurstaki Striker</Text>
        </View>
        {prestige > 0 && (
          <Animated.View style={[styles.prestigeContainer, prestigeIconStyle]}>
            <Text style={styles.prestigeIcon}>{'⭐'.repeat(prestige)}</Text>
          </Animated.View>
        )}
      </View>

      <View style={styles.canvasContainer}>
        <Canvas>
          <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={75} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <XPBar3D progress={xpProgress} />
          <SkillTree unlockedSkills={unlockedSkills} onUnlockSkill={handleUnlockSkill} />
          <LevelUpEffect active={showLevelUp} />
        </Canvas>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.xpText}>{`XP: ${xp} / ${xpToNextLevel}`}</Text>
        <Text style={styles.skillPointText}>{`Skill Points: ${skillPoints}`}</Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.button} onPress={handleGainXp}>
          <Text style={styles.buttonText}>Gain XP</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, level < 5 && styles.buttonDisabled]} onPress={handlePrestige} disabled={level < 5}>
          <Text style={styles.buttonText}>Prestige</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  levelContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  levelText: {
    color: COLORS.background,
    fontSize: 28,
    fontWeight: 'bold',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  playerTitle: {
    color: COLORS.text,
    fontSize: 16,
    opacity: 0.8,
  },
  prestigeContainer: {
    padding: 5,
  },
  prestigeIcon: {
    fontSize: 24,
  },
  canvasContainer: {
    flex: 1,
  },
  statsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  xpText: {
    color: COLORS.text,
    fontSize: 18,
    marginBottom: 5,
  },
  skillPointText: {
    color: COLORS.accent,
    fontSize: 18,
    fontWeight: 'bold',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.primary,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  buttonDisabled: {
    backgroundColor: '#555',
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PlayerProgression3D;
