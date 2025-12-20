// @ts-nocheck
import React, { useState, useEffect, useRef, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, ActivityIndicator, Modal, Share, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming, Easing, FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';
import { useSounds } from '@/hooks/use-sounds';
import { useGrowthSounds } from '@/hooks/use-growth-sounds';
import { useHybridStorage, HybridPlant, GeneticTraits, createHybridFromBreeding } from '@/hooks/use-hybrid-storage';
import { GeneticPreview } from '@/components/breeding/GeneticPreview';
import { FamilyTree } from '@/components/breeding/FamilyTree';
import { useBreedingAchievements, RARITY_CONFIG } from '@/hooks/use-breeding-achievements';
import { AchievementNotificationsContainer, AchievementsPage } from '@/components/breeding/AchievementsUI';

const { width, height } = Dimensions.get('window');

interface PlantVariety {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  traits: string[];
  unlocked: boolean;
  color: string;
  genetics: GeneticTraits;
}

// Base varieties available from start
const PLANT_VARIETIES: PlantVariety[] = [
  { 
    id: 'classic', 
    name: 'Cannabis Classica', 
    rarity: 'common', 
    traits: ['Resistenza Base', 'Crescita Normale'], 
    unlocked: true, 
    color: '#22c55e', 
    genetics: { thc: 45, cbd: 35, yield: 50, flowerTime: 50, resistance: 50, growth: 50, potency: 50, terpenes: ['Myrcene', 'Pinene'] } 
  },
  { 
    id: 'purple', 
    name: 'Purple Haze', 
    rarity: 'rare', 
    traits: ['Alta Resistenza', 'Crescita Lenta', 'Bonus XP'], 
    unlocked: true, 
    color: '#a855f7', 
    genetics: { thc: 70, cbd: 25, yield: 60, flowerTime: 40, resistance: 70, growth: 40, potency: 75, terpenes: ['Limonene', 'Caryophyllene'] } 
  },
  { 
    id: 'golden', 
    name: 'Golden Leaf', 
    rarity: 'epic', 
    traits: ['Bonus Monete', 'Crescita Veloce', 'Attira Power-up'], 
    unlocked: true, 
    color: '#f59e0b', 
    genetics: { thc: 65, cbd: 45, yield: 85, flowerTime: 30, resistance: 60, growth: 80, potency: 65, terpenes: ['Terpinolene', 'Humulene'] } 
  },
  { 
    id: 'crystal', 
    name: 'Crystal Kush', 
    rarity: 'legendary', 
    traits: ['Immunità Temporanea', 'Rigenerazione', 'Aura Protettiva'], 
    unlocked: true, 
    color: '#06b6d4', 
    genetics: { thc: 90, cbd: 60, yield: 80, flowerTime: 25, resistance: 90, growth: 70, potency: 95, terpenes: ['Linalool', 'Ocimene', 'Myrcene'] } 
  },
];

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

// 3D Plant Model Component
function Plant3D({ color, scale = 1, animate = true }: { color: string; scale?: number; animate?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const leafRefs = useRef<THREE.Mesh[]>([]);

  useFrame((state) => {
    if (groupRef.current && animate) {
      groupRef.current.rotation.y += 0.005;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
    leafRefs.current.forEach((leaf, i) => {
      if (leaf && animate) {
        leaf.rotation.z = Math.sin(state.clock.elapsedTime * 1.5 + i * 0.5) * 0.1;
      }
    });
  });

  return (
    <group ref={groupRef} scale={scale}>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.08, 1.2, 8]} />
        <meshStandardMaterial color="#2d5016" />
      </mesh>
      {[0, 72, 144, 216, 288].map((angle, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) leafRefs.current[i] = el; }}
          position={[
            Math.cos((angle * Math.PI) / 180) * 0.3,
            0.3 + i * 0.15,
            Math.sin((angle * Math.PI) / 180) * 0.3,
          ]}
          rotation={[0.3, (angle * Math.PI) / 180, 0.2]}
        >
          <coneGeometry args={[0.15, 0.5, 4]} />
          <meshStandardMaterial color={color} />
        </mesh>
      ))}
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, -0.7, 0]}>
        <cylinderGeometry args={[0.25, 0.2, 0.3, 16]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  );
}

// DNA Helix Animation for Breeding
function DNAHelix({ active }: { active: boolean }) {
  const helixRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (helixRef.current && active) {
      helixRef.current.rotation.y += 0.02;
    }
  });

  if (!active) return null;

  return (
    <group ref={helixRef}>
      {Array.from({ length: 20 }).map((_, i) => {
        const y = (i - 10) * 0.15;
        const angle = i * 0.5;
        return (
          <group key={i}>
            <mesh position={[Math.cos(angle) * 0.3, y, Math.sin(angle) * 0.3]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[Math.cos(angle + Math.PI) * 0.3, y, Math.sin(angle + Math.PI) * 0.3]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.5} />
            </mesh>
            <mesh position={[0, y, 0]} rotation={[0, angle, Math.PI / 2]}>
              <cylinderGeometry args={[0.01, 0.01, 0.6, 4]} />
              <meshStandardMaterial color="#ffffff" opacity={0.5} transparent />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// Genetics Bar Component
function GeneticsBar({ label, value, color }: { label: string; value: number; color: string }) {
  const animatedWidth = useSharedValue(0);
  
  useEffect(() => {
    animatedWidth.value = withTiming(value, { duration: 1000, easing: Easing.out(Easing.cubic) });
  }, [value]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value}%`,
  }));

  return (
    <View style={styles.geneticsBarContainer}>
      <ThemedText style={styles.geneticsLabel}>{label}</ThemedText>
      <View style={styles.geneticsBarBg}>
        <Animated.View style={[styles.geneticsBarFill, { backgroundColor: color }, barStyle]} />
      </View>
      <ThemedText style={styles.geneticsValue}>{value}%</ThemedText>
    </View>
  );
}

// Tab Button Component
function TabButton({ title, active, onPress, badge }: { title: string; active: boolean; onPress: () => void; badge?: number }) {
  return (
    <Pressable 
      style={[styles.tabButton, active && styles.tabButtonActive]} 
      onPress={onPress}
    >
      <ThemedText style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
        {title}
      </ThemedText>
      {badge !== undefined && badge > 0 && (
        <View style={styles.tabBadge}>
          <ThemedText style={styles.tabBadgeText}>{badge}</ThemedText>
        </View>
      )}
    </Pressable>
  );
}

// Hybrid Card Component
function HybridCard({ 
  hybrid, 
  selected, 
  onPress, 
  onLongPress,
  isFavorite 
}: { 
  hybrid: HybridPlant; 
  selected: boolean; 
  onPress: () => void;
  onLongPress?: () => void;
  isFavorite: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.hybridCard,
        { borderColor: RARITY_COLORS[hybrid.rarity] },
        selected && styles.selectedCard,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {isFavorite && (
        <View style={styles.favoriteIcon}>
          <ThemedText style={styles.favoriteIconText}>★</ThemedText>
        </View>
      )}
      <View style={[styles.hybridPreview, { backgroundColor: hybrid.color + '30' }]}>
        <View style={[styles.hybridDot, { backgroundColor: hybrid.color }]} />
      </View>
      <ThemedText style={styles.hybridName} numberOfLines={1}>{hybrid.name}</ThemedText>
      <ThemedText style={styles.hybridStrain} numberOfLines={1}>{hybrid.strain}</ThemedText>
      <View style={[styles.rarityBadgeSmall, { backgroundColor: RARITY_COLORS[hybrid.rarity] }]}>
        <ThemedText style={styles.rarityTextSmall}>{hybrid.rarity.toUpperCase()}</ThemedText>
      </View>
      <ThemedText style={styles.hybridGen}>Gen {hybrid.generation}</ThemedText>
    </Pressable>
  );
}

// Collection Stats Component
function CollectionStats({ stats }: { stats: any }) {
  return (
    <View style={styles.statsContainer}>
      <View style={styles.statItem}>
        <ThemedText style={styles.statValue}>{stats.totalHybridsCreated}</ThemedText>
        <ThemedText style={styles.statLabel}>Totali</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText style={[styles.statValue, { color: RARITY_COLORS.legendary }]}>{stats.legendaryCount}</ThemedText>
        <ThemedText style={styles.statLabel}>Legendary</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText style={[styles.statValue, { color: RARITY_COLORS.epic }]}>{stats.epicCount}</ThemedText>
        <ThemedText style={styles.statLabel}>Epic</ThemedText>
      </View>
      <View style={styles.statItem}>
        <ThemedText style={styles.statValue}>{stats.highestGeneration}</ThemedText>
        <ThemedText style={styles.statLabel}>Max Gen</ThemedText>
      </View>
    </View>
  );
}

export default function BreedingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play, playLoop, stopLoop } = useSounds();
  const { playBreedingSequence, playOffspringReveal } = useGrowthSounds();
  const { 
    hybrids, 
    favorites, 
    stats, 
    isLoading, 
    saveHybrid, 
    toggleFavorite, 
    isFavorite,
    sortHybrids,
    exportCollection,
    importCollection
  } = useHybridStorage();
  
  // Achievements hook
  const {
    achievements,
    unlockedAchievements,
    totalPoints,
    pendingNotifications,
    checkNewHybrid,
    dismissNotification,
    getCategoryProgress,
  } = useBreedingAchievements();
  
  const [activeTab, setActiveTab] = useState<'breed' | 'collection' | 'tree'>('breed');
  const [selectedParent1, setSelectedParent1] = useState<PlantVariety | HybridPlant | null>(null);
  const [selectedParent2, setSelectedParent2] = useState<PlantVariety | HybridPlant | null>(null);
  const [isBreeding, setIsBreeding] = useState(false);
  const [breedingProgress, setBreedingProgress] = useState(0);
  const [offspring, setOffspring] = useState<HybridPlant | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'rarity' | 'thc'>('date');
  const [hybridDetailModal, setHybridDetailModal] = useState<HybridPlant | null>(null);
  const [showAchievements, setShowAchievements] = useState(false);

  // Combined list of base varieties and saved hybrids for parent selection
  const allPlants = [
    ...PLANT_VARIETIES,
    ...hybrids.map(h => ({
      ...h,
      unlocked: true,
      traits: [`Gen ${h.generation}`, `THC ${h.genetics.thc}%`],
    })),
  ];

  const handleBreed = async () => {
    if (!selectedParent1 || !selectedParent2) return;
    
    setIsBreeding(true);
    setBreedingProgress(0);
    setOffspring(null);
    
    // Play breeding sounds
    play('breed_start');
    playLoop('breed_loop');
    
    // Determine rarity for sound effects
    const avgGenetics = (
      (selectedParent1.genetics.thc + selectedParent2.genetics.thc) / 2 +
      (selectedParent1.genetics.potency + selectedParent2.genetics.potency) / 2
    ) / 2;
    const expectedRarity = avgGenetics >= 85 ? 'legendary' : avgGenetics >= 70 ? 'epic' : avgGenetics >= 55 ? 'rare' : 'common';
    
    // Start breeding sequence sounds
    playBreedingSequence(5000, expectedRarity);
    
    const interval = setInterval(() => {
      setBreedingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsBreeding(false);
          stopLoop('breed_loop');
          
          // Create offspring using the helper function
          const newOffspring = createHybridFromBreeding(
            { 
              id: selectedParent1.id, 
              name: selectedParent1.name, 
              genetics: selectedParent1.genetics,
              generation: (selectedParent1 as HybridPlant).generation || 0
            },
            { 
              id: selectedParent2.id, 
              name: selectedParent2.name, 
              genetics: selectedParent2.genetics,
              generation: (selectedParent2 as HybridPlant).generation || 0
            }
          );
          
          setOffspring(newOffspring);
          
          // Play completion sound based on rarity
          playOffspringReveal(newOffspring.rarity);
          
          return 100;
        }
        if (prev % 10 === 0) {
          play('growth_tick');
        }
        return prev + 2;
      });
    }, 50);
  };

  const handleSaveOffspring = async () => {
    if (!offspring) return;
    
    const success = await saveHybrid(offspring);
    if (success) {
      play('strain_unlock');
      
      // Check achievements after saving
      const updatedHybrids = [...hybrids, offspring];
      await checkNewHybrid(offspring, updatedHybrids);
      
      // Reset for new breeding
      setOffspring(null);
      setSelectedParent1(null);
      setSelectedParent2(null);
    }
  };

  const handleSelectParent = (plant: PlantVariety | HybridPlant) => {
    if (!plant.unlocked) return;
    
    play('breed_select');
    
    if (!selectedParent1) {
      setSelectedParent1(plant);
      setOffspring(null);
    } else if (!selectedParent2 && plant.id !== selectedParent1.id) {
      setSelectedParent2(plant);
      setOffspring(null);
    } else if (selectedParent1.id === plant.id) {
      setSelectedParent1(null);
    } else if (selectedParent2?.id === plant.id) {
      setSelectedParent2(null);
    }
  };

  const handleExportCollection = async () => {
    try {
      const jsonData = await exportCollection();
      await Share.share({
        message: jsonData,
        title: 'KS Breeding Collection',
      });
    } catch (error) {
      Alert.alert('Errore', 'Impossibile esportare la collezione');
    }
  };

  const handleImportCollection = () => {
    Alert.prompt(
      'Importa Collezione',
      'Incolla il JSON della collezione:',
      async (text) => {
        if (text) {
          const success = await importCollection(text);
          if (success) {
            Alert.alert('Successo', 'Collezione importata con successo!');
          } else {
            Alert.alert('Errore', 'JSON non valido o corrotto');
          }
        }
      },
      'plain-text'
    );
  };

  const sortedHybrids = sortHybrids(sortBy);

  // Base varieties for family tree
  const baseVarietiesForTree = PLANT_VARIETIES.map(v => ({
    id: v.id,
    name: v.name,
    rarity: v.rarity,
    color: v.color,
  }));

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      {/* Achievement Notifications */}
      <AchievementNotificationsContainer 
        notifications={pendingNotifications}
        onDismiss={dismissNotification}
      />
      
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
          
          {/* Achievement Points Button */}
          <Pressable style={styles.achievementButton} onPress={() => setShowAchievements(true)}>
            <ThemedText style={styles.achievementIcon}>🏆</ThemedText>
            <ThemedText style={styles.achievementPoints}>{totalPoints}</ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.title}>Breeding Lab 3D</ThemedText>
        <ThemedText style={styles.subtitle}>Crea nuove varietà genetiche</ThemedText>

        {/* Tabs - Now with 3 tabs */}
        <View style={styles.tabsContainer}>
          <TabButton title="Breeding" active={activeTab === 'breed'} onPress={() => setActiveTab('breed')} />
          <TabButton title="Collezione" active={activeTab === 'collection'} onPress={() => setActiveTab('collection')} badge={hybrids.length} />
          <TabButton title="Albero" active={activeTab === 'tree'} onPress={() => setActiveTab('tree')} />
        </View>

        {activeTab === 'breed' ? (
          <>
            {/* 3D Breeding Station */}
            <View style={styles.breedingStation3D}>
              <View style={styles.canvas3DContainer}>
                <Canvas>
                  <ambientLight intensity={0.6} />
                  <pointLight position={[5, 5, 5]} intensity={1} />
                  <pointLight position={[-5, 5, -5]} intensity={0.5} color="#22c55e" />
                  <PerspectiveCamera makeDefault position={[0, 1, 4]} />
                  <OrbitControls enableZoom={false} enablePan={false} />
                  
                  <Suspense fallback={null}>
                    {selectedParent1 && (
                      <group position={[-1.2, 0, 0]}>
                        <Plant3D color={selectedParent1.color} scale={0.8} />
                      </group>
                    )}
                    <DNAHelix active={isBreeding} />
                    {selectedParent2 && (
                      <group position={[1.2, 0, 0]}>
                        <Plant3D color={selectedParent2.color} scale={0.8} />
                      </group>
                    )}
                    {offspring && !isBreeding && (
                      <group position={[0, 0, 0]}>
                        <Plant3D color={offspring.color} scale={1} />
                      </group>
                    )}
                  </Suspense>
                </Canvas>
              </View>

              {/* Parent Selection Labels */}
              <View style={styles.parentLabels}>
                <View style={styles.parentLabel}>
                  <ThemedText style={styles.parentLabelText}>
                    {selectedParent1 ? selectedParent1.name : 'Seleziona Genitore 1'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.plusSign}>×</ThemedText>
                <View style={styles.parentLabel}>
                  <ThemedText style={styles.parentLabelText}>
                    {selectedParent2 ? selectedParent2.name : 'Seleziona Genitore 2'}
                  </ThemedText>
                </View>
              </View>

              {/* Breed Button */}
              <Pressable
                style={[styles.breedButton, (!selectedParent1 || !selectedParent2 || isBreeding) && styles.breedButtonDisabled]}
                onPress={handleBreed}
                disabled={!selectedParent1 || !selectedParent2 || isBreeding}
              >
                {isBreeding ? (
                  <View style={styles.progressContainer}>
                    <View style={[styles.progressBar, { width: `${breedingProgress}%` }]} />
                    <ThemedText style={styles.breedButtonText}>Breeding... {breedingProgress}%</ThemedText>
                  </View>
                ) : (
                  <ThemedText style={styles.breedButtonText}>
                    {offspring ? 'Nuovo Breeding' : 'Inizia Breeding'}
                  </ThemedText>
                )}
              </Pressable>
            </View>

            {/* Genetic Preview */}
            {showPreview && selectedParent1 && selectedParent2 && !offspring && !isBreeding && (
              <Animated.View entering={FadeIn} exiting={FadeOut}>
                <GeneticPreview 
                  parent1={{ name: selectedParent1.name, genetics: selectedParent1.genetics, rarity: selectedParent1.rarity }}
                  parent2={{ name: selectedParent2.name, genetics: selectedParent2.genetics, rarity: selectedParent2.rarity }}
                  showDetails={true}
                />
              </Animated.View>
            )}

            {/* Offspring Result */}
            {offspring && (
              <Animated.View entering={SlideInRight} style={styles.offspringCard}>
                <ThemedText style={styles.offspringTitle}>Nuova Varietà Creata!</ThemedText>
                <ThemedText style={[styles.offspringName, { color: RARITY_COLORS[offspring.rarity] }]}>
                  {offspring.name}
                </ThemedText>
                <ThemedText style={styles.offspringStrain}>{offspring.strain}</ThemedText>
                <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[offspring.rarity] }]}>
                  <ThemedText style={styles.rarityText}>{offspring.rarity.toUpperCase()}</ThemedText>
                </View>
                <ThemedText style={styles.generationText}>Generazione {offspring.generation}</ThemedText>
                
                <View style={styles.geneticsContainer}>
                  <GeneticsBar label="THC" value={offspring.genetics.thc} color="#a855f7" />
                  <GeneticsBar label="CBD" value={offspring.genetics.cbd} color="#22c55e" />
                  <GeneticsBar label="Resa" value={offspring.genetics.yield} color="#f59e0b" />
                  <GeneticsBar label="Resistenza" value={offspring.genetics.resistance} color="#ef4444" />
                  <GeneticsBar label="Crescita" value={offspring.genetics.growth} color="#10b981" />
                  <GeneticsBar label="Potenza" value={offspring.genetics.potency} color="#ec4899" />
                </View>

                {offspring.genetics.terpenes && offspring.genetics.terpenes.length > 0 && (
                  <View style={styles.terpenesContainer}>
                    <ThemedText style={styles.terpenesLabel}>Terpeni:</ThemedText>
                    <View style={styles.terpenesList}>
                      {offspring.genetics.terpenes.map((terpene, i) => (
                        <View key={i} style={styles.terpeneBadge}>
                          <ThemedText style={styles.terpeneText}>{terpene}</ThemedText>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                <Pressable style={styles.saveButton} onPress={handleSaveOffspring}>
                  <ThemedText style={styles.saveButtonText}>Salva nella Collezione</ThemedText>
                </Pressable>
              </Animated.View>
            )}

            {/* Available Varieties */}
            <ThemedText style={styles.sectionTitle}>Varietà Base</ThemedText>
            <View style={styles.varietiesGrid}>
              {PLANT_VARIETIES.map((variety) => (
                <Pressable
                  key={variety.id}
                  style={[
                    styles.varietyCard,
                    !variety.unlocked && styles.lockedCard,
                    { borderColor: RARITY_COLORS[variety.rarity] },
                    (selectedParent1?.id === variety.id || selectedParent2?.id === variety.id) && styles.selectedCard,
                  ]}
                  onPress={() => handleSelectParent(variety)}
                >
                  <View style={[styles.varietyPreview, { backgroundColor: variety.color + '20' }]}>
                    <View style={[styles.varietyDot, { backgroundColor: variety.color }]} />
                  </View>
                  <ThemedText style={styles.varietyName}>{variety.name}</ThemedText>
                  <View style={[styles.rarityBadgeSmall, { backgroundColor: RARITY_COLORS[variety.rarity] }]}>
                    <ThemedText style={styles.rarityTextSmall}>{variety.rarity.toUpperCase()}</ThemedText>
                  </View>
                </Pressable>
              ))}
            </View>

            {/* Saved Hybrids for Breeding */}
            {hybrids.length > 0 && (
              <>
                <ThemedText style={styles.sectionTitle}>I Tuoi Ibridi ({hybrids.length})</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hybridsScroll}>
                  {hybrids.slice(0, 10).map((hybrid) => (
                    <HybridCard
                      key={hybrid.id}
                      hybrid={hybrid}
                      selected={selectedParent1?.id === hybrid.id || selectedParent2?.id === hybrid.id}
                      onPress={() => handleSelectParent(hybrid as any)}
                      isFavorite={isFavorite(hybrid.id)}
                    />
                  ))}
                </ScrollView>
              </>
            )}
          </>
        ) : activeTab === 'collection' ? (
          /* Collection Tab */
          <>
            {/* Collection Stats */}
            <CollectionStats stats={stats} />

            {/* Export/Import Buttons */}
            <View style={styles.exportImportContainer}>
              <Pressable style={styles.exportButton} onPress={handleExportCollection}>
                <ThemedText style={styles.exportButtonText}>📤 Esporta</ThemedText>
              </Pressable>
              <Pressable style={styles.importButton} onPress={handleImportCollection}>
                <ThemedText style={styles.importButtonText}>📥 Importa</ThemedText>
              </Pressable>
            </View>

            {/* Sort Options */}
            <View style={styles.sortContainer}>
              <ThemedText style={styles.sortLabel}>Ordina per:</ThemedText>
              <Pressable 
                style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
                onPress={() => setSortBy('date')}
              >
                <ThemedText style={styles.sortButtonText}>Data</ThemedText>
              </Pressable>
              <Pressable 
                style={[styles.sortButton, sortBy === 'rarity' && styles.sortButtonActive]}
                onPress={() => setSortBy('rarity')}
              >
                <ThemedText style={styles.sortButtonText}>Rarità</ThemedText>
              </Pressable>
              <Pressable 
                style={[styles.sortButton, sortBy === 'thc' && styles.sortButtonActive]}
                onPress={() => setSortBy('thc')}
              >
                <ThemedText style={styles.sortButtonText}>THC</ThemedText>
              </Pressable>
            </View>

            {/* Hybrids Grid */}
            {isLoading ? (
              <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 40 }} />
            ) : sortedHybrids.length === 0 ? (
              <View style={styles.emptyCollection}>
                <ThemedText style={styles.emptyText}>Nessun ibrido salvato</ThemedText>
                <ThemedText style={styles.emptySubtext}>Crea il tuo primo ibrido nel tab Breeding!</ThemedText>
              </View>
            ) : (
              <View style={styles.collectionGrid}>
                {sortedHybrids.map((hybrid) => (
                  <HybridCard
                    key={hybrid.id}
                    hybrid={hybrid}
                    selected={false}
                    onPress={() => setHybridDetailModal(hybrid)}
                    onLongPress={() => toggleFavorite(hybrid.id)}
                    isFavorite={isFavorite(hybrid.id)}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          /* Family Tree Tab */
          <>
            <View style={styles.treeContainer}>
              {hybrids.length === 0 ? (
                <View style={styles.emptyCollection}>
                  <ThemedText style={styles.emptyText}>Nessun albero genealogico</ThemedText>
                  <ThemedText style={styles.emptySubtext}>Crea ibridi per vedere la loro discendenza!</ThemedText>
                </View>
              ) : (
                <FamilyTree 
                  hybrids={hybrids}
                  baseVarieties={baseVarietiesForTree}
                  onNodePress={(nodeId) => {
                    const hybrid = hybrids.find(h => h.id === nodeId);
                    if (hybrid) setHybridDetailModal(hybrid);
                  }}
                />
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Hybrid Detail Modal */}
      <Modal
        visible={hybridDetailModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setHybridDetailModal(null)}
      >
        {hybridDetailModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Pressable style={styles.modalClose} onPress={() => setHybridDetailModal(null)}>
                <ThemedText style={styles.modalCloseText}>✕</ThemedText>
              </Pressable>
              
              <ThemedText style={[styles.modalTitle, { color: RARITY_COLORS[hybridDetailModal.rarity] }]}>
                {hybridDetailModal.name}
              </ThemedText>
              <ThemedText style={styles.modalStrain}>{hybridDetailModal.strain}</ThemedText>
              
              <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[hybridDetailModal.rarity], alignSelf: 'center' }]}>
                <ThemedText style={styles.rarityText}>{hybridDetailModal.rarity.toUpperCase()}</ThemedText>
              </View>
              
              <ThemedText style={styles.modalGeneration}>Generazione {hybridDetailModal.generation}</ThemedText>
              
              <View style={styles.modalLineage}>
                <ThemedText style={styles.lineageLabel}>Genitori:</ThemedText>
                <ThemedText style={styles.lineageText}>{hybridDetailModal.parent1Name} × {hybridDetailModal.parent2Name}</ThemedText>
              </View>
              
              <View style={styles.geneticsContainer}>
                <GeneticsBar label="THC" value={hybridDetailModal.genetics.thc} color="#a855f7" />
                <GeneticsBar label="CBD" value={hybridDetailModal.genetics.cbd} color="#22c55e" />
                <GeneticsBar label="Resa" value={hybridDetailModal.genetics.yield} color="#f59e0b" />
                <GeneticsBar label="Resistenza" value={hybridDetailModal.genetics.resistance} color="#ef4444" />
                <GeneticsBar label="Crescita" value={hybridDetailModal.genetics.growth} color="#10b981" />
                <GeneticsBar label="Potenza" value={hybridDetailModal.genetics.potency} color="#ec4899" />
              </View>

              <Pressable 
                style={styles.favoriteButton} 
                onPress={() => toggleFavorite(hybridDetailModal.id)}
              >
                <ThemedText style={styles.favoriteButtonText}>
                  {isFavorite(hybridDetailModal.id) ? '★ Rimuovi dai Preferiti' : '☆ Aggiungi ai Preferiti'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>

      {/* Achievements Page Modal */}
      <AchievementsPage
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
        achievements={achievements}
        totalPoints={totalPoints}
        getCategoryProgress={getCategoryProgress}
      />
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
  achievementButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
  achievementIcon: { fontSize: 18 },
  achievementPoints: { color: '#f59e0b', fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a7f3d0', textAlign: 'center', marginBottom: 16 },
  
  // Tabs
  tabsContainer: { flexDirection: 'row', marginBottom: 20, gap: 8 },
  tabButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tabButtonActive: { backgroundColor: '#22c55e' },
  tabButtonText: { color: '#a7f3d0', fontSize: 13, fontWeight: '600' },
  tabButtonTextActive: { color: '#fff' },
  tabBadge: { backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  // Breeding Station
  breedingStation3D: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 20, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  canvas3DContainer: { height: 250, borderRadius: 16, overflow: 'hidden', backgroundColor: '#0a0a0a' },
  parentLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, marginBottom: 16 },
  parentLabel: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, maxWidth: (width - 100) / 2 },
  parentLabelText: { color: '#fff', fontSize: 12 },
  plusSign: { fontSize: 24, color: '#f59e0b', marginHorizontal: 12 },
  breedButton: { backgroundColor: '#22c55e', borderRadius: 12, padding: 16, alignItems: 'center', overflow: 'hidden' },
  breedButtonDisabled: { backgroundColor: '#4b5563' },
  breedButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  progressContainer: { width: '100%', height: 24, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  progressBar: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#16a34a', borderRadius: 12 },
  
  // Offspring
  offspringCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 20, marginBottom: 24, alignItems: 'center' },
  offspringTitle: { fontSize: 16, color: '#166534', marginBottom: 8 },
  offspringName: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  offspringStrain: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  generationText: { fontSize: 14, color: '#374151', marginTop: 8, marginBottom: 12 },
  geneticsContainer: { width: '100%', marginTop: 16 },
  geneticsBarContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  geneticsLabel: { width: 80, fontSize: 12, color: '#374151' },
  geneticsBarBg: { flex: 1, height: 12, backgroundColor: '#e5e7eb', borderRadius: 6, overflow: 'hidden' },
  geneticsBarFill: { height: '100%', borderRadius: 6 },
  geneticsValue: { width: 40, textAlign: 'right', fontSize: 12, color: '#374151' },
  terpenesContainer: { marginTop: 16, width: '100%' },
  terpenesLabel: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  terpenesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  terpeneBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  terpeneText: { fontSize: 11, color: '#166534' },
  saveButton: { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, marginTop: 16 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  // Varieties
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16, marginTop: 8 },
  varietiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  varietyCard: { width: (width - 52) / 2, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 3 },
  selectedCard: { backgroundColor: '#dcfce7' },
  lockedCard: { opacity: 0.6 },
  varietyPreview: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  varietyDot: { width: 30, height: 30, borderRadius: 15 },
  varietyName: { fontSize: 14, fontWeight: 'bold', color: '#166534', textAlign: 'center' },
  rarityBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  rarityBadgeSmall: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
  rarityText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  rarityTextSmall: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  
  // Hybrids scroll
  hybridsScroll: { marginBottom: 20 },
  hybridCard: { width: 140, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 2, marginRight: 12 },
  hybridPreview: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  hybridDot: { width: 24, height: 24, borderRadius: 12 },
  hybridName: { fontSize: 12, fontWeight: 'bold', color: '#166534', textAlign: 'center' },
  hybridStrain: { fontSize: 9, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  hybridGen: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  favoriteIcon: { position: 'absolute', top: 8, right: 8, zIndex: 1 },
  favoriteIconText: { fontSize: 16, color: '#f59e0b' },
  
  // Collection
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 16, padding: 16, marginBottom: 16 },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 11, color: '#a7f3d0', marginTop: 4 },
  exportImportContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  exportButton: { flex: 1, backgroundColor: 'rgba(34, 197, 94, 0.3)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#22c55e' },
  exportButtonText: { color: '#22c55e', fontSize: 14, fontWeight: '600' },
  importButton: { flex: 1, backgroundColor: 'rgba(59, 130, 246, 0.3)', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#3b82f6' },
  importButtonText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  sortContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sortLabel: { color: '#a7f3d0', fontSize: 14 },
  sortButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  sortButtonActive: { backgroundColor: '#22c55e' },
  sortButtonText: { color: '#fff', fontSize: 12 },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  emptyCollection: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#fff', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#a7f3d0' },
  
  // Tree Tab
  treeContainer: { height: height * 0.6, marginBottom: 20 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 400 },
  modalClose: { position: 'absolute', top: 16, right: 16, zIndex: 1 },
  modalCloseText: { fontSize: 24, color: '#9ca3af' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  modalStrain: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 12 },
  modalGeneration: { fontSize: 14, color: '#374151', textAlign: 'center', marginTop: 12 },
  modalLineage: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12, marginTop: 16 },
  lineageLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  lineageText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  favoriteButton: { backgroundColor: '#fef3c7', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  favoriteButtonText: { color: '#92400e', fontSize: 14, fontWeight: '600' },
});
