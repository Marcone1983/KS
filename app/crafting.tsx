import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';

interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  icon: string;
  ingredients: { name: string; amount: number; icon: string }[];
  result: { name: string; amount: number };
  unlocked: boolean;
}

const RECIPES: CraftingRecipe[] = [
  {
    id: 'super_spray',
    name: 'Super Spray',
    description: 'Spray potenziato con maggiore efficacia',
    icon: '🔫',
    ingredients: [
      { name: 'Spray Base', amount: 2, icon: '💧' },
      { name: 'Cristallo Verde', amount: 1, icon: '💎' },
    ],
    result: { name: 'Super Spray', amount: 1 },
    unlocked: true,
  },
  {
    id: 'health_potion',
    name: 'Pozione Salute',
    description: 'Ripristina la salute della pianta',
    icon: '❤️',
    ingredients: [
      { name: 'Erba Curativa', amount: 3, icon: '🌿' },
      { name: 'Acqua Pura', amount: 2, icon: '💧' },
    ],
    result: { name: 'Pozione Salute', amount: 1 },
    unlocked: true,
  },
  {
    id: 'shield_barrier',
    name: 'Barriera Scudo',
    description: 'Protegge la pianta per 30 secondi',
    icon: '🛡️',
    ingredients: [
      { name: 'Minerale Raro', amount: 2, icon: '⚙️' },
      { name: 'Energia', amount: 5, icon: '⚡' },
    ],
    result: { name: 'Barriera Scudo', amount: 1 },
    unlocked: false,
  },
  {
    id: 'mega_bomb',
    name: 'Mega Bomba',
    description: 'Elimina tutti i parassiti sullo schermo',
    icon: '💣',
    ingredients: [
      { name: 'Polvere Esplosiva', amount: 3, icon: '🔥' },
      { name: 'Contenitore', amount: 1, icon: '📦' },
    ],
    result: { name: 'Mega Bomba', amount: 1 },
    unlocked: false,
  },
];

export default function CraftingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [selectedRecipe, setSelectedRecipe] = useState<CraftingRecipe | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const saved = await AsyncStorage.getItem('inventory');
      if (saved) {
        setInventory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load inventory', error);
    }
  };

  const canCraft = (recipe: CraftingRecipe): boolean => {
    if (!recipe.unlocked) return false;
    return recipe.ingredients.every(ing => (inventory[ing.name] || 0) >= ing.amount);
  };

  const handleCraft = async (recipe: CraftingRecipe) => {
    if (!canCraft(recipe)) return;
    
    const newInventory = { ...inventory };
    recipe.ingredients.forEach(ing => {
      newInventory[ing.name] = (newInventory[ing.name] || 0) - ing.amount;
    });
    newInventory[recipe.result.name] = (newInventory[recipe.result.name] || 0) + recipe.result.amount;
    
    setInventory(newInventory);
    await AsyncStorage.setItem('inventory', JSON.stringify(newInventory));
  };

  return (
    <LinearGradient
      colors={['#14532d', '#166534', '#059669']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <ThemedText style={styles.title}>Crafting</ThemedText>
        <ThemedText style={styles.subtitle}>Crea oggetti potenti per la battaglia</ThemedText>

        {/* Recipes */}
        <View style={styles.recipesContainer}>
          {RECIPES.map((recipe) => (
            <Pressable
              key={recipe.id}
              style={[
                styles.recipeCard,
                !recipe.unlocked && styles.lockedCard,
                selectedRecipe?.id === recipe.id && styles.selectedCard,
              ]}
              onPress={() => recipe.unlocked && setSelectedRecipe(recipe)}
            >
              <View style={styles.recipeHeader}>
                <ThemedText style={styles.recipeIcon}>{recipe.icon}</ThemedText>
                <View style={styles.recipeInfo}>
                  <ThemedText style={styles.recipeName}>{recipe.name}</ThemedText>
                  <ThemedText style={styles.recipeDesc}>{recipe.description}</ThemedText>
                </View>
                {!recipe.unlocked && (
                  <ThemedText style={styles.lockIcon}>🔒</ThemedText>
                )}
              </View>

              {recipe.unlocked && (
                <View style={styles.ingredientsList}>
                  {recipe.ingredients.map((ing, idx) => (
                    <View key={idx} style={styles.ingredientItem}>
                      <ThemedText style={styles.ingredientIcon}>{ing.icon}</ThemedText>
                      <ThemedText style={styles.ingredientText}>
                        {ing.name} x{ing.amount}
                      </ThemedText>
                      <ThemedText style={[
                        styles.ingredientCount,
                        (inventory[ing.name] || 0) >= ing.amount ? styles.hasEnough : styles.notEnough
                      ]}>
                        ({inventory[ing.name] || 0})
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

              {recipe.unlocked && (
                <Pressable
                  style={[styles.craftButton, !canCraft(recipe) && styles.craftButtonDisabled]}
                  onPress={() => handleCraft(recipe)}
                  disabled={!canCraft(recipe)}
                >
                  <ThemedText style={styles.craftButtonText}>
                    {canCraft(recipe) ? 'Crea' : 'Materiali insufficienti'}
                  </ThemedText>
                </Pressable>
              )}
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
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
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#a7f3d0',
    fontSize: 16,
  },
  logo: {
    width: 120,
    height: 60,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a7f3d0',
    textAlign: 'center',
    marginBottom: 24,
  },
  recipesContainer: {
    gap: 16,
  },
  recipeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 16,
  },
  lockedCard: {
    opacity: 0.6,
  },
  selectedCard: {
    borderWidth: 3,
    borderColor: '#22c55e',
  },
  recipeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#166534',
  },
  recipeDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  lockIcon: {
    fontSize: 24,
  },
  ingredientsList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ingredientIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  ingredientText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  ingredientCount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  hasEnough: {
    color: '#22c55e',
  },
  notEnough: {
    color: '#ef4444',
  },
  craftButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  craftButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  craftButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
