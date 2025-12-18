import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  ScrollView,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const { width } = Dimensions.get("window");

interface GameStats {
  level: number;
  score: number;
  gleaf: number;
  highScore: number;
  isPremium: boolean;
}

const DEFAULT_STATS: GameStats = {
  level: 1,
  score: 0,
  gleaf: 100,
  highScore: 0,
  isPremium: false,
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  
  const [stats, setStats] = useState<GameStats>(DEFAULT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const savedStats = await AsyncStorage.getItem("gameStats");
      if (savedStats) {
        setStats(JSON.parse(savedStats));
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/game");
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText type="title" style={styles.title}>KannaSprout</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Difendi il tuo giardino
            </ThemedText>
          </View>
          {stats.isPremium && (
            <View style={[styles.premiumBadge, { backgroundColor: colors.gold }]}>
              <IconSymbol name="crown.fill" size={16} color="#000" />
              <ThemedText style={styles.premiumText}>PRO</ThemedText>
            </View>
          )}
        </View>

        {/* Stats Bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <IconSymbol name="trophy.fill" size={20} color={colors.gold} />
            <ThemedText style={styles.statValue}>{stats.level}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>Livello</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <IconSymbol name="leaf.fill" size={20} color={colors.success} />
            <ThemedText style={styles.statValue}>{stats.gleaf}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>GLeaf</ThemedText>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <IconSymbol name="star.fill" size={20} color={colors.warning} />
            <ThemedText style={styles.statValue}>{stats.highScore}</ThemedText>
            <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>Record</ThemedText>
          </View>
        </View>

        {/* Garden Preview Card */}
        <View style={[styles.gardenCard, { backgroundColor: colors.card }]}>
          <View style={styles.gardenPreview}>
            <View style={[styles.plantIcon, { backgroundColor: colors.tint + "30" }]}>
              <IconSymbol name="leaf.fill" size={64} color={colors.tint} />
            </View>
          </View>
          <View style={styles.gardenInfo}>
            <ThemedText type="subtitle">Il Tuo Giardino</ThemedText>
            <ThemedText style={{ color: colors.textSecondary }}>
              {stats.isPremium 
                ? "Accesso completo a tutti i livelli" 
                : `Livello ${stats.level} - ${stats.level === 1 ? "Completa per sbloccare" : "In corso"}`
              }
            </ThemedText>
          </View>
        </View>

        {/* Play Button */}
        <Pressable
          onPress={handlePlayPress}
          style={({ pressed }) => [
            styles.playButton,
            { backgroundColor: colors.tint },
            pressed && styles.playButtonPressed,
          ]}
        >
          <IconSymbol name="gamecontroller.fill" size={28} color="#FFF" />
          <ThemedText style={styles.playButtonText}>GIOCA ORA</ThemedText>
        </Pressable>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Pressable 
            style={[styles.actionCard, { backgroundColor: colors.card }]}
            onPress={() => router.push("/(tabs)/shop")}
          >
            <IconSymbol name="cart.fill" size={24} color={colors.tint} />
            <ThemedText style={styles.actionText}>Shop</ThemedText>
          </Pressable>
          <Pressable 
            style={[styles.actionCard, { backgroundColor: colors.card }]}
            onPress={() => router.push("/encyclopedia")}
          >
            <IconSymbol name="info.circle.fill" size={24} color={colors.tint} />
            <ThemedText style={styles.actionText}>Guida</ThemedText>
          </Pressable>
          <Pressable 
            style={[styles.actionCard, { backgroundColor: colors.card }]}
            onPress={() => router.push("/settings")}
          >
            <IconSymbol name="gearshape.fill" size={24} color={colors.tint} />
            <ThemedText style={styles.actionText}>Opzioni</ThemedText>
          </Pressable>
        </View>

        {/* Premium Banner (if not premium) */}
        {!stats.isPremium && (
          <Pressable 
            style={[styles.premiumBanner, { backgroundColor: colors.gold + "20", borderColor: colors.gold }]}
            onPress={() => router.push("/paywall")}
          >
            <View style={styles.premiumBannerContent}>
              <IconSymbol name="crown.fill" size={32} color={colors.gold} />
              <View style={styles.premiumBannerText}>
                <ThemedText type="defaultSemiBold" style={{ color: colors.gold }}>
                  Sblocca Premium
                </ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                  $10 una tantum - Tutti i livelli sbloccati
                </ThemedText>
              </View>
            </View>
            <IconSymbol name="chevron.right" size={20} color={colors.gold} />
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  premiumText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
  },
  statsBar: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  gardenCard: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  gardenPreview: {
    height: 160,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(45, 125, 70, 0.1)",
  },
  plantIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  gardenInfo: {
    padding: Spacing.md,
    gap: 4,
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  playButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  playButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  premiumBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  premiumBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  premiumBannerText: {
    gap: 2,
  },
});
