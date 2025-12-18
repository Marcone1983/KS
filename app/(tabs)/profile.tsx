import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface UserStats {
  level: number;
  score: number;
  gleaf: number;
  highScore: number;
  isPremium: boolean;
  gamesPlayed: number;
  pestsKilled: number;
}

const DEFAULT_STATS: UserStats = {
  level: 1,
  score: 0,
  gleaf: 100,
  highScore: 0,
  isPremium: false,
  gamesPlayed: 0,
  pestsKilled: 0,
};

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  
  const [stats, setStats] = useState<UserStats>(DEFAULT_STATS);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const savedStats = await AsyncStorage.getItem("gameStats");
      if (savedStats) {
        setStats({ ...DEFAULT_STATS, ...JSON.parse(savedStats) });
      }
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleUpgradePremium = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/paywall" as any);
  };

  const StatCard = ({ icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <IconSymbol name={icon} size={24} color={color} />
      <ThemedText style={styles.statValue}>{value}</ThemedText>
      <ThemedText style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</ThemedText>
    </View>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Profilo</ThemedText>
          <Pressable 
            style={styles.settingsButton}
            onPress={() => router.push("/settings" as any)}
          >
            <IconSymbol name="gearshape.fill" size={24} color={colors.text} />
          </Pressable>
        </View>

        {/* Avatar Section */}
        <View style={[styles.avatarSection, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.tint + "30" }]}>
            <IconSymbol name="person.fill" size={48} color={colors.tint} />
          </View>
          <View style={styles.avatarInfo}>
            <ThemedText type="subtitle">Coltivatore</ThemedText>
            <View style={styles.levelBadge}>
              <IconSymbol name="trophy.fill" size={16} color={colors.gold} />
              <ThemedText style={{ color: colors.gold, fontWeight: "600" }}>
                Livello {stats.level}
              </ThemedText>
            </View>
          </View>
          {stats.isPremium && (
            <View style={[styles.premiumBadge, { backgroundColor: colors.gold }]}>
              <IconSymbol name="crown.fill" size={14} color="#000" />
              <ThemedText style={styles.premiumText}>PRO</ThemedText>
            </View>
          )}
        </View>

        {/* Stats Grid */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>Statistiche</ThemedText>
        <View style={styles.statsGrid}>
          <StatCard icon="star.fill" label="Punteggio" value={stats.score} color={colors.warning} />
          <StatCard icon="trophy.fill" label="Record" value={stats.highScore} color={colors.gold} />
          <StatCard icon="leaf.fill" label="GLeaf" value={stats.gleaf} color={colors.success} />
          <StatCard icon="gamecontroller.fill" label="Partite" value={stats.gamesPlayed} color={colors.tint} />
        </View>

        {/* Premium Section */}
        {!stats.isPremium && (
          <Pressable 
            style={[styles.premiumCard, { backgroundColor: colors.gold + "15", borderColor: colors.gold }]}
            onPress={handleUpgradePremium}
          >
            <View style={styles.premiumCardContent}>
              <IconSymbol name="crown.fill" size={40} color={colors.gold} />
              <View style={styles.premiumCardText}>
                <ThemedText type="subtitle" style={{ color: colors.gold }}>
                  Passa a Premium
                </ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 14 }}>
                  Sblocca tutti i livelli e contenuti esclusivi
                </ThemedText>
              </View>
            </View>
            <View style={[styles.priceTag, { backgroundColor: colors.gold }]}>
              <ThemedText style={styles.priceText}>$10</ThemedText>
            </View>
          </Pressable>
        )}

        {/* Achievements */}
        <ThemedText type="subtitle" style={styles.sectionTitle}>Achievements</ThemedText>
        <View style={[styles.achievementsCard, { backgroundColor: colors.card }]}>
          <View style={styles.achievementItem}>
            <View style={[styles.achievementIcon, { backgroundColor: colors.success + "30" }]}>
              <ThemedText style={{ fontSize: 24 }}>🌱</ThemedText>
            </View>
            <View style={styles.achievementInfo}>
              <ThemedText type="defaultSemiBold">Primo Germoglio</ThemedText>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                Completa il primo livello
              </ThemedText>
            </View>
            {stats.level > 1 && (
              <IconSymbol name="checkmark" size={20} color={colors.success} />
            )}
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.achievementItem}>
            <View style={[styles.achievementIcon, { backgroundColor: colors.warning + "30" }]}>
              <ThemedText style={{ fontSize: 24 }}>🏆</ThemedText>
            </View>
            <View style={styles.achievementInfo}>
              <ThemedText type="defaultSemiBold">Cacciatore di Parassiti</ThemedText>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                Elimina 100 parassiti
              </ThemedText>
            </View>
            {stats.pestsKilled >= 100 && (
              <IconSymbol name="checkmark" size={20} color={colors.success} />
            )}
          </View>
          
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          
          <View style={styles.achievementItem}>
            <View style={[styles.achievementIcon, { backgroundColor: colors.gold + "30" }]}>
              <ThemedText style={{ fontSize: 24 }}>👑</ThemedText>
            </View>
            <View style={styles.achievementInfo}>
              <ThemedText type="defaultSemiBold">Sostenitore Premium</ThemedText>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                Acquista la versione premium
              </ThemedText>
            </View>
            {stats.isPremium && (
              <IconSymbol name="checkmark" size={20} color={colors.success} />
            )}
          </View>
        </View>
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
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  settingsButton: {
    padding: Spacing.xs,
  },
  avatarSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInfo: {
    flex: 1,
    gap: Spacing.xs,
  },
  levelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    width: "48%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
  },
  premiumCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  premiumCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  premiumCardText: {
    flex: 1,
    gap: 4,
  },
  priceTag: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  priceText: {
    color: "#000",
    fontSize: 18,
    fontWeight: "700",
  },
  achievementsCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  achievementInfo: {
    flex: 1,
    gap: 2,
  },
  divider: {
    height: 1,
    marginVertical: Spacing.xs,
  },
});
