import { useRouter } from "expo-router";
import React, { useState, useEffect, Suspense } from "react";
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "@/components/themed-text";
import { LinearGradient } from "expo-linear-gradient";
import { Canvas, useFrame } from "@react-three/fiber/native";
import { PerspectiveCamera } from "@react-three/drei/native";
import * as THREE from "three";

const { width } = Dimensions.get("window");

interface PlayerStats {
  totalPestsKilled: number;
  totalGamesPlayed: number;
  totalPlayTime: number;
  highestScore: number;
  totalCoinsEarned: number;
  totalXpEarned: number;
  plantsGrown: number;
  breedsCompleted: number;
  itemsCrafted: number;
  tradesCompleted: number;
  achievementsUnlocked: number;
  challengesCompleted: number;
  currentStreak: number;
  longestStreak: number;
  favoriteSpray: string;
  mostKilledPest: string;
}

// 3D Stats Trophy
function StatsTrophy3D() {
  const groupRef = React.useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.01;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.3, 0.2, 0.4, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.3, 0.3, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.25, 0.25, 0.1, 32]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0.4, 0.3, 0]}>
        <torusGeometry args={[0.1, 0.03, 16, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
      </mesh>
      <mesh position={[-0.4, 0.3, 0]}>
        <torusGeometry args={[0.1, 0.03, 16, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

const DEFAULT_STATS: PlayerStats = {
  totalPestsKilled: 1247,
  totalGamesPlayed: 89,
  totalPlayTime: 4320,
  highestScore: 15680,
  totalCoinsEarned: 25430,
  totalXpEarned: 12500,
  plantsGrown: 34,
  breedsCompleted: 12,
  itemsCrafted: 45,
  tradesCompleted: 8,
  achievementsUnlocked: 18,
  challengesCompleted: 42,
  currentStreak: 5,
  longestStreak: 14,
  favoriteSpray: "Super Spray",
  mostKilledPest: "Afide",
};

export default function StatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<PlayerStats>(DEFAULT_STATS);
  const [selectedCategory, setSelectedCategory] = useState<string>("combat");

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const saved = await AsyncStorage.getItem("playerStats");
      if (saved) setStats(JSON.parse(saved));
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const categories = [
    { id: "combat", name: "Combattimento", icon: "🎯" },
    { id: "progress", name: "Progressi", icon: "📈" },
    { id: "collection", name: "Collezione", icon: "🏆" },
    { id: "social", name: "Social", icon: "👥" },
  ];

  const statsByCategory: Record<string, { label: string; value: string | number; icon: string }[]> = {
    combat: [
      { label: "Parassiti Eliminati", value: stats.totalPestsKilled.toLocaleString(), icon: "🐛" },
      { label: "Partite Giocate", value: stats.totalGamesPlayed, icon: "🎮" },
      { label: "Punteggio Massimo", value: stats.highestScore.toLocaleString(), icon: "🏆" },
      { label: "Tempo di Gioco", value: formatTime(stats.totalPlayTime), icon: "⏱️" },
      { label: "Spray Preferito", value: stats.favoriteSpray, icon: "🔫" },
      { label: "Nemico Piu Ucciso", value: stats.mostKilledPest, icon: "💀" },
    ],
    progress: [
      { label: "XP Totale", value: stats.totalXpEarned.toLocaleString(), icon: "⭐" },
      { label: "Monete Guadagnate", value: stats.totalCoinsEarned.toLocaleString(), icon: "🪙" },
      { label: "Sfide Completate", value: stats.challengesCompleted, icon: "🎯" },
      { label: "Streak Attuale", value: `${stats.currentStreak} giorni`, icon: "🔥" },
      { label: "Streak Record", value: `${stats.longestStreak} giorni`, icon: "📅" },
    ],
    collection: [
      { label: "Piante Coltivate", value: stats.plantsGrown, icon: "🌱" },
      { label: "Incroci Completati", value: stats.breedsCompleted, icon: "🧬" },
      { label: "Oggetti Craftati", value: stats.itemsCrafted, icon: "🔨" },
      { label: "Achievement Sbloccati", value: `${stats.achievementsUnlocked}/50`, icon: "🏅" },
    ],
    social: [
      { label: "Scambi Completati", value: stats.tradesCompleted, icon: "🤝" },
      { label: "Garden Visitati", value: 23, icon: "🏡" },
      { label: "Like Ricevuti", value: 156, icon: "❤️" },
      { label: "Amici", value: 12, icon: "👥" },
    ],
  };

  return (
    <LinearGradient colors={["#1a1a2e", "#16213e", "#0f3460"]} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <ThemedText style={styles.title}>📊 Statistiche</ThemedText>
        </View>

        <View style={styles.trophy3D}>
          <Canvas>
            <ambientLight intensity={0.5} />
            <pointLight position={[3, 3, 3]} intensity={1} />
            <PerspectiveCamera makeDefault position={[0, 0, 2]} />
            <Suspense fallback={null}>
              <StatsTrophy3D />
            </Suspense>
          </Canvas>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryValue}>{stats.totalPestsKilled.toLocaleString()}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Eliminati</ThemedText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryValue}>{stats.totalGamesPlayed}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Partite</ThemedText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryValue}>{formatTime(stats.totalPlayTime)}</ThemedText>
            <ThemedText style={styles.summaryLabel}>Giocato</ThemedText>
          </View>
        </View>

        <View style={styles.categories}>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.categoryButton, selectedCategory === cat.id && styles.categoryActive]}
              onPress={() => setSelectedCategory(cat.id)}
            >
              <ThemedText style={styles.categoryIcon}>{cat.icon}</ThemedText>
              <ThemedText style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                {cat.name}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.statsGrid}>
          {statsByCategory[selectedCategory]?.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <ThemedText style={styles.statIcon}>{stat.icon}</ThemedText>
              <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
              <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { padding: 16 },
  header: { marginBottom: 16 },
  backButton: { padding: 8, alignSelf: "flex-start", marginBottom: 8 },
  backText: { color: "#fff", fontSize: 16 },
  title: { fontSize: 28, fontWeight: "bold", color: "#fff", textAlign: "center" },
  trophy3D: { width: "100%", height: 150, marginBottom: 16 },
  summaryCard: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 20, marginBottom: 20, justifyContent: "space-around", alignItems: "center" },
  summaryItem: { alignItems: "center" },
  summaryValue: { fontSize: 24, fontWeight: "bold", color: "#ffd700" },
  summaryLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 4 },
  summaryDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.2)" },
  categories: { flexDirection: "row", marginBottom: 20, gap: 8 },
  categoryButton: { flex: 1, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 12, alignItems: "center" },
  categoryActive: { backgroundColor: "#3b82f6" },
  categoryIcon: { fontSize: 20, marginBottom: 4 },
  categoryText: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  categoryTextActive: { color: "#fff", fontWeight: "bold" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statCard: { width: (width - 44) / 2, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 16, padding: 16, alignItems: "center" },
  statIcon: { fontSize: 32, marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 4 },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)", textAlign: "center" },
});
