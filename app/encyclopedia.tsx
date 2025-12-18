import { useRouter } from "expo-router";
import { useState } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  ScrollView,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface EncyclopediaEntry {
  id: string;
  category: "plants" | "pests" | "items" | "tips";
  title: string;
  description: string;
  icon: string;
}

const ENCYCLOPEDIA_DATA: EncyclopediaEntry[] = [
  // Plants
  { id: "plant_basic", category: "plants", title: "Cannabis Sativa", description: "La varietà base con crescita equilibrata. Ideale per principianti.", icon: "🌿" },
  { id: "plant_indica", category: "plants", title: "Cannabis Indica", description: "Crescita compatta e resistente. Ottima per spazi ridotti.", icon: "🌱" },
  { id: "plant_hybrid", category: "plants", title: "Ibrido Premium", description: "Combina i vantaggi di Sativa e Indica. Solo per utenti Premium.", icon: "🍀" },
  
  // Pests
  { id: "pest_aphid", category: "pests", title: "Afidi", description: "Piccoli insetti che succhiano la linfa. Deboli ma numerosi.", icon: "🐛" },
  { id: "pest_spider", category: "pests", title: "Ragnetto Rosso", description: "Acaro che crea ragnatele. Veloce e difficile da colpire.", icon: "🕷️" },
  { id: "pest_caterpillar", category: "pests", title: "Bruco", description: "Mangia le foglie rapidamente. Lento ma resistente.", icon: "🐛" },
  { id: "pest_boss", category: "pests", title: "Boss Parassita", description: "Appare ogni 5 livelli. Richiede strategia per essere sconfitto.", icon: "👾" },
  
  // Items
  { id: "item_spray", category: "items", title: "Spray Biologico", description: "Il tuo strumento principale. Elimina i parassiti al contatto.", icon: "💧" },
  { id: "item_fertilizer", category: "items", title: "Fertilizzante", description: "Ripristina la salute della pianta. Usalo nei momenti critici.", icon: "💚" },
  { id: "item_shield", category: "items", title: "Scudo Protettivo", description: "Protegge la pianta per un breve periodo.", icon: "🛡️" },
  
  // Tips
  { id: "tip_aim", category: "tips", title: "Mira Precisa", description: "Tocca direttamente sui parassiti per eliminarli più velocemente.", icon: "🎯" },
  { id: "tip_ammo", category: "tips", title: "Gestisci le Munizioni", description: "Non sprecare spray. Aspetta che i parassiti si raggruppino.", icon: "💡" },
  { id: "tip_waves", category: "tips", title: "Preparati alle Ondate", description: "Ogni ondata è più difficile. Usa i power-up strategicamente.", icon: "📈" },
];

const CATEGORIES = [
  { id: "all", name: "Tutto", icon: "📚" },
  { id: "plants", name: "Piante", icon: "🌿" },
  { id: "pests", name: "Parassiti", icon: "🐛" },
  { id: "items", name: "Oggetti", icon: "🎒" },
  { id: "tips", name: "Consigli", icon: "💡" },
];

export default function EncyclopediaScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredData = selectedCategory === "all"
    ? ENCYCLOPEDIA_DATA
    : ENCYCLOPEDIA_DATA.filter(entry => entry.category === selectedCategory);

  const toggleExpand = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId(expandedId === id ? null : id);
  };

  const renderEntry = ({ item }: { item: EncyclopediaEntry }) => {
    const isExpanded = expandedId === item.id;
    
    return (
      <Pressable
        style={[styles.entryCard, { backgroundColor: colors.card }]}
        onPress={() => toggleExpand(item.id)}
      >
        <View style={styles.entryHeader}>
          <View style={[styles.entryIcon, { backgroundColor: colors.tint + "20" }]}>
            <ThemedText style={styles.entryEmoji}>{item.icon}</ThemedText>
          </View>
          <ThemedText type="defaultSemiBold" style={styles.entryTitle}>
            {item.title}
          </ThemedText>
          <IconSymbol 
            name={isExpanded ? "chevron.right" : "chevron.right"} 
            size={18} 
            color={colors.textSecondary}
            style={{ transform: [{ rotate: isExpanded ? "90deg" : "0deg" }] }}
          />
        </View>
        {isExpanded && (
          <View style={styles.entryContent}>
            <ThemedText style={[styles.entryDescription, { color: colors.textSecondary }]}>
              {item.description}
            </ThemedText>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </Pressable>
        <ThemedText type="title">Enciclopedia</ThemedText>
        <View style={styles.placeholder} />
      </View>

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {CATEGORIES.map(cat => (
          <Pressable
            key={cat.id}
            style={[
              styles.categoryButton,
              { 
                backgroundColor: selectedCategory === cat.id ? colors.tint : colors.card,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedCategory(cat.id);
            }}
          >
            <ThemedText style={styles.categoryIcon}>{cat.icon}</ThemedText>
            <ThemedText style={[
              styles.categoryText,
              { color: selectedCategory === cat.id ? "#FFF" : colors.text },
            ]}>
              {cat.name}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Entries List */}
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  placeholder: {
    width: 32,
  },
  categoriesContainer: {
    maxHeight: 60,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
    gap: Spacing.xs,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  entryCard: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  entryIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  entryEmoji: {
    fontSize: 24,
  },
  entryTitle: {
    flex: 1,
  },
  entryContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: 0,
  },
  entryDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
