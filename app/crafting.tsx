// @ts-nocheck
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Alert, Modal } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withRepeat, withSequence, Easing } from 'react-native-reanimated';
import { useSounds } from '@/hooks/use-sounds';

const { width } = Dimensions.get('window');

interface Ingredient {
  id: string;
  name: string;
  icon: string;
  color: string;
  quantity: number;
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  ingredients: { id: string; amount: number }[];
  craftTime: number;
  result: { name: string; power: number; duration: number };
  unlocked: boolean;
}

const INGREDIENTS: Ingredient[] = [
  { id: 'water', name: 'Acqua Pura', icon: '💧', color: '#3b82f6', quantity: 10 },
  { id: 'herb', name: 'Erba Curativa', icon: '🌿', color: '#22c55e', quantity: 8 },
  { id: 'crystal', name: 'Cristallo Verde', icon: '💎', color: '#10b981', quantity: 5 },
  { id: 'essence', name: 'Essenza Magica', icon: '✨', color: '#a855f7', quantity: 3 },
  { id: 'powder', name: 'Polvere Dorata', icon: '🌟', color: '#f59e0b', quantity: 4 },
  { id: 'leaf', name: 'Foglia Rara', icon: '🍃', color: '#84cc16', quantity: 6 },
];

const RECIPES: Recipe[] = [
  {
    id: 'super_spray',
    name: 'Super Spray',
    description: 'Spray potenziato con maggiore efficacia contro i parassiti',
    icon: '🔫',
    color: '#3b82f6',
    ingredients: [{ id: 'water', amount: 2 }, { id: 'crystal', amount: 1 }],
    craftTime: 3000,
    result: { name: 'Super Spray', power: 150, duration: 30 },
    unlocked: true,
  },
  {
    id: 'health_potion',
    name: 'Pozione Salute',
    description: 'Ripristina istantaneamente la salute della pianta',
    icon: '❤️',
    color: '#ef4444',
    ingredients: [{ id: 'herb', amount: 3 }, { id: 'water', amount: 2 }],
    craftTime: 4000,
    result: { name: 'Pozione Salute', power: 100, duration: 0 },
    unlocked: true,
  },
  {
    id: 'shield_barrier',
    name: 'Barriera Scudo',
    description: 'Crea uno scudo protettivo intorno alla pianta',
    icon: '🛡️',
    color: '#f59e0b',
    ingredients: [{ id: 'crystal', amount: 2 }, { id: 'essence', amount: 1 }],
    craftTime: 5000,
    result: { name: 'Barriera Scudo', power: 200, duration: 60 },
    unlocked: true,
  },
  {
    id: 'growth_elixir',
    name: 'Elisir Crescita',
    description: 'Accelera la crescita della pianta del 200%',
    icon: '📈',
    color: '#22c55e',
    ingredients: [{ id: 'essence', amount: 2 }, { id: 'leaf', amount: 2 }, { id: 'powder', amount: 1 }],
    craftTime: 6000,
    result: { name: 'Elisir Crescita', power: 200, duration: 120 },
    unlocked: true,
  },
  {
    id: 'ultimate_serum',
    name: 'Siero Definitivo',
    description: 'Il più potente potenziamento disponibile',
    icon: '⚡',
    color: '#a855f7',
    ingredients: [{ id: 'essence', amount: 3 }, { id: 'crystal', amount: 2 }, { id: 'powder', amount: 2 }],
    craftTime: 8000,
    result: { name: 'Siero Definitivo', power: 500, duration: 180 },
    unlocked: true,
  },
];

// 3D Workbench Component
function Workbench3D({ isCrafting, craftingProgress }: { isCrafting: boolean; craftingProgress: number }) {
  const workbenchRef = useRef<THREE.Group>(null);
  const cauldronRef = useRef<THREE.Mesh>(null);
  const bubbleRefs = useRef<THREE.Mesh[]>([]);
  
  useFrame((state) => {
    if (cauldronRef.current && isCrafting) {
      // Bubbling animation
      cauldronRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.02;
    }
    
    // Animate bubbles
    bubbleRefs.current.forEach((bubble, i) => {
      if (bubble && isCrafting) {
        bubble.position.y += 0.02;
        bubble.scale.setScalar(Math.max(0.01, bubble.scale.x - 0.005));
        if (bubble.position.y > 1.5 || bubble.scale.x < 0.02) {
          bubble.position.y = 0.3;
          bubble.scale.setScalar(0.05 + Math.random() * 0.05);
          bubble.position.x = (Math.random() - 0.5) * 0.3;
          bubble.position.z = (Math.random() - 0.5) * 0.3;
        }
      }
    });
  });

  return (
    <group ref={workbenchRef}>
      {/* Workbench Table */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[2, 0.1, 1.2]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Table Legs */}
      {[[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.85, z]}>
          <cylinderGeometry args={[0.05, 0.05, 0.6, 8]} />
          <meshStandardMaterial color="#5c3317" />
        </mesh>
      ))}
      
      {/* Cauldron */}
      <mesh ref={cauldronRef} position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.35, 0.25, 0.5, 16]} />
        <meshStandardMaterial color="#2d2d2d" metalness={0.8} roughness={0.3} />
      </mesh>
      
      {/* Liquid inside cauldron */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.32, 0.32, 0.1, 16]} />
        <meshStandardMaterial 
          color={isCrafting ? '#22c55e' : '#1a1a2e'} 
          emissive={isCrafting ? '#22c55e' : '#000000'}
          emissiveIntensity={isCrafting ? 0.5 : 0}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Bubbles */}
      {isCrafting && Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) bubbleRefs.current[i] = el; }}
          position={[(Math.random() - 0.5) * 0.3, 0.3 + i * 0.1, (Math.random() - 0.5) * 0.3]}
        >
          <sphereGeometry args={[0.05 + Math.random() * 0.05, 8, 8]} />
          <meshStandardMaterial color="#22c55e" transparent opacity={0.6} />
        </mesh>
      ))}
      
      {/* Progress ring */}
      {isCrafting && (
        <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 32, 1, 0, (craftingProgress / 100) * Math.PI * 2]} />
          <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
      
      {/* Ingredient bottles */}
      {[-0.7, -0.35, 0.35, 0.7].map((x, i) => (
        <group key={i} position={[x, -0.3, -0.4]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 0.2, 8]} />
            <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
          </mesh>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
            <meshStandardMaterial color={['#3b82f6', '#22c55e', '#f59e0b', '#a855f7'][i]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Floating Ingredient 3D
function FloatingIngredient3D({ color, position }: { color: string; position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.02;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <octahedronGeometry args={[0.15]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
    </mesh>
  );
}

// Ingredient Card Component
function IngredientCard({ ingredient, onSelect, isSelected }: { ingredient: Ingredient; onSelect: () => void; isSelected: boolean }) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onSelect}
      onPressIn={() => { scale.value = withSpring(0.95); }}
      onPressOut={() => { scale.value = withSpring(1); }}
    >
      <Animated.View style={[styles.ingredientCard, isSelected && styles.ingredientCardSelected, animatedStyle]}>
        <ThemedText style={styles.ingredientIcon}>{ingredient.icon}</ThemedText>
        <ThemedText style={styles.ingredientName}>{ingredient.name}</ThemedText>
        <ThemedText style={styles.ingredientQty}>x{ingredient.quantity}</ThemedText>
      </Animated.View>
    </Pressable>
  );
}

// Recipe Card Component
function RecipeCard({ recipe, canCraft, onCraft }: { recipe: Recipe; canCraft: boolean; onCraft: () => void }) {
  return (
    <Pressable 
      style={[styles.recipeCard, { borderColor: recipe.color }, !canCraft && styles.recipeCardDisabled]}
      onPress={canCraft ? onCraft : undefined}
    >
      <View style={[styles.recipeIconBg, { backgroundColor: recipe.color + '30' }]}>
        <ThemedText style={styles.recipeIcon}>{recipe.icon}</ThemedText>
      </View>
      <View style={styles.recipeInfo}>
        <ThemedText style={styles.recipeName}>{recipe.name}</ThemedText>
        <ThemedText style={styles.recipeDesc}>{recipe.description}</ThemedText>
        <View style={styles.recipeIngredients}>
          {recipe.ingredients.map((ing, i) => {
            const ingredient = INGREDIENTS.find(x => x.id === ing.id);
            return (
              <View key={i} style={styles.recipeIngredient}>
                <ThemedText style={styles.recipeIngIcon}>{ingredient?.icon}</ThemedText>
                <ThemedText style={styles.recipeIngAmount}>x{ing.amount}</ThemedText>
              </View>
            );
          })}
        </View>
      </View>
      <View style={[styles.craftButton, { backgroundColor: canCraft ? recipe.color : '#6b7280' }]}>
        <ThemedText style={styles.craftButtonText}>{canCraft ? 'Craft' : 'Mancano'}</ThemedText>
      </View>
    </Pressable>
  );
}

export default function CraftingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play, playLoop, stopLoop } = useSounds();
  const [ingredients, setIngredients] = useState<Ingredient[]>(INGREDIENTS);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isCrafting, setIsCrafting] = useState(false);
  const [craftingProgress, setCraftingProgress] = useState(0);
  const [craftedItems, setCraftedItems] = useState<string[]>([]);

  const canCraftRecipe = (recipe: Recipe): boolean => {
    return recipe.ingredients.every(ing => {
      const ingredient = ingredients.find(x => x.id === ing.id);
      return ingredient && ingredient.quantity >= ing.amount;
    });
  };

  const handleCraft = (recipe: Recipe) => {
    if (!canCraftRecipe(recipe) || isCrafting) return;
    
    setSelectedRecipe(recipe);
    setIsCrafting(true);
    setCraftingProgress(0);
    
    // Play crafting sounds
    play('breed_start');
    playLoop('breed_loop');
    
    // Deduct ingredients
    setIngredients(prev => prev.map(ing => {
      const required = recipe.ingredients.find(x => x.id === ing.id);
      if (required) {
        return { ...ing, quantity: ing.quantity - required.amount };
      }
      return ing;
    }));
    
    // Crafting animation
    const interval = setInterval(() => {
      setCraftingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          stopLoop('breed_loop');
          setIsCrafting(false);
          setCraftedItems(prev => [...prev, recipe.id]);
          play('strain_unlock');
          Alert.alert('Crafting Completato!', `Hai creato ${recipe.result.name}!`);
          return 100;
        }
        // Play tick sound every 20%
        if (prev % 20 === 0) {
          play('growth_tick');
        }
        return prev + (100 / (recipe.craftTime / 100));
      });
    }, 100);
  };

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
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
          <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        </View>

        <ThemedText style={styles.title}>Crafting Lab 3D</ThemedText>
        <ThemedText style={styles.subtitle}>Crea pozioni e potenziamenti</ThemedText>

        {/* 3D Workbench */}
        <View style={styles.workbench3D}>
          <Canvas>
            <ambientLight intensity={0.4} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <pointLight position={[-3, 3, 3]} intensity={0.5} color="#22c55e" />
            <PerspectiveCamera makeDefault position={[0, 1.5, 3]} />
            <OrbitControls enableZoom={false} enablePan={false} />
            
            <Suspense fallback={null}>
              <Workbench3D isCrafting={isCrafting} craftingProgress={craftingProgress} />
              {selectedRecipe && isCrafting && selectedRecipe.ingredients.map((ing, i) => {
                const ingredient = INGREDIENTS.find(x => x.id === ing.id);
                return (
                  <FloatingIngredient3D 
                    key={i} 
                    color={ingredient?.color || '#fff'} 
                    position={[(i - 1) * 0.5, 0.8, 0]}
                  />
                );
              })}
            </Suspense>
          </Canvas>
          
          {isCrafting && (
            <View style={styles.craftingOverlay}>
              <ThemedText style={styles.craftingText}>Crafting... {Math.round(craftingProgress)}%</ThemedText>
            </View>
          )}
        </View>

        {/* Ingredients */}
        <ThemedText style={styles.sectionTitle}>Ingredienti</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ingredientsScroll}>
          {ingredients.map((ingredient) => (
            <IngredientCard 
              key={ingredient.id} 
              ingredient={ingredient} 
              onSelect={() => {}} 
              isSelected={false}
            />
          ))}
        </ScrollView>

        {/* Recipes */}
        <ThemedText style={styles.sectionTitle}>Ricette</ThemedText>
        <View style={styles.recipesContainer}>
          {RECIPES.map((recipe) => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              canCraft={canCraftRecipe(recipe)}
              onCraft={() => handleCraft(recipe)}
            />
          ))}
        </View>

        {/* Crafted Items */}
        {craftedItems.length > 0 && (
          <>
            <ThemedText style={styles.sectionTitle}>Oggetti Creati</ThemedText>
            <View style={styles.craftedContainer}>
              {craftedItems.map((itemId, i) => {
                const recipe = RECIPES.find(r => r.id === itemId);
                return (
                  <View key={i} style={[styles.craftedItem, { backgroundColor: recipe?.color + '30' }]}>
                    <ThemedText style={styles.craftedIcon}>{recipe?.icon}</ThemedText>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  logo: { width: 120, height: 60 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  workbench3D: { height: 280, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 20, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  craftingOverlay: { position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center' },
  craftingText: { color: '#22c55e', fontSize: 18, fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  ingredientsScroll: { marginBottom: 24 },
  ingredientCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginRight: 12, alignItems: 'center', minWidth: 100, borderWidth: 2, borderColor: 'transparent' },
  ingredientCardSelected: { borderColor: '#22c55e' },
  ingredientIcon: { fontSize: 32, marginBottom: 8 },
  ingredientName: { color: '#fff', fontSize: 12, textAlign: 'center' },
  ingredientQty: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  recipesContainer: { gap: 12 },
  recipeCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 2 },
  recipeCardDisabled: { opacity: 0.5 },
  recipeIconBg: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  recipeIcon: { fontSize: 32 },
  recipeInfo: { flex: 1, marginLeft: 16 },
  recipeName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  recipeDesc: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
  recipeIngredients: { flexDirection: 'row', marginTop: 8, gap: 8 },
  recipeIngredient: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  recipeIngIcon: { fontSize: 14 },
  recipeIngAmount: { color: '#fff', fontSize: 12, marginLeft: 4 },
  craftButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  craftButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  craftedContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  craftedItem: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  craftedIcon: { fontSize: 28 },
});
