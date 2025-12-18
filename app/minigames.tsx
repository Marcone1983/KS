import { useRouter } from "expo-router";
import React, { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { View, StyleSheet, Pressable, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { useSounds } from '@/hooks/use-sounds';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

type MiniGame = 'catch_drop' | 'pest_defense' | 'speed_spray' | null;

interface GameStats {
  score: number;
  highScore: number;
  timeLeft: number;
  lives: number;
}

// 3D Water Drop for Catch the Drop
function WaterDrop3D({ position, onCatch }: { position: [number, number, number]; onCatch: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.y -= 0.05;
      meshRef.current.rotation.z += 0.02;
      
      if (meshRef.current.position.y < -3) {
        meshRef.current.position.y = 3;
        meshRef.current.position.x = (Math.random() - 0.5) * 4;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color="#4fc3f7" transparent opacity={0.8} />
    </mesh>
  );
}

// 3D Pest for Pest Defense
function Pest3D({ position, type, onHit }: { position: [number, number, number]; type: string; onHit: () => void }) {
  const meshRef = useRef<THREE.Group>(null);
  const [isHit, setIsHit] = useState(false);
  
  const colors: Record<string, string> = {
    aphid: '#8bc34a',
    spider: '#f44336',
    caterpillar: '#ff9800',
  };

  useFrame((state) => {
    if (meshRef.current && !isHit) {
      meshRef.current.position.x += Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.01;
      meshRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      <mesh>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={colors[type] || '#8bc34a'} />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.08, 0.08, 0.15]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <mesh position={[-0.08, 0.08, 0.15]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
    </group>
  );
}

// Game Selection Screen
function GameSelection({ onSelect }: { onSelect: (game: MiniGame) => void }) {
  const games = [
    { id: 'catch_drop' as MiniGame, name: 'Cattura la Goccia', icon: '💧', description: 'Cattura le gocce d\'acqua!', color: '#4fc3f7' },
    { id: 'pest_defense' as MiniGame, name: 'Difesa Parassiti', icon: '🐛', description: 'Elimina i parassiti!', color: '#8bc34a' },
    { id: 'speed_spray' as MiniGame, name: 'Speed Spray', icon: '🔫', description: 'Spruzza più veloce che puoi!', color: '#ff9800' },
  ];

  return (
    <View style={styles.selectionContainer}>
      <ThemedText style={styles.selectionTitle}>🎮 Mini Giochi</ThemedText>
      <ThemedText style={styles.selectionSubtitle}>Scegli un gioco per guadagnare bonus!</ThemedText>
      
      {games.map(game => (
        <Pressable
          key={game.id}
          style={[styles.gameCard, { borderColor: game.color }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSelect(game.id);
          }}
        >
          <ThemedText style={styles.gameIcon}>{game.icon}</ThemedText>
          <View style={styles.gameInfo}>
            <ThemedText style={styles.gameName}>{game.name}</ThemedText>
            <ThemedText style={styles.gameDescription}>{game.description}</ThemedText>
          </View>
          <ThemedText style={styles.playArrow}>▶</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

// Catch the Drop Game
function CatchTheDropGame({ onEnd }: { onEnd: (score: number) => void }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [bucketX, setBucketX] = useState(0);
  const [drops, setDrops] = useState<{ id: number; x: number; y: number }[]>([]);
  const { play } = useSounds();
  
  const bucketPosition = useSharedValue(0);
  
  const animatedBucketStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: bucketPosition.value }],
  }));

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      bucketPosition.value = Math.max(-width/2 + 50, Math.min(width/2 - 50, event.translationX));
      setBucketX(bucketPosition.value);
    });

  useEffect(() => {
    // Spawn drops
    const spawnInterval = setInterval(() => {
      setDrops(prev => [...prev, {
        id: Date.now(),
        x: (Math.random() - 0.5) * (width - 100),
        y: -50,
      }]);
    }, 800);

    // Move drops
    const moveInterval = setInterval(() => {
      setDrops(prev => {
        const newDrops = prev.map(d => ({ ...d, y: d.y + 8 }));
        
        // Check catches
        newDrops.forEach(drop => {
          if (drop.y > height - 200 && drop.y < height - 150) {
            if (Math.abs(drop.x - bucketX) < 50) {
              setScore(s => s + 10);
              play('ui_success');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              drop.y = 1000; // Remove
            }
          }
        });
        
        return newDrops.filter(d => d.y < height);
      });
    }, 50);

    // Timer
    const timerInterval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(spawnInterval);
          clearInterval(moveInterval);
          clearInterval(timerInterval);
          onEnd(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(moveInterval);
      clearInterval(timerInterval);
    };
  }, [bucketX]);

  return (
    <GestureHandlerRootView style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <ThemedText style={styles.scoreText}>💧 {score}</ThemedText>
        <ThemedText style={styles.timerText}>⏱️ {timeLeft}s</ThemedText>
      </View>
      
      <View style={styles.dropsContainer}>
        {drops.map(drop => (
          <Animated.View
            key={drop.id}
            style={[
              styles.drop,
              { left: width/2 + drop.x - 15, top: drop.y }
            ]}
          >
            <ThemedText style={styles.dropEmoji}>💧</ThemedText>
          </Animated.View>
        ))}
      </View>
      
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.bucket, animatedBucketStyle]}>
          <ThemedText style={styles.bucketEmoji}>🪣</ThemedText>
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

// Speed Spray Game
function SpeedSprayGame({ onEnd }: { onEnd: (score: number) => void }) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [targets, setTargets] = useState<{ id: number; x: number; y: number; hit: boolean }[]>([]);
  const { play } = useSounds();

  useEffect(() => {
    // Spawn targets
    const spawnInterval = setInterval(() => {
      setTargets(prev => [...prev, {
        id: Date.now(),
        x: Math.random() * (width - 100) + 50,
        y: Math.random() * (height - 400) + 150,
        hit: false,
      }]);
    }, 500);

    // Timer
    const timerInterval = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(spawnInterval);
          clearInterval(timerInterval);
          onEnd(score);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(timerInterval);
    };
  }, []);

  const handleTargetPress = useCallback((id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    play('spray_hit_leaf');
    setScore(s => s + 10);
    setTargets(prev => prev.filter(t => t.id !== id));
  }, [play]);

  return (
    <View style={styles.gameContainer}>
      <View style={styles.gameHeader}>
        <ThemedText style={styles.scoreText}>🎯 {score}</ThemedText>
        <ThemedText style={styles.timerText}>⏱️ {timeLeft}s</ThemedText>
      </View>
      
      {targets.map(target => (
        <Pressable
          key={target.id}
          style={[styles.target, { left: target.x, top: target.y }]}
          onPress={() => handleTargetPress(target.id)}
        >
          <ThemedText style={styles.targetEmoji}>🐛</ThemedText>
        </Pressable>
      ))}
      
      <ThemedText style={styles.instructionText}>Tocca i parassiti!</ThemedText>
    </View>
  );
}

export default function MiniGamesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  
  const [currentGame, setCurrentGame] = useState<MiniGame>(null);
  const [gameOver, setGameOver] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [highScores, setHighScores] = useState<Record<string, number>>({});

  useEffect(() => {
    loadHighScores();
  }, []);

  const loadHighScores = async () => {
    try {
      const saved = await AsyncStorage.getItem('minigameHighScores');
      if (saved) setHighScores(JSON.parse(saved));
    } catch (error) {
      console.error('Error loading high scores:', error);
    }
  };

  const handleGameEnd = useCallback(async (score: number) => {
    setFinalScore(score);
    setGameOver(true);
    
    if (currentGame) {
      const newHighScores = { ...highScores };
      if (!newHighScores[currentGame] || score > newHighScores[currentGame]) {
        newHighScores[currentGame] = score;
        setHighScores(newHighScores);
        await AsyncStorage.setItem('minigameHighScores', JSON.stringify(newHighScores));
        play('ui_success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    
    // Add rewards
    const userStatsStr = await AsyncStorage.getItem('userStats');
    const userStats = userStatsStr ? JSON.parse(userStatsStr) : {};
    userStats.coins = (userStats.coins || 0) + Math.floor(score / 2);
    userStats.xp = (userStats.xp || 0) + Math.floor(score / 5);
    await AsyncStorage.setItem('userStats', JSON.stringify(userStats));
  }, [currentGame, highScores, play]);

  const handlePlayAgain = useCallback(() => {
    setGameOver(false);
    setFinalScore(0);
  }, []);

  const handleBackToMenu = useCallback(() => {
    setCurrentGame(null);
    setGameOver(false);
    setFinalScore(0);
  }, []);

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            onPress={() => currentGame ? handleBackToMenu() : router.back()} 
            style={styles.backButton}
          >
            <ThemedText style={styles.backText}>← {currentGame ? 'Menu' : 'Indietro'}</ThemedText>
          </Pressable>
        </View>

        {/* Game Over Screen */}
        {gameOver && (
          <View style={styles.gameOverContainer}>
            <ThemedText style={styles.gameOverTitle}>🎉 Partita Finita!</ThemedText>
            <ThemedText style={styles.finalScoreText}>Punteggio: {finalScore}</ThemedText>
            {currentGame && highScores[currentGame] === finalScore && (
              <ThemedText style={styles.newHighScore}>🏆 Nuovo Record!</ThemedText>
            )}
            <ThemedText style={styles.rewardsText}>
              Guadagnato: {Math.floor(finalScore / 2)} 🪙 + {Math.floor(finalScore / 5)} ⭐
            </ThemedText>
            
            <View style={styles.gameOverButtons}>
              <Pressable style={styles.playAgainButton} onPress={handlePlayAgain}>
                <ThemedText style={styles.playAgainText}>Gioca Ancora</ThemedText>
              </Pressable>
              <Pressable style={styles.menuButton} onPress={handleBackToMenu}>
                <ThemedText style={styles.menuText}>Menu</ThemedText>
              </Pressable>
            </View>
          </View>
        )}

        {/* Game Selection */}
        {!currentGame && !gameOver && (
          <GameSelection onSelect={setCurrentGame} />
        )}

        {/* Active Game */}
        {currentGame === 'catch_drop' && !gameOver && (
          <CatchTheDropGame onEnd={handleGameEnd} />
        )}
        
        {currentGame === 'speed_spray' && !gameOver && (
          <SpeedSprayGame onEnd={handleGameEnd} />
        )}
        
        {currentGame === 'pest_defense' && !gameOver && (
          <SpeedSprayGame onEnd={handleGameEnd} />
        )}
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
  },
  header: {
    padding: 16,
    zIndex: 100,
  },
  backButton: {
    padding: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    color: '#fff',
    fontSize: 16,
  },
  selectionContainer: {
    flex: 1,
    padding: 20,
  },
  selectionTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  selectionSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
  },
  gameIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  playArrow: {
    fontSize: 24,
    color: '#fff',
  },
  gameContainer: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  dropsContainer: {
    flex: 1,
    position: 'relative',
  },
  drop: {
    position: 'absolute',
    width: 30,
    height: 30,
  },
  dropEmoji: {
    fontSize: 30,
  },
  bucket: {
    position: 'absolute',
    bottom: 50,
    left: width / 2 - 30,
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bucketEmoji: {
    fontSize: 50,
  },
  target: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetEmoji: {
    fontSize: 40,
  },
  instructionText: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 16,
  },
  gameOverContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  gameOverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  finalScoreText: {
    fontSize: 28,
    color: '#ffd700',
    marginBottom: 10,
  },
  newHighScore: {
    fontSize: 24,
    color: '#22c55e',
    marginBottom: 10,
  },
  rewardsText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 30,
  },
  gameOverButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  playAgainButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  playAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menuButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
