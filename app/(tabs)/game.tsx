import { useRouter } from "expo-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  Dimensions,
  Animated,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, GameColors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const { width, height } = Dimensions.get("window");

interface Pest {
  id: string;
  x: number;
  y: number;
  health: number;
  type: "aphid" | "spider" | "caterpillar";
}

interface GameState {
  level: number;
  score: number;
  plantHealth: number;
  ammo: number;
  wave: number;
  maxWaves: number;
  isPaused: boolean;
  isGameOver: boolean;
  isLevelComplete: boolean;
}

const INITIAL_STATE: GameState = {
  level: 1,
  score: 0,
  plantHealth: 100,
  ammo: 100,
  wave: 1,
  maxWaves: 3,
  isPaused: false,
  isGameOver: false,
  isLevelComplete: false,
};

export default function GameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [pests, setPests] = useState<Pest[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [hasCompletedLevel1, setHasCompletedLevel1] = useState(false);
  
  const sprayPosition = useRef(new Animated.ValueXY({ x: width / 2, y: height / 2 })).current;
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkPremiumStatus();
    startGame();
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const premium = await AsyncStorage.getItem("isPremium");
      setIsPremium(premium === "true");
      const completed = await AsyncStorage.getItem("completedLevel1");
      setHasCompletedLevel1(completed === "true");
    } catch (error) {
      console.error("Error checking premium:", error);
    }
  };

  const startGame = () => {
    setGameState(INITIAL_STATE);
    setPests([]);
    spawnWave();
    
    gameLoopRef.current = setInterval(() => {
      updateGame();
    }, 100);
  };

  const spawnWave = () => {
    const newPests: Pest[] = [];
    const pestCount = 3 + gameState.wave * 2;
    
    for (let i = 0; i < pestCount; i++) {
      newPests.push({
        id: `pest_${Date.now()}_${i}`,
        x: Math.random() * (width - 60) + 30,
        y: Math.random() * (height * 0.4) + 100,
        health: 20 + gameState.level * 5,
        type: ["aphid", "spider", "caterpillar"][Math.floor(Math.random() * 3)] as Pest["type"],
      });
    }
    setPests(newPests);
  };

  const updateGame = () => {
    setGameState(prev => {
      if (prev.isPaused || prev.isGameOver || prev.isLevelComplete) return prev;
      
      // Pests damage plant over time
      const damage = pests.length * 0.1;
      const newHealth = Math.max(0, prev.plantHealth - damage);
      
      if (newHealth <= 0) {
        return { ...prev, plantHealth: 0, isGameOver: true };
      }
      
      return { ...prev, plantHealth: newHealth };
    });
  };

  const handleSpray = useCallback((x: number, y: number) => {
    if (gameState.ammo <= 0 || gameState.isPaused) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    setGameState(prev => ({
      ...prev,
      ammo: Math.max(0, prev.ammo - 1),
    }));

    // Check if spray hits any pest
    setPests(currentPests => {
      const updatedPests = currentPests.map(pest => {
        const distance = Math.sqrt(
          Math.pow(pest.x - x, 2) + Math.pow(pest.y - y, 2)
        );
        
        if (distance < 50) {
          const newHealth = pest.health - 10;
          if (newHealth <= 0) {
            setGameState(prev => ({
              ...prev,
              score: prev.score + 10,
            }));
            return null;
          }
          return { ...pest, health: newHealth };
        }
        return pest;
      }).filter(Boolean) as Pest[];

      // Check wave completion
      if (updatedPests.length === 0) {
        handleWaveComplete();
      }

      return updatedPests;
    });
  }, [gameState.ammo, gameState.isPaused]);

  const handleWaveComplete = () => {
    setGameState(prev => {
      if (prev.wave >= prev.maxWaves) {
        // Level complete
        handleLevelComplete();
        return { ...prev, isLevelComplete: true };
      }
      // Next wave
      setTimeout(() => spawnWave(), 1000);
      return { 
        ...prev, 
        wave: prev.wave + 1,
        ammo: Math.min(100, prev.ammo + 20),
      };
    });
  };

  const handleLevelComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    
    // Save progress
    const savedStats = await AsyncStorage.getItem("gameStats");
    const stats = savedStats ? JSON.parse(savedStats) : {};
    
    const newStats = {
      ...stats,
      level: Math.max(stats.level || 1, gameState.level + 1),
      score: (stats.score || 0) + gameState.score,
      highScore: Math.max(stats.highScore || 0, gameState.score),
      gleaf: (stats.gleaf || 0) + Math.floor(gameState.score / 10),
    };
    
    await AsyncStorage.setItem("gameStats", JSON.stringify(newStats));
    
    // Check if this is first level completion and not premium
    if (gameState.level === 1 && !isPremium) {
      await AsyncStorage.setItem("completedLevel1", "true");
      // Show paywall
      setTimeout(() => {
        router.push("/paywall");
      }, 1500);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      handleSpray(locationX, locationY);
    },
    onPanResponderMove: (evt) => {
      const { locationX, locationY } = evt.nativeEvent;
      handleSpray(locationX, locationY);
    },
  });

  const togglePause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const restartGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startGame();
  };

  const getHealthColor = () => {
    if (gameState.plantHealth > 60) return GameColors.health.full;
    if (gameState.plantHealth > 30) return GameColors.health.medium;
    return GameColors.health.low;
  };

  return (
    <ThemedView style={styles.container}>
      {/* Game HUD */}
      <View style={[styles.hud, { paddingTop: insets.top + Spacing.sm }]}>
        <View style={styles.hudLeft}>
          <Pressable onPress={togglePause} style={styles.pauseButton}>
            <IconSymbol 
              name={gameState.isPaused ? "gamecontroller.fill" : "xmark"} 
              size={24} 
              color={colors.text} 
            />
          </Pressable>
          <View style={styles.levelBadge}>
            <ThemedText style={styles.levelText}>LV {gameState.level}</ThemedText>
          </View>
        </View>
        
        <View style={styles.hudCenter}>
          <ThemedText style={styles.scoreText}>{gameState.score}</ThemedText>
          <ThemedText style={[styles.waveText, { color: colors.textSecondary }]}>
            Wave {gameState.wave}/{gameState.maxWaves}
          </ThemedText>
        </View>
        
        <View style={styles.hudRight}>
          <View style={styles.ammoContainer}>
            <IconSymbol name="drop.fill" size={16} color={GameColors.ammo.full} />
            <ThemedText style={styles.ammoText}>{gameState.ammo}</ThemedText>
          </View>
        </View>
      </View>

      {/* Health Bar */}
      <View style={styles.healthBarContainer}>
        <View style={[styles.healthBarBg, { backgroundColor: colors.card }]}>
          <View 
            style={[
              styles.healthBarFill, 
              { 
                width: `${gameState.plantHealth}%`,
                backgroundColor: getHealthColor(),
              }
            ]} 
          />
        </View>
        <View style={styles.healthIcon}>
          <IconSymbol name="heart.fill" size={20} color={getHealthColor()} />
        </View>
      </View>

      {/* Game Area */}
      <View style={styles.gameArea} {...panResponder.panHandlers}>
        {/* Plant */}
        <View style={styles.plantContainer}>
          <View style={[styles.plant, { opacity: gameState.plantHealth / 100 }]}>
            <IconSymbol name="leaf.fill" size={80} color={colors.tint} />
          </View>
        </View>

        {/* Pests */}
        {pests.map(pest => (
          <Animated.View
            key={pest.id}
            style={[
              styles.pest,
              {
                left: pest.x - 20,
                top: pest.y - 20,
                opacity: pest.health / 30,
              },
            ]}
          >
            <ThemedText style={styles.pestEmoji}>
              {pest.type === "aphid" ? "🐛" : pest.type === "spider" ? "🕷️" : "🐛"}
            </ThemedText>
          </Animated.View>
        ))}

        {/* Spray indicator */}
        <View style={styles.sprayHint}>
          <ThemedText style={[styles.sprayHintText, { color: colors.textSecondary }]}>
            Tocca per spruzzare
          </ThemedText>
        </View>
      </View>

      {/* Pause Overlay */}
      {gameState.isPaused && (
        <View style={styles.overlay}>
          <View style={[styles.pauseMenu, { backgroundColor: colors.card }]}>
            <ThemedText type="title">Pausa</ThemedText>
            <Pressable 
              style={[styles.menuButton, { backgroundColor: colors.tint }]}
              onPress={togglePause}
            >
              <ThemedText style={styles.menuButtonText}>Continua</ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.menuButton, { backgroundColor: colors.error }]}
              onPress={() => router.back()}
            >
              <ThemedText style={styles.menuButtonText}>Esci</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Game Over Overlay */}
      {gameState.isGameOver && (
        <View style={styles.overlay}>
          <View style={[styles.pauseMenu, { backgroundColor: colors.card }]}>
            <ThemedText type="title" style={{ color: colors.error }}>Game Over</ThemedText>
            <ThemedText style={{ color: colors.textSecondary, marginVertical: Spacing.md }}>
              Punteggio: {gameState.score}
            </ThemedText>
            <Pressable 
              style={[styles.menuButton, { backgroundColor: colors.tint }]}
              onPress={restartGame}
            >
              <ThemedText style={styles.menuButtonText}>Riprova</ThemedText>
            </Pressable>
            <Pressable 
              style={[styles.menuButton, { backgroundColor: colors.textSecondary }]}
              onPress={() => router.back()}
            >
              <ThemedText style={styles.menuButtonText}>Home</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Level Complete Overlay */}
      {gameState.isLevelComplete && (
        <View style={styles.overlay}>
          <View style={[styles.pauseMenu, { backgroundColor: colors.card }]}>
            <IconSymbol name="trophy.fill" size={48} color={colors.gold} />
            <ThemedText type="title" style={{ color: colors.gold, marginTop: Spacing.md }}>
              Livello Completato!
            </ThemedText>
            <ThemedText style={{ color: colors.textSecondary, marginVertical: Spacing.md }}>
              Punteggio: {gameState.score}
            </ThemedText>
            {gameState.level === 1 && !isPremium ? (
              <ThemedText style={{ color: colors.textSecondary, textAlign: "center", marginBottom: Spacing.md }}>
                Sblocca Premium per continuare...
              </ThemedText>
            ) : (
              <Pressable 
                style={[styles.menuButton, { backgroundColor: colors.tint }]}
                onPress={() => {
                  setGameState(prev => ({
                    ...INITIAL_STATE,
                    level: prev.level + 1,
                  }));
                  startGame();
                }}
              >
                <ThemedText style={styles.menuButtonText}>Livello Successivo</ThemedText>
              </Pressable>
            )}
            <Pressable 
              style={[styles.menuButton, { backgroundColor: colors.textSecondary }]}
              onPress={() => router.back()}
            >
              <ThemedText style={styles.menuButtonText}>Home</ThemedText>
            </Pressable>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  hud: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    zIndex: 10,
  },
  hudLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  hudCenter: {
    alignItems: "center",
  },
  hudRight: {
    alignItems: "flex-end",
  },
  pauseButton: {
    padding: Spacing.xs,
  },
  levelBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFD700",
  },
  scoreText: {
    fontSize: 24,
    fontWeight: "700",
  },
  waveText: {
    fontSize: 12,
  },
  ammoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ammoText: {
    fontSize: 16,
    fontWeight: "600",
  },
  healthBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  healthBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  healthBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  healthIcon: {
    marginLeft: Spacing.sm,
  },
  gameArea: {
    flex: 1,
    position: "relative",
  },
  plantContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  plant: {
    padding: Spacing.lg,
  },
  pest: {
    position: "absolute",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  pestEmoji: {
    fontSize: 32,
  },
  sprayHint: {
    position: "absolute",
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  sprayHintText: {
    fontSize: 14,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  pauseMenu: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: "center",
    minWidth: 250,
    gap: Spacing.md,
  },
  menuButton: {
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  menuButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
