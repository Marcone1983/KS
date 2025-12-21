// @ts-nocheck
import React, { useState, Suspense, useRef } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame, useLoader } from '@react-three/fiber/native';
import { OrbitControls } from '@react-three/drei/native';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';
import Animated, { FadeIn, SlideInRight, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

type EntryCategory = 'plants' | 'pests' | 'items' | 'powerups';

interface EncyclopediaEntry {
  id: string;
  name: string;
  category: EntryCategory;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  description: string;
  modelPath: string;
  stats: { label: string; value: string | number }[];
  discovered: boolean;
  lore: string;
}

const ENTRIES: EncyclopediaEntry[] = [
  // Plants
  { id: 'plant_seedling', name: 'Germoglio', category: 'plants', rarity: 'common', description: 'Il primo stadio di vita della pianta. Fragile ma pieno di potenziale.', modelPath: 'assets/models/growth_stages/plant_stage_1_seedling.glb', stats: [{ label: 'Stadio', value: '1/8' }, { label: 'HP', value: 50 }, { label: 'Crescita', value: '2 giorni' }], discovered: true, lore: 'Ogni grande pianta inizia come un piccolo seme. Con cure adeguate, questo germoglio diventerà un esemplare magnifico.' },
  { id: 'plant_flowering', name: 'Pianta in Fioritura', category: 'plants', rarity: 'rare', description: 'Stadio avanzato con fiori visibili e cime in formazione.', modelPath: 'assets/models/growth_stages/plant_stage_7_full_flowering.glb', stats: [{ label: 'Stadio', value: '7/8' }, { label: 'HP', value: 200 }, { label: 'Resa', value: 'Alta' }], discovered: true, lore: 'La pianta ha raggiunto la sua massima bellezza. I fiori emanano un aroma intenso che attira sia amici che nemici.' },
  { id: 'plant_mature', name: 'Pianta Matura', category: 'plants', rarity: 'epic', description: 'Pronta per il raccolto. Cime dense e ricche di principi attivi.', modelPath: 'assets/models/growth_stages/plant_stage_8_maturation.glb', stats: [{ label: 'Stadio', value: '8/8' }, { label: 'HP', value: 250 }, { label: 'Qualità', value: 'Premium' }], discovered: true, lore: 'Il culmine del ciclo vitale. Le foglie ingialliscono mentre la pianta concentra tutta la sua energia nelle cime.' },
  
  // Pests
  { id: 'aphid', name: 'Afide', category: 'pests', rarity: 'common', description: 'Piccolo insetto verde che succhia la linfa delle piante.', modelPath: 'assets/models/pests/aphid.glb', stats: [{ label: 'HP', value: 10 }, { label: 'Danno', value: 5 }, { label: 'Velocità', value: 'Media' }], discovered: true, lore: 'Gli afidi si riproducono rapidamente e possono infestare un intero giardino in pochi giorni. Non sottovalutarli!' },
  { id: 'spider_mite', name: 'Ragnetto Rosso', category: 'pests', rarity: 'common', description: 'Acaro microscopico che tesse ragnatele sulle foglie.', modelPath: 'assets/models/pests/spider_mite.glb', stats: [{ label: 'HP', value: 8 }, { label: 'Danno', value: 3 }, { label: 'Velocità', value: 'Alta' }], discovered: true, lore: 'Quasi invisibile ad occhio nudo, il ragnetto rosso è un nemico subdolo che prospera in ambienti secchi.' },
  { id: 'caterpillar', name: 'Bruco', category: 'pests', rarity: 'rare', description: 'Larva vorace che divora foglie e steli.', modelPath: 'assets/models/pests/caterpillar.glb', stats: [{ label: 'HP', value: 30 }, { label: 'Danno', value: 15 }, { label: 'Velocità', value: 'Lenta' }], discovered: true, lore: 'Un singolo bruco può consumare il suo peso in foglie ogni giorno. La sua lentezza è compensata dalla sua resistenza.' },
  { id: 'whitefly', name: 'Mosca Bianca', category: 'pests', rarity: 'rare', description: 'Insetto volante che trasmette malattie alle piante.', modelPath: 'assets/models/pests/whitefly.glb', stats: [{ label: 'HP', value: 12 }, { label: 'Danno', value: 8 }, { label: 'Velocità', value: 'Molto Alta' }], discovered: true, lore: 'Le mosche bianche sono difficili da colpire a causa del loro volo erratico. Portano con sé virus devastanti.' },
  { id: 'mealybug', name: 'Cocciniglia', category: 'pests', rarity: 'rare', description: 'Insetto ricoperto di cera che si attacca agli steli.', modelPath: 'assets/models/pests/mealybug.glb', stats: [{ label: 'HP', value: 25 }, { label: 'Danno', value: 10 }, { label: 'Velocità', value: 'Molto Lenta' }], discovered: true, lore: 'La cocciniglia secerne una sostanza appiccicosa che attira funghi e altri parassiti secondari.' },
  { id: 'thrip', name: 'Tripide', category: 'pests', rarity: 'common', description: 'Minuscolo insetto che raschia la superficie delle foglie.', modelPath: 'assets/models/pests/thrip.glb', stats: [{ label: 'HP', value: 5 }, { label: 'Danno', value: 2 }, { label: 'Velocità', value: 'Alta' }], discovered: true, lore: 'I tripidi sono così piccoli che spesso passano inosservati fino a quando il danno non è già fatto.' },
  { id: 'locust_boss', name: 'Locusta Regina', category: 'pests', rarity: 'legendary', description: 'Boss devastante che guida sciami di locuste.', modelPath: 'assets/models/pests/locust_boss.glb', stats: [{ label: 'HP', value: 500 }, { label: 'Danno', value: 50 }, { label: 'Abilità', value: 'Sciame' }], discovered: true, lore: 'La Locusta Regina è il terrore di ogni coltivatore. Quando appare, porta con sé la distruzione totale.' },
  
  // Items
  { id: 'pot_basic', name: 'Vaso Base', category: 'items', rarity: 'common', description: 'Un semplice vaso in terracotta per le tue piante.', modelPath: 'assets/models/marketplace/pot_basic.glb', stats: [{ label: 'Capacità', value: '1 Pianta' }, { label: 'Bonus', value: 'Nessuno' }], discovered: true, lore: 'Ogni coltivatore inizia con un vaso semplice. Non è appariscente, ma fa il suo lavoro.' },
  { id: 'pot_premium', name: 'Vaso Premium', category: 'items', rarity: 'epic', description: 'Vaso decorato con sistema di drenaggio avanzato.', modelPath: 'assets/models/marketplace/pot_premium.glb', stats: [{ label: 'Capacità', value: '1 Pianta' }, { label: 'Bonus', value: '+15% Crescita' }], discovered: true, lore: 'Realizzato da artigiani esperti, questo vaso garantisce condizioni ottimali per le radici.' },
  { id: 'grow_lamp', name: 'Lampada Crescita', category: 'items', rarity: 'rare', description: 'Illuminazione LED ottimizzata per la fotosintesi.', modelPath: 'assets/models/marketplace/grow_lamp.glb', stats: [{ label: 'Watt', value: 100 }, { label: 'Bonus', value: '+25% Crescita' }], discovered: true, lore: 'La luce artificiale permette di coltivare in qualsiasi condizione, giorno e notte.' },
  
  // Powerups
  { id: 'super_spray', name: 'Super Spray', category: 'powerups', rarity: 'rare', description: 'Spray potenziato con danno aumentato.', modelPath: 'assets/models/powerups/super_spray.glb', stats: [{ label: 'Danno', value: '+100%' }, { label: 'Durata', value: '10s' }], discovered: true, lore: 'Formula concentrata che raddoppia l\'efficacia del tuo spray per un breve periodo.' },
  { id: 'health_potion', name: 'Pozione Salute', category: 'powerups', rarity: 'common', description: 'Ripristina la salute della pianta.', modelPath: 'assets/models/powerups/health_potion.glb', stats: [{ label: 'Cura', value: '+50 HP' }, { label: 'Uso', value: 'Istantaneo' }], discovered: true, lore: 'Un mix di nutrienti essenziali che rivitalizza istantaneamente le piante danneggiate.' },
  { id: 'shield_barrier', name: 'Scudo Barriera', category: 'powerups', rarity: 'epic', description: 'Crea una barriera protettiva attorno alla pianta.', modelPath: 'assets/models/powerups/shield_barrier.glb', stats: [{ label: 'Protezione', value: '100%' }, { label: 'Durata', value: '5s' }], discovered: true, lore: 'Campo di forza temporaneo che blocca tutti gli attacchi nemici.' },
];

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

const CATEGORY_ICONS = {
  plants: '🌿',
  pests: '🐛',
  items: '📦',
  powerups: '⚡',
};

// 3D Model Viewer
function ModelViewer({ modelPath }: { modelPath: string }) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
    }
  });

  // Fallback geometry for demo
  return (
    <group ref={meshRef}>
      <mesh>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color="#22c55e" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#86efac" emissive="#22c55e" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

export default function Encyclopedia3DScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<EntryCategory | 'all'>('all');
  const [selectedEntry, setSelectedEntry] = useState<EncyclopediaEntry | null>(null);
  const [showModal, setShowModal] = useState(false);

  const filteredEntries = ENTRIES.filter(entry => {
    const matchesSearch = entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || entry.category === activeCategory;
    return matchesSearch && matchesCategory && entry.discovered;
  });

  const openEntry = (entry: EncyclopediaEntry) => {
    setSelectedEntry(entry);
    setShowModal(true);
  };

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Indietro</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Enciclopedia 3D</ThemedText>
        <View style={{ width: 60 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <Pressable 
          style={[styles.categoryTab, activeCategory === 'all' && styles.categoryTabActive]}
          onPress={() => setActiveCategory('all')}
        >
          <ThemedText style={styles.categoryTabText}>📚 Tutti</ThemedText>
        </Pressable>
        {(Object.keys(CATEGORY_ICONS) as EntryCategory[]).map(cat => (
          <Pressable 
            key={cat}
            style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
            onPress={() => setActiveCategory(cat)}
          >
            <ThemedText style={styles.categoryTabText}>
              {CATEGORY_ICONS[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Entries Grid */}
      <ScrollView style={styles.entriesContainer} contentContainerStyle={styles.entriesGrid}>
        {filteredEntries.map((entry, index) => (
          <Animated.View 
            key={entry.id} 
            entering={FadeIn.delay(index * 50)}
            style={styles.entryCardWrapper}
          >
            <Pressable 
              style={[styles.entryCard, { borderColor: RARITY_COLORS[entry.rarity] }]}
              onPress={() => openEntry(entry)}
            >
              {/* Mini 3D Preview */}
              <View style={styles.miniPreview}>
                <Canvas camera={{ position: [0, 0, 3] }}>
                  <ambientLight intensity={0.6} />
                  <pointLight position={[5, 5, 5]} />
                  <Suspense fallback={null}>
                    <mesh rotation={[0, Date.now() * 0.001, 0]}>
                      <boxGeometry args={[0.8, 0.8, 0.8]} />
                      <meshStandardMaterial color={RARITY_COLORS[entry.rarity]} />
                    </mesh>
                  </Suspense>
                </Canvas>
              </View>
              
              <View style={styles.entryInfo}>
                <ThemedText style={styles.entryName}>{entry.name}</ThemedText>
                <View style={[styles.rarityBadge, { backgroundColor: RARITY_COLORS[entry.rarity] }]}>
                  <ThemedText style={styles.rarityText}>{entry.rarity.toUpperCase()}</ThemedText>
                </View>
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            {selectedEntry && (
              <>
                {/* 3D Model Viewer */}
                <View style={styles.modelViewer}>
                  <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} color="#22c55e" />
                    <OrbitControls enableZoom={true} enablePan={false} />
                    <Suspense fallback={null}>
                      <ModelViewer modelPath={selectedEntry.modelPath} />
                    </Suspense>
                  </Canvas>
                  
                  <View style={[styles.rarityBanner, { backgroundColor: RARITY_COLORS[selectedEntry.rarity] }]}>
                    <ThemedText style={styles.rarityBannerText}>{selectedEntry.rarity.toUpperCase()}</ThemedText>
                  </View>
                </View>

                <ScrollView style={styles.modalScroll}>
                  <ThemedText style={styles.modalTitle}>{selectedEntry.name}</ThemedText>
                  <ThemedText style={styles.modalCategory}>
                    {CATEGORY_ICONS[selectedEntry.category]} {selectedEntry.category.toUpperCase()}
                  </ThemedText>
                  
                  <ThemedText style={styles.modalDescription}>{selectedEntry.description}</ThemedText>
                  
                  {/* Stats */}
                  <View style={styles.statsContainer}>
                    <ThemedText style={styles.sectionTitle}>Statistiche</ThemedText>
                    {selectedEntry.stats.map((stat, i) => (
                      <View key={i} style={styles.statRow}>
                        <ThemedText style={styles.statLabel}>{stat.label}</ThemedText>
                        <ThemedText style={styles.statValue}>{stat.value}</ThemedText>
                      </View>
                    ))}
                  </View>
                  
                  {/* Lore */}
                  <View style={styles.loreContainer}>
                    <ThemedText style={styles.sectionTitle}>📜 Lore</ThemedText>
                    <ThemedText style={styles.loreText}>{selectedEntry.lore}</ThemedText>
                  </View>
                </ScrollView>

                <Pressable style={styles.closeButton} onPress={() => setShowModal(false)}>
                  <ThemedText style={styles.closeButtonText}>Chiudi</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Stats Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <ThemedText style={styles.footerText}>
          Scoperte: {ENTRIES.filter(e => e.discovered).length}/{ENTRIES.length}
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 10 },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 16 },
  categoryScroll: { maxHeight: 50, paddingHorizontal: 20, marginBottom: 10 },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 10 },
  categoryTabActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  categoryTabText: { color: '#fff', fontSize: 14 },
  entriesContainer: { flex: 1 },
  entriesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, gap: 10 },
  entryCardWrapper: { width: (width - 50) / 2 },
  entryCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden', borderWidth: 2 },
  miniPreview: { height: 100, backgroundColor: 'rgba(0,0,0,0.2)' },
  entryInfo: { padding: 12 },
  entryName: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  rarityBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  rarityText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 30, borderTopRightRadius: 30, maxHeight: '90%' },
  modelViewer: { height: 250, backgroundColor: '#0f0f1a', borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  rarityBanner: { position: 'absolute', top: 20, right: -30, paddingHorizontal: 40, paddingVertical: 6, transform: [{ rotate: '45deg' }] },
  rarityBannerText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  modalScroll: { padding: 20 },
  modalTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  modalCategory: { fontSize: 14, color: '#9ca3af', marginBottom: 16 },
  modalDescription: { fontSize: 16, color: '#d1d5db', lineHeight: 24, marginBottom: 20 },
  statsContainer: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#22c55e', marginBottom: 12 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  statLabel: { color: '#9ca3af', fontSize: 14 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  loreContainer: { backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 16, padding: 16, marginBottom: 20 },
  loreText: { color: '#a7f3d0', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },
  closeButton: { backgroundColor: '#22c55e', marginHorizontal: 20, marginBottom: 10, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  closeButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footer: { paddingHorizontal: 20, paddingTop: 10 },
  footerText: { color: '#a7f3d0', fontSize: 14, textAlign: 'center' },
});
