import React, { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, Text as DreiText, Stars } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, withRepeat, withSequence } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME = {
  primary: '#228B22',
  secondary: '#FFD700',
  background: '#1a1a2e',
  text: '#FFFFFF',
};

// --- 3D Components ---

function Timer3D({ duration, onComplete }) {
  const ref = useRef<THREE.Mesh>(null!)
  const [timeLeft, setTimeLeft] = useState(duration);

  useFrame((state, delta) => {
    if (timeLeft > 0) {
      const newTimeLeft = Math.max(0, timeLeft - delta);
      setTimeLeft(newTimeLeft);
      const scaleY = newTimeLeft / duration;
      if (ref.current) {
        ref.current.scale.y = scaleY;
        ref.current.position.y = - (1 - scaleY) * 2.5;
      }
    } else {
        onComplete();
    }
  });

  return (
    <group>
        <DreiText position={[0, 3.5, 0]} color={THEME.secondary} fontSize={0.8} anchorX="center">
            {Math.ceil(timeLeft).toString()}
        </DreiText>
        <mesh ref={ref} position={[0,0,0]}>
            <cylinderGeometry args={[0.5, 0.5, 5, 32]} />
            <meshStandardMaterial color={THEME.primary} emissive={THEME.primary} emissiveIntensity={0.5} />
        </mesh>
    </group>
  );
}

function ProgressBar3D({ progress }) {
    const scaleX = useSharedValue(0);
    scaleX.value = withTiming(progress, { duration: 500 });

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scaleX: scaleX.value }]
        }
    });

    return (
        <View style={styles.progressBarContainer}>
            <Animated.View style={[styles.progressBar, animatedStyle]} />
        </View>
    )
}

function Reward3D() {
    const ref = useRef<THREE.Group>(null!)
    useFrame(() => {
        if(ref.current) ref.current.rotation.y += 0.01;
    })
    return (
        <group ref={ref}>
            <mesh>
                <torusKnotGeometry args={[1, 0.3, 100, 16]} />
                <meshStandardMaterial color={THEME.secondary} emissive={THEME.secondary} emissiveIntensity={0.7} />
            </mesh>
        </group>
    )
}

function CompletionEffect() {
    const points = useRef<THREE.Points>(null!);
    const count = 500;
    const particles = useMemo(() => {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * 10;
        }
        return positions;
    }, []);

    useFrame((state, delta) => {
        if(points.current) {
            points.current.rotation.y += delta * 0.1;
            const positions = points.current.geometry.attributes.position.array as Float32Array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += delta * (Math.random() * 2);
                if(positions[i] > 5) positions[i] = -5;
            }
            points.current.geometry.attributes.position.needsUpdate = true;
        }
    });

    return (
        <points ref={points}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} array={particles} itemSize={3} />
            </bufferGeometry>
            <pointsMaterial size={0.05} color={THEME.secondary} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
        </points>
    )
}


// --- Main Component ---

const CHALLENGES_KEY = '@DailyChallenges:data';

const initialChallenges = [
  { id: 1, title: 'Vinci 3 partite di fila', progress: 0, target: 3, completed: false, reward: 'gold' },
  { id: 2, title: 'Ottieni 10 uccisioni con il fucile di precisione', progress: 0, target: 10, completed: false, reward: 'xp' },
  { id: 3, title: 'Completa una partita senza morire', progress: 0, target: 1, completed: false, reward: 'credits' },
];

const DailyChallenges3D = () => {
  const [challenges, setChallenges] = useState(initialChallenges);
  const [activeChallenge, setActiveChallenge] = useState(null);
  const [showCompletionEffect, setShowCompletionEffect] = useState(false);

  useEffect(() => {
    const loadChallenges = async () => {
      try {
        const savedChallenges = await AsyncStorage.getItem(CHALLENGES_KEY);
        if (savedChallenges !== null) {
          setChallenges(JSON.parse(savedChallenges));
        } else {
            await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(initialChallenges));
        }
      } catch (e) {
        console.error('Failed to load challenges.', e);
      }
    };
    loadChallenges();
  }, []);

  const saveChallenges = async (newChallenges) => {
      try {
          await AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(newChallenges));
          setChallenges(newChallenges);
      } catch(e) {
          console.error('Failed to save challenges.', e);
      }
  }

  const handleChallengeCompletion = (challengeId) => {
    const newChallenges = challenges.map(c => c.id === challengeId ? {...c, completed: true, progress: c.target} : c);
    saveChallenges(newChallenges);
    setActiveChallenge(null);
    setShowCompletionEffect(true);
    setTimeout(() => setShowCompletionEffect(false), 3000);
  };

  const handleSelectChallenge = (challenge) => {
      if(!challenge.completed) {
          setActiveChallenge(challenge);
      }
  }

  // Dummy function to simulate progress
  const simulateProgress = (challengeId) => {
      const newChallenges = challenges.map(c => {
          if(c.id === challengeId && !c.completed) {
              const newProgress = c.progress + 1;
              if(newProgress >= c.target) {
                  handleChallengeCompletion(c.id);
                  return {...c, progress: c.target, completed: true}
              }
              return {...c, progress: newProgress}
          }
          return c;
      });
      saveChallenges(newChallenges);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Sfide Giornaliere</Text>
      <View style={styles.mainContent}>
          <View style={styles.challengesList}>
              {challenges.map(challenge => (
                  <Pressable key={challenge.id} onPress={() => handleSelectChallenge(challenge)} onLongPress={() => simulateProgress(challenge.id)} style={[styles.challengeItem, challenge.completed && styles.completedItem]}>
                      <Text style={styles.challengeTitle}>{challenge.title}</Text>
                      <ProgressBar3D progress={challenge.progress / challenge.target} />
                      <Text style={styles.progressText}>{`${challenge.progress}/${challenge.target}`}</Text>
                      {challenge.completed && <Text style={styles.completedText}>COMPLETATA</Text>}
                  </Pressable>
              ))}
          </View>
          <View style={styles.sceneContainer}>
              <Canvas style={{ flex: 1 }} camera={{ position: [0, 2, 10], fov: 50 }}>
                  <ambientLight intensity={0.6} />
                  <pointLight position={[10, 10, 10]} color={THEME.secondary} intensity={1.5}/>
                  <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                  <Suspense fallback={null}>
                      {showCompletionEffect && <CompletionEffect />}
                      {activeChallenge ? (
                          <Timer3D duration={60 * 5} onComplete={() => handleChallengeCompletion(activeChallenge.id)} />
                      ) : (
                          !showCompletionEffect && <Reward3D />
                      )}
                  </Suspense>
                  <OrbitControls enabled={!activeChallenge} />
              </Canvas>
          </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  header: {
    color: THEME.secondary,
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 20,
    fontFamily: 'System',
    textShadowColor: 'rgba(255, 215, 0, 0.5)',
    textShadowOffset: {width: 0, height: 0},
    textShadowRadius: 10
  },
  mainContent: {
      flex: 1,
      flexDirection: 'row',
  },
  challengesList: {
      flex: 1,
      padding: 10,
  },
  sceneContainer: {
      flex: 1,
      borderLeftWidth: 1,
      borderColor: THEME.primary
  },
  challengeItem: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      padding: 15,
      borderRadius: 10,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: THEME.primary
  },
  completedItem: {
      borderColor: THEME.secondary,
      backgroundColor: 'rgba(255, 215, 0, 0.2)'
  },
  challengeTitle: {
      color: THEME.text,
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 10,
  },
  progressText: {
      color: THEME.text,
      fontSize: 12,
      textAlign: 'right',
      marginTop: 5
  },
  completedText: {
      color: THEME.secondary,
      fontWeight: 'bold',
      textAlign: 'center',
      marginTop: 5
  },
  progressBarContainer: {
      height: 10,
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 5,
      overflow: 'hidden'
  },
  progressBar: {
      height: '100%',
      backgroundColor: THEME.primary,
  }
});

export default DailyChallenges3D;
