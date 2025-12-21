// @ts-nocheck
import React, { useState, useRef, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, FadeIn, SlideInUp } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Research categories
type ResearchCategory = 'offense' | 'defense' | 'utility' | 'production';

interface Research {
  id: string;
  name: string;
  description: string;
  category: ResearchCategory;
  cost: number;
  timeHours: number;
  prerequisites: string[];
  unlocked: boolean;
  researching: boolean;
  completed: boolean;
  position: { x: number; y: number; z: number };
  effects: string[];
}

// All researches
const RESEARCHES: Research[] = [
  // Offense Tree
  { id: 'spray_power_1', name: 'Spray Potenziato I', description: 'Aumenta il danno dello spray del 10%', category: 'offense', cost: 100, timeHours: 1, prerequisites: [], unlocked: true, researching: false, completed: false, position: { x: -3, y: 0, z: 0 }, effects: ['+10% Danno Spray'] },
  { id: 'spray_power_2', name: 'Spray Potenziato II', description: 'Aumenta il danno dello spray del 20%', category: 'offense', cost: 250, timeHours: 2, prerequisites: ['spray_power_1'], unlocked: false, researching: false, completed: false, position: { x: -3, y: 1.5, z: 0 }, effects: ['+20% Danno Spray'] },
  { id: 'spray_power_3', name: 'Spray Potenziato III', description: 'Aumenta il danno dello spray del 35%', category: 'offense', cost: 500, timeHours: 4, prerequisites: ['spray_power_2'], unlocked: false, researching: false, completed: false, position: { x: -3, y: 3, z: 0 }, effects: ['+35% Danno Spray'] },
  { id: 'critical_hit', name: 'Colpo Critico', description: '15% probabilità di danno doppio', category: 'offense', cost: 300, timeHours: 3, prerequisites: ['spray_power_1'], unlocked: false, researching: false, completed: false, position: { x: -4.5, y: 1.5, z: 0 }, effects: ['15% Critico', '2x Danno'] },
  { id: 'multishot', name: 'Colpo Multiplo', description: 'Lo spray colpisce 3 nemici contemporaneamente', category: 'offense', cost: 750, timeHours: 6, prerequisites: ['spray_power_2', 'critical_hit'], unlocked: false, researching: false, completed: false, position: { x: -3.75, y: 3, z: 0 }, effects: ['3 Target', 'Area Effect'] },
  
  // Defense Tree
  { id: 'plant_health_1', name: 'Salute Pianta I', description: 'Aumenta la salute della pianta del 15%', category: 'defense', cost: 100, timeHours: 1, prerequisites: [], unlocked: true, researching: false, completed: false, position: { x: -1, y: 0, z: 0 }, effects: ['+15% HP Pianta'] },
  { id: 'plant_health_2', name: 'Salute Pianta II', description: 'Aumenta la salute della pianta del 30%', category: 'defense', cost: 250, timeHours: 2, prerequisites: ['plant_health_1'], unlocked: false, researching: false, completed: false, position: { x: -1, y: 1.5, z: 0 }, effects: ['+30% HP Pianta'] },
  { id: 'regeneration', name: 'Rigenerazione', description: 'La pianta rigenera 1% HP ogni 5 secondi', category: 'defense', cost: 400, timeHours: 4, prerequisites: ['plant_health_1'], unlocked: false, researching: false, completed: false, position: { x: -2, y: 1.5, z: 0 }, effects: ['1% HP/5s', 'Auto Heal'] },
  { id: 'shield', name: 'Scudo Protettivo', description: 'Assorbe il primo colpo ogni 30 secondi', category: 'defense', cost: 600, timeHours: 5, prerequisites: ['plant_health_2', 'regeneration'], unlocked: false, researching: false, completed: false, position: { x: -1.5, y: 3, z: 0 }, effects: ['Scudo', '30s Cooldown'] },
  
  // Utility Tree
  { id: 'ammo_capacity', name: 'Capacità Munizioni', description: 'Aumenta le munizioni massime del 25%', category: 'utility', cost: 150, timeHours: 1.5, prerequisites: [], unlocked: true, researching: false, completed: false, position: { x: 1, y: 0, z: 0 }, effects: ['+25% Munizioni'] },
  { id: 'reload_speed', name: 'Ricarica Veloce', description: 'Ricarica munizioni 30% più veloce', category: 'utility', cost: 200, timeHours: 2, prerequisites: ['ammo_capacity'], unlocked: false, researching: false, completed: false, position: { x: 1, y: 1.5, z: 0 }, effects: ['+30% Ricarica'] },
  { id: 'powerup_duration', name: 'Durata Power-up', description: 'I power-up durano il 50% in più', category: 'utility', cost: 350, timeHours: 3, prerequisites: ['ammo_capacity'], unlocked: false, researching: false, completed: false, position: { x: 2, y: 1.5, z: 0 }, effects: ['+50% Durata'] },
  { id: 'magnet', name: 'Magnete Risorse', description: 'Attira automaticamente le risorse vicine', category: 'utility', cost: 500, timeHours: 4, prerequisites: ['reload_speed', 'powerup_duration'], unlocked: false, researching: false, completed: false, position: { x: 1.5, y: 3, z: 0 }, effects: ['Auto Collect', 'Range +50%'] },
  
  // Production Tree
  { id: 'growth_speed', name: 'Crescita Veloce', description: 'Le piante crescono 20% più velocemente', category: 'production', cost: 200, timeHours: 2, prerequisites: [], unlocked: true, researching: false, completed: false, position: { x: 3, y: 0, z: 0 }, effects: ['+20% Crescita'] },
  { id: 'yield_boost', name: 'Resa Aumentata', description: 'Aumenta la resa del raccolto del 25%', category: 'production', cost: 300, timeHours: 3, prerequisites: ['growth_speed'], unlocked: false, researching: false, completed: false, position: { x: 3, y: 1.5, z: 0 }, effects: ['+25% Resa'] },
  { id: 'rare_seeds', name: 'Semi Rari', description: '10% probabilità di ottenere semi rari', category: 'production', cost: 450, timeHours: 4, prerequisites: ['growth_speed'], unlocked: false, researching: false, completed: false, position: { x: 4, y: 1.5, z: 0 }, effects: ['10% Semi Rari'] },
  { id: 'auto_harvest', name: 'Raccolta Automatica', description: 'Le piante mature vengono raccolte automaticamente', category: 'production', cost: 700, timeHours: 6, prerequisites: ['yield_boost', 'rare_seeds'], unlocked: false, researching: false, completed: false, position: { x: 3.5, y: 3, z: 0 }, effects: ['Auto Harvest', 'No Manual'] },
  
  // Advanced
  { id: 'master_breeder', name: 'Maestro Breeder', description: '+15% probabilità di prole leggendaria', category: 'production', cost: 1000, timeHours: 8, prerequisites: ['auto_harvest'], unlocked: false, researching: false, completed: false, position: { x: 3.5, y: 4.5, z: 0 }, effects: ['+15% Legendary'] },
  { id: 'ultimate_spray', name: 'Spray Definitivo', description: 'Sblocca lo spray definitivo che elimina tutti i nemici', category: 'offense', cost: 1500, timeHours: 12, prerequisites: ['multishot', 'shield'], unlocked: false, researching: false, completed: false, position: { x: -2.5, y: 4.5, z: 0 }, effects: ['Instant Kill', 'AOE Max'] },
  { id: 'immortal_plant', name: 'Pianta Immortale', description: 'La pianta non può morire per 10 secondi dopo aver subito danno letale', category: 'defense', cost: 1200, timeHours: 10, prerequisites: ['shield', 'magnet'], unlocked: false, researching: false, completed: false, position: { x: 0, y: 4.5, z: 0 }, effects: ['10s Immortality', 'Last Stand'] },
];

const CATEGORY_COLORS = {
  offense: '#ef4444',
  defense: '#3b82f6',
  utility: '#f59e0b',
  production: '#22c55e',
};

// 3D Research Node
function ResearchNode3D({ research, onSelect, isSelected }: { research: Research; onSelect: () => void; isSelected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      if (research.researching) {
        meshRef.current.rotation.y += 0.02;
      } else if (isSelected) {
        meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.2;
      }
    }
    if (glowRef.current && research.completed) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.1);
    }
  });

  const color = research.completed ? CATEGORY_COLORS[research.category] : 
                research.unlocked ? '#ffffff' : '#4b5563';
  const emissive = research.completed ? CATEGORY_COLORS[research.category] : 
                   research.researching ? '#f59e0b' : '#000000';

  return (
    <group position={[research.position.x, research.position.y, research.position.z]}>
      {/* Glow effect for completed */}
      {research.completed && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[0.45, 16, 16]} />
          <meshBasicMaterial color={CATEGORY_COLORS[research.category]} transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* Main node */}
      <mesh ref={meshRef} onClick={onSelect}>
        <dodecahedronGeometry args={[0.35, 0]} />
        <meshStandardMaterial 
          color={color} 
          emissive={emissive} 
          emissiveIntensity={research.researching ? 0.5 : 0.2}
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
      
      {/* Lock icon for locked */}
      {!research.unlocked && !research.completed && (
        <mesh position={[0, 0, 0.4]}>
          <boxGeometry args={[0.15, 0.2, 0.05]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      )}
    </group>
  );
}

// Connection lines between nodes
function ConnectionLine({ from, to, completed }: { from: Research; to: Research; completed: boolean }) {
  const points = [
    new THREE.Vector3(from.position.x, from.position.y, from.position.z),
    new THREE.Vector3(to.position.x, to.position.y, to.position.z),
  ];
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  
  return (
    <line geometry={lineGeometry}>
      <lineBasicMaterial color={completed ? '#22c55e' : '#4b5563'} linewidth={2} />
    </line>
  );
}

export default function ResearchTreeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [researches, setResearches] = useState(RESEARCHES);
  const [selectedResearch, setSelectedResearch] = useState<Research | null>(null);
  const [activeCategory, setActiveCategory] = useState<ResearchCategory | 'all'>('all');
  const [playerCoins, setPlayerCoins] = useState(5000);
  
  const filteredResearches = activeCategory === 'all' 
    ? researches 
    : researches.filter(r => r.category === activeCategory);

  const handleStartResearch = (research: Research) => {
    if (!research.unlocked || research.completed || research.researching) return;
    if (playerCoins < research.cost) return;
    
    setPlayerCoins(prev => prev - research.cost);
    setResearches(prev => prev.map(r => 
      r.id === research.id ? { ...r, researching: true } : r
    ));
    
    // Simulate research completion
    setTimeout(() => {
      setResearches(prev => {
        const updated = prev.map(r => 
          r.id === research.id ? { ...r, researching: false, completed: true } : r
        );
        // Unlock dependent researches
        return updated.map(r => {
          if (r.prerequisites.includes(research.id)) {
            const allPrereqsMet = r.prerequisites.every(prereq => 
              updated.find(ur => ur.id === prereq)?.completed
            );
            return allPrereqsMet ? { ...r, unlocked: true } : r;
          }
          return r;
        });
      });
    }, 3000); // 3 seconds for demo
  };

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Indietro</ThemedText>
        </Pressable>
        <View style={styles.coinsContainer}>
          <ThemedText style={styles.coinsText}>💰 {playerCoins}</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.title}>Albero Ricerche 3D</ThemedText>
      <ThemedText style={styles.subtitle}>Sblocca nuove tecnologie</ThemedText>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <Pressable 
          style={[styles.categoryButton, activeCategory === 'all' && styles.categoryButtonActive]}
          onPress={() => setActiveCategory('all')}
        >
          <ThemedText style={styles.categoryText}>Tutti</ThemedText>
        </Pressable>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <Pressable 
            key={cat}
            style={[
              styles.categoryButton, 
              activeCategory === cat && styles.categoryButtonActive,
              { borderColor: color }
            ]}
            onPress={() => setActiveCategory(cat as ResearchCategory)}
          >
            <View style={[styles.categoryDot, { backgroundColor: color }]} />
            <ThemedText style={styles.categoryText}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* 3D Research Tree */}
      <View style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, 10, -10]} intensity={0.5} color="#22c55e" />
          <OrbitControls 
            enableZoom={true} 
            enablePan={true}
            minDistance={4}
            maxDistance={15}
            maxPolarAngle={Math.PI / 2}
          />
          
          <Suspense fallback={null}>
            {/* Connection lines */}
            {filteredResearches.map(research => 
              research.prerequisites.map(prereqId => {
                const prereq = researches.find(r => r.id === prereqId);
                if (!prereq) return null;
                return (
                  <ConnectionLine 
                    key={`${prereqId}-${research.id}`}
                    from={prereq}
                    to={research}
                    completed={prereq.completed}
                  />
                );
              })
            )}
            
            {/* Research nodes */}
            {filteredResearches.map(research => (
              <ResearchNode3D
                key={research.id}
                research={research}
                isSelected={selectedResearch?.id === research.id}
                onSelect={() => setSelectedResearch(research)}
              />
            ))}
          </Suspense>
        </Canvas>
      </View>

      {/* Research Info Panel */}
      {selectedResearch && (
        <Animated.View entering={SlideInUp} style={styles.infoPanel}>
          <View style={styles.infoPanelHeader}>
            <View style={[styles.categoryIndicator, { backgroundColor: CATEGORY_COLORS[selectedResearch.category] }]} />
            <ThemedText style={styles.researchName}>{selectedResearch.name}</ThemedText>
            {selectedResearch.completed && <ThemedText style={styles.completedBadge}>✓</ThemedText>}
          </View>
          
          <ThemedText style={styles.researchDescription}>{selectedResearch.description}</ThemedText>
          
          <View style={styles.effectsContainer}>
            {selectedResearch.effects.map((effect, i) => (
              <View key={i} style={styles.effectBadge}>
                <ThemedText style={styles.effectText}>{effect}</ThemedText>
              </View>
            ))}
          </View>
          
          <View style={styles.researchStats}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statLabel}>Costo</ThemedText>
              <ThemedText style={styles.statValue}>💰 {selectedResearch.cost}</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statLabel}>Tempo</ThemedText>
              <ThemedText style={styles.statValue}>⏱️ {selectedResearch.timeHours}h</ThemedText>
            </View>
          </View>
          
          {selectedResearch.prerequisites.length > 0 && (
            <View style={styles.prerequisitesContainer}>
              <ThemedText style={styles.prerequisitesLabel}>Prerequisiti:</ThemedText>
              <ThemedText style={styles.prerequisitesText}>
                {selectedResearch.prerequisites.map(p => 
                  researches.find(r => r.id === p)?.name
                ).join(', ')}
              </ThemedText>
            </View>
          )}
          
          <Pressable
            style={[
              styles.researchButton,
              (!selectedResearch.unlocked || selectedResearch.completed || selectedResearch.researching || playerCoins < selectedResearch.cost) && styles.researchButtonDisabled
            ]}
            onPress={() => handleStartResearch(selectedResearch)}
            disabled={!selectedResearch.unlocked || selectedResearch.completed || selectedResearch.researching || playerCoins < selectedResearch.cost}
          >
            <ThemedText style={styles.researchButtonText}>
              {selectedResearch.completed ? 'Completata' :
               selectedResearch.researching ? 'In Corso...' :
               !selectedResearch.unlocked ? 'Bloccata' :
               playerCoins < selectedResearch.cost ? 'Fondi Insufficienti' :
               'Inizia Ricerca'}
            </ThemedText>
          </Pressable>
        </Animated.View>
      )}

      {/* Progress Overview */}
      <View style={[styles.progressOverview, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <ThemedText style={styles.progressText}>
          Ricerche Completate: {researches.filter(r => r.completed).length}/{researches.length}
        </ThemedText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  coinsContainer: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  coinsText: { color: '#f59e0b', fontSize: 16, fontWeight: 'bold' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#a7f3d0', textAlign: 'center', marginBottom: 16 },
  categoryScroll: { maxHeight: 50, paddingHorizontal: 20, marginBottom: 10 },
  categoryButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10, borderWidth: 2, borderColor: 'transparent' },
  categoryButtonActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  categoryText: { color: '#fff', fontSize: 13 },
  canvasContainer: { flex: 1, marginHorizontal: 10, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.3)' },
  infoPanel: { backgroundColor: 'rgba(255,255,255,0.95)', marginHorizontal: 20, marginVertical: 10, borderRadius: 20, padding: 20 },
  infoPanelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  categoryIndicator: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  researchName: { fontSize: 20, fontWeight: 'bold', color: '#166534', flex: 1 },
  completedBadge: { fontSize: 20, color: '#22c55e' },
  researchDescription: { fontSize: 14, color: '#4b5563', marginBottom: 12 },
  effectsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  effectBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  effectText: { fontSize: 12, color: '#166534' },
  researchStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  statItem: { alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#6b7280' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#166534' },
  prerequisitesContainer: { marginBottom: 12 },
  prerequisitesLabel: { fontSize: 12, color: '#6b7280' },
  prerequisitesText: { fontSize: 14, color: '#374151' },
  researchButton: { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  researchButtonDisabled: { backgroundColor: '#9ca3af' },
  researchButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  progressOverview: { paddingHorizontal: 20, paddingTop: 10 },
  progressText: { color: '#a7f3d0', fontSize: 14, textAlign: 'center' },
});
