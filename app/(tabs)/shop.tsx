import { useState, useEffect } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  ScrollView,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface ShopItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: "seeds" | "boost" | "cosmetics";
  icon: string;
}

const SHOP_ITEMS: ShopItem[] = [
  // Seeds
  { id: "seed_basic", name: "Semi Base", description: "Semi di cannabis standard", price: 50, category: "seeds", icon: "🌱" },
  { id: "seed_premium", name: "Semi Premium", description: "Crescita più veloce", price: 150, category: "seeds", icon: "🌿" },
  { id: "seed_rare", name: "Semi Rari", description: "Resistenza ai parassiti", price: 300, category: "seeds", icon: "🍀" },
  // Boosts
  { id: "boost_health", name: "Fertilizzante", description: "+50 Salute pianta", price: 100, category: "boost", icon: "💚" },
  { id: "boost_ammo", name: "Ricarica Spray", description: "+50 Munizioni", price: 75, category: "boost", icon: "💧" },
  { id: "boost_shield", name: "Scudo Protettivo", description: "Protezione temporanea", price: 200, category: "boost", icon: "🛡️" },
  // Cosmetics
  { id: "skin_gold", name: "Spray Dorato", description: "Skin spray premium", price: 500, category: "cosmetics", icon: "✨" },
  { id: "pot_fancy", name: "Vaso Decorato", description: "Vaso elegante", price: 250, category: "cosmetics", icon: "🏺" },
];

const CATEGORIES = [
  { id: "all", name: "Tutti" },
  { id: "seeds", name: "Semi" },
  { id: "boost", name: "Boost" },
  { id: "cosmetics", name: "Cosmetici" },
];

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  
  const [gleaf, setGleaf] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [ownedItems, setOwnedItems] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const stats = await AsyncStorage.getItem("gameStats");
      if (stats) {
        const parsed = JSON.parse(stats);
        setGleaf(parsed.gleaf || 0);
      }
      const owned = await AsyncStorage.getItem("ownedItems");
      if (owned) {
        setOwnedItems(JSON.parse(owned));
      }
    } catch (error) {
      console.error("Error loading shop data:", error);
    }
  };

  const handlePurchase = async (item: ShopItem) => {
    if (gleaf < item.price) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (ownedItems.includes(item.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const newGleaf = gleaf - item.price;
    const newOwnedItems = [...ownedItems, item.id];

    setGleaf(newGleaf);
    setOwnedItems(newOwnedItems);

    // Save to storage
    const stats = await AsyncStorage.getItem("gameStats");
    const parsed = stats ? JSON.parse(stats) : {};
    await AsyncStorage.setItem("gameStats", JSON.stringify({ ...parsed, gleaf: newGleaf }));
    await AsyncStorage.setItem("ownedItems", JSON.stringify(newOwnedItems));
  };

  const filteredItems = selectedCategory === "all" 
    ? SHOP_ITEMS 
    : SHOP_ITEMS.filter(item => item.category === selectedCategory);

  const renderItem = ({ item }: { item: ShopItem }) => {
    const isOwned = ownedItems.includes(item.id);
    const canAfford = gleaf >= item.price;

    return (
      <Pressable
        style={[
          styles.itemCard,
          { backgroundColor: colors.card },
          isOwned && styles.itemOwned,
        ]}
        onPress={() => handlePurchase(item)}
        disabled={isOwned}
      >
        <View style={styles.itemIcon}>
          <ThemedText style={styles.itemEmoji}>{item.icon}</ThemedText>
        </View>
        <View style={styles.itemInfo}>
          <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
          <ThemedText style={[styles.itemDesc, { color: colors.textSecondary }]}>
            {item.description}
          </ThemedText>
        </View>
        <View style={styles.itemPrice}>
          {isOwned ? (
            <View style={[styles.ownedBadge, { backgroundColor: colors.success + "30" }]}>
              <IconSymbol name="checkmark" size={16} color={colors.success} />
            </View>
          ) : (
            <View style={[
              styles.priceBadge, 
              { backgroundColor: canAfford ? colors.tint : colors.error + "30" }
            ]}>
              <IconSymbol name="leaf.fill" size={14} color={canAfford ? "#FFF" : colors.error} />
              <ThemedText style={[
                styles.priceText, 
                { color: canAfford ? "#FFF" : colors.error }
              ]}>
                {item.price}
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText type="title">Shop</ThemedText>
        <View style={[styles.gleafBadge, { backgroundColor: colors.card }]}>
          <IconSymbol name="leaf.fill" size={20} color={colors.success} />
          <ThemedText style={styles.gleafText}>{gleaf}</ThemedText>
        </View>
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
            <ThemedText style={[
              styles.categoryText,
              { color: selectedCategory === cat.id ? "#FFF" : colors.text },
            ]}>
              {cat.name}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Items List */}
      <FlatList
        data={filteredItems}
        keyExtractor={item => item.id}
        renderItem={renderItem}
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  gleafBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  gleafText: {
    fontSize: 18,
    fontWeight: "700",
  },
  categoriesContainer: {
    maxHeight: 50,
  },
  categoriesContent: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  categoryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginRight: Spacing.sm,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
  },
  listContent: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
  },
  itemOwned: {
    opacity: 0.6,
  },
  itemIcon: {
    width: 50,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: BorderRadius.md,
  },
  itemEmoji: {
    fontSize: 28,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemDesc: {
    fontSize: 12,
  },
  itemPrice: {
    alignItems: "flex-end",
  },
  priceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    gap: 4,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
  },
  ownedBadge: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
});
