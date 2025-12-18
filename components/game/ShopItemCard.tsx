// @ts-nocheck
import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

// --- Theme --- //
const Colors = {
  primaryGreen: '#2D7D46',
  gold: '#FFD700',
  darkBackground: '#1A1A2E',
  white: '#FFFFFF',
};

const Spacing = {
  sm: 8,
  md: 16,
};

const BorderRadius = {
  md: 12,
};

// --- Types --- //
interface ShopItemCardProps {
  itemId: string;
  itemName: string;
  price: number;
  iconName: React.ComponentProps<typeof IconSymbol>['name'];
}

const ShopItemCard: React.FC<ShopItemCardProps> = ({ itemId, itemName, price, iconName }) => {

  const handlePurchase = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const existingItems = await AsyncStorage.getItem('purchased_items');
      const items = existingItems ? JSON.parse(existingItems) : [];
      items.push(itemId);
      await AsyncStorage.setItem('purchased_items', JSON.stringify(items));
      console.log(`Item ${itemName} purchased successfully!`);
    } catch (error) {
      console.error('Failed to save purchase to AsyncStorage', error);
    }
  };

  return (
    <ThemedView style={styles.cardContainer}>
      <IconSymbol name={iconName} size={48} />
      <ThemedText type="subtitle" style={styles.itemName}>{itemName}</ThemedText>
      <ThemedView style={styles.priceContainer}>
        <ThemedText style={styles.priceText}>{price}</ThemedText>
        <IconSymbol name="coin" size={20} color={Colors.gold} />
      </ThemedView>
      <Pressable style={styles.buyButton} onPress={handlePurchase}>
        <ThemedText style={styles.buyButtonText}>Acquista</ThemedText>
      </Pressable>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Colors.darkBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    width: 150,
    margin: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryGreen,
  },
  itemName: {
    color: Colors.white,
    marginTop: Spacing.sm,
    fontWeight: 'bold',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    backgroundColor: 'transparent',
  },
  priceText: {
    color: Colors.gold,
    marginRight: Spacing.sm / 2,
    fontSize: 16,
  },
  buyButton: {
    backgroundColor: Colors.primaryGreen,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  buyButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default ShopItemCard;
