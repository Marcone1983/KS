import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Stars, Text as DreiText, Sparkles } from '@react-three/drei/native';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

// --- CONFIGURAZIONE COLORI E STILI ---
const THEME = {
  background: '#1a1a2e',
  primary: '#228B22', // Verde
  accent: '#FFD700',   // Oro
  text: '#FFFFFF',
  rare: '#8A2BE2',      // Viola
  epic: '#FF4500',     // Arancione-Rosso
  legendary: '#FFD700' // Oro
};

const { width, height } = Dimensions.get('window');

// --- TIPI E INTERFACCE ---
type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary';

interface Ingredient {
  id: string;
  name: string;
  rarity: Rarity;
  model: {
    geometry: 'box' | 'sphere' | 'cone';
    color: string;
  };
}

interface Recipe {
  id: string;
  name: string;
  ingredients: string[];
  result: Ingredient;
}

// --- DATI DI ESEMPIO (sostituire con API fetch) ---
const MOCK_INGREDIENTS: Ingredient[] = [
  { id: 'ing01', name: 'Cristallo Verde', rarity: 'Common', model: { geometry: 'cone', color: '#2E8B57' } },
  { id: 'ing02', name: 'Sfera di Ferro', rarity: 'Common', model: { geometry: 'sphere', color: '#A9A9A9' } },
  { id: 'ing03', name: 'Cubo di Legno', rarity: 'Common', model: { geometry: 'box', color: '#8B4513' } },
  { id: 'ing04', name: 'Gemma Rara', rarity: 'Rare', model: { geometry: 'sphere', color: THEME.rare } },
  { id: 'ing05', name: 'Frammento Epico', rarity: 'Epic', model: { geometry: 'cone', color: THEME.epic } },
];

const MOCK_RECIPES: Recipe[] = [
  {
    id: 'rec01',
    name: 'Spada Corta Verde',
    ingredients: ['ing01', 'ing02'],
    result: { id: 'item01', name: 'Spada Corta Verde', rarity: 'Common', model: { geometry: 'box', color: THEME.primary } }
  },
  {
    id: 'rec02',
    name: 'Amuleto della Rarità',
    ingredients: ['ing01', 'ing04', 'ing03'],
    result: { id: 'item02', name: 'Amuleto della Rarità', rarity: 'Rare', model: { geometry: 'sphere', color: THEME.rare } }
  },
    {
    id: 'rec03',
    name: 'Ascia da Battaglia Epica',
    ingredients: ['ing02', 'ing05', 'ing05'],
    result: { id: 'item03', name: 'Ascia da Battaglia Epica', rarity: 'Epic', model: { geometry: 'cone', color: THEME.epic } }
  },
];

const RARITY_COLORS: { [key in Rarity]: string } = {
  Common: '#FFFFFF',
  Rare: THEME.rare,
  Epic: THEME.epic,
  Legendary: THEME.legendary,
};

// --- COMPONENTI 3D ---
const Ingredient3D = ({ ingredient, position, onSelect, isSelected }: { ingredient: Ingredient; position: [number, number, number]; onSelect: (id: string) => void; isSelected: boolean }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
    }
  });

  const geometry = useMemo(() => {
    switch (ingredient.model.geometry) {
      case 'sphere': return <sphereGeometry args={[0.4, 32, 32]} />;
      case 'cone': return <coneGeometry args={[0.3, 0.6, 32]} />;
      case 'box':
      default: return <boxGeometry args={[0.6, 0.6, 0.6]} />;
    }
  }, [ingredient.model.geometry]);

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => onSelect(ingredient.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        scale={hovered || isSelected ? 1.2 : 1}
      >
        {geometry}
        <meshStandardMaterial color={ingredient.model.color} emissive={isSelected ? ingredient.model.color : 'black'} roughness={0.3} metalness={0.5} />
      </mesh>
      <DreiText position={[0, -0.7, 0]} fontSize={0.15} color={RARITY_COLORS[ingredient.rarity]} anchorX="center">
        {ingredient.name}
      </DreiText>
    </group>
  );
};

const Workbench = () => {
  return (
    <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[2, 2, 0.2, 64]} />
      <meshStandardMaterial color="#4A4A4A" metalness={0.8} roughness={0.2} />
    </mesh>
  );
};

const CraftingParticles = ({ isCrafting }: { isCrafting: boolean }) => {
  const particlesRef = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (isCrafting && particlesRef.current) {
        const t = state.clock.getElapsedTime();
        particlesRef.current.rotation.y = t * 2;
    }
  });

  if (!isCrafting) return null;

  return (
      <Sparkles ref={particlesRef} count={100} scale={3} size={6} speed={0.4} color={THEME.accent} />
  );
};

// --- COMPONENTE PRINCIPALE ---
const CraftingWorkbench3D = () => {
  const [inventory, setInventory] = useState<{[key: string]: number}>({});
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [craftedItem, setCraftedItem] = useState<Ingredient | null>(null);
  const [isCrafting, setIsCrafting] = useState(false);
  const [message, setMessage] = useState('Seleziona gli ingredienti dal tuo inventario');

  const notificationOpacity = useSharedValue(0);
  const notificationY = useSharedValue(30);

  const animatedNotificationStyle = useAnimatedStyle(() => {
    return {
      opacity: notificationOpacity.value,
      transform: [{ translateY: notificationY.value }],
    };
  });

  // Caricamento e salvataggio inventario
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const savedInventory = await AsyncStorage.getItem('userInventory');
        if (savedInventory) {
          setInventory(JSON.parse(savedInventory));
        } else {
          // Inventario iniziale di default
          const initialInventory = { 'ing01': 5, 'ing02': 3, 'ing03': 10, 'ing04': 2, 'ing05': 1 };
          setInventory(initialInventory);
          await AsyncStorage.setItem('userInventory', JSON.stringify(initialInventory));
        }
      } catch (error) {
        console.error("Failed to load inventory:", error);
      }
    };
    loadInventory();
  }, []);

  const saveInventory = async (newInventory: {[key: string]: number}) => {
      try {
          await AsyncStorage.setItem('userInventory', JSON.stringify(newInventory));
      } catch (error) {
          console.error("Failed to save inventory:", error);
      }
  }

  const showNotification = (text: string) => {
    setMessage(text);
    notificationY.value = 30;
    notificationOpacity.value = 0;
    notificationOpacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
    notificationY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });

    setTimeout(() => {
      notificationOpacity.value = withTiming(0, { duration: 500 });
      notificationY.value = withTiming(-30, { duration: 500 });
    }, 3000);
  };

  const handleSelectIngredient = (id: string) => {
    if (isCrafting) return;
    setCraftedItem(null);
    setSelectedIngredients(prev => {
        const newSelection = [...prev, id];
        checkRecipe(newSelection);
        return newSelection;
    });
  };

  const checkRecipe = (selection: string[]) => {
    const sortedSelection = [...selection].sort();
    const foundRecipe = MOCK_RECIPES.find(recipe => {
        const sortedRecipeIngredients = [...recipe.ingredients].sort();
        return JSON.stringify(sortedSelection) === JSON.stringify(sortedRecipeIngredients);
    });

    if (foundRecipe) {
        showNotification(`Ricetta trovata: ${foundRecipe.name}! Premi "Crea"`);
    } else {
        showNotification('Nessuna ricetta valida con questi ingredienti.');
    }
  }

  const handleCraft = async () => {
    if (isCrafting) return;
    const sortedSelection = [...selectedIngredients].sort();
    const foundRecipe = MOCK_RECIPES.find(recipe => {
        const sortedRecipeIngredients = [...recipe.ingredients].sort();
        return JSON.stringify(sortedSelection) === JSON.stringify(sortedRecipeIngredients);
    });

    if (!foundRecipe) {
      showNotification('Ricetta non valida!');
      return;
    }

    // Controlla se ci sono abbastanza ingredienti
    const newInventory = { ...inventory };
    let canCraft = true;
    foundRecipe.ingredients.forEach(ingId => {
        if (newInventory[ingId] > 0) {
            newInventory[ingId]--;
        } else {
            canCraft = false;
        }
    });

    if (!canCraft) {
        showNotification('Ingredienti non sufficienti!');
        return;
    }

    setIsCrafting(true);
    setCraftedItem(null);
    setSelectedIngredients([]);

    setTimeout(async () => {
      setInventory(newInventory);
      await saveInventory(newInventory);
      
      const newCraftedItem = foundRecipe.result;
      setCraftedItem(newCraftedItem);
      
      // Aggiungi l'oggetto creato all'inventario
      const finalInventory = {...newInventory};
      finalInventory[newCraftedItem.id] = (finalInventory[newCraftedItem.id] || 0) + 1;
      setInventory(finalInventory);
      await saveInventory(finalInventory);

      setIsCrafting(false);
      showNotification(`Oggetto creato: ${newCraftedItem.name}!`);
    }, 2500);
  };

  const handleReset = () => {
    setSelectedIngredients([]);
    setCraftedItem(null);
    setIsCrafting(false);
    showNotification('Selezione azzerata.');
  };

  const availableIngredients = MOCK_INGREDIENTS.filter(ing => inventory[ing.id] > 0);

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <PerspectiveCamera makeDefault position={[0, 1, 8]} fov={75} />
        <color attach="background" args={[THEME.background]} />
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color={THEME.accent} />
        <pointLight position={[-10, -5, -10]} intensity={1} color={THEME.primary} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        
        <Workbench />
        
        {availableIngredients.map((ing, index) => (
            <Ingredient3D 
                key={ing.id}
                ingredient={ing}
                position={[-4 + (index % 4) * 2, (index > 3 ? -0.5 : 1), -2]}
                onSelect={() => handleSelectIngredient(ing.id)}
                isSelected={selectedIngredients.includes(ing.id)}
            />
        ))}

        <CraftingParticles isCrafting={isCrafting} />

        {craftedItem && (
            <group position={[0, 0, 0]}>
                 <Ingredient3D ingredient={craftedItem} position={[0, 0, 0]} onSelect={() => {}} isSelected={true} />
            </group>
        )}

        {Platform.OS !== 'web' && <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />}
      </Canvas>

      <View style={styles.uiContainer}>
        <View style={styles.header}>
            <Text style={styles.title}>Banco di Lavoro</Text>
        </View>

        <Animated.View style={[styles.notification, animatedNotificationStyle]}>
            <Text style={styles.notificationText}>{message}</Text>
        </Animated.View>

        <View style={styles.bottomBar}>
            <View style={styles.selectionContainer}>
                <Text style={styles.selectionTitle}>Ingredienti Selezionati:</Text>
                <Text style={styles.selectionText}>{selectedIngredients.map(id => MOCK_INGREDIENTS.find(i=>i.id === id)?.name || '??').join(', ') || 'Nessuno'}</Text>
            </View>
            <TouchableOpacity 
                style={[styles.button, (!selectedIngredients.length || isCrafting) && styles.buttonDisabled]} 
                onPress={handleCraft} 
                disabled={!selectedIngredients.length || isCrafting}
            >
                <Text style={styles.buttonText}>{isCrafting ? 'Creazione...' : 'Crea'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                <Text style={styles.buttonText}>Azzera</Text>
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// --- STYLESHEET ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
  },
  canvas: {
    flex: 1,
  },
  uiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
      alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.text,
    textShadowColor: THEME.accent,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  notification: {
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  notificationText: {
    color: THEME.text,
    fontSize: 16,
  },
  bottomBar: {
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
  },
  selectionContainer: {
      marginBottom: 10,
  },
  selectionTitle: {
      color: THEME.accent,
      fontSize: 16,
      fontWeight: '600',
  },
  selectionText: {
      color: THEME.text,
      fontSize: 14,
      marginTop: 4,
  },
  button: {
    backgroundColor: THEME.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 5,
    shadowColor: THEME.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonDisabled: {
      backgroundColor: '#555',
      shadowColor: '#000',
  },
  resetButton: {
      backgroundColor: '#800000',
      padding: 10,
      borderRadius: 8,
      alignItems: 'center',
  },
  buttonText: {
    color: THEME.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CraftingWorkbench3D;
