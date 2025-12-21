// @ts-nocheck
import React, { useState, useRef, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Modal, Animated as RNAnimated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import * as THREE from 'three';
import Animated, { FadeIn, FadeOut, SlideInRight, useSharedValue, useAnimatedStyle, withTiming, withSequence, withDelay } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface LoreChapter {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  unlocked: boolean;
  pages: LorePage[];
  collectibles: string[];
}

interface LorePage {
  id: string;
  title: string;
  content: string;
  image?: string;
  hasCutscene?: boolean;
}

const LORE_CHAPTERS: LoreChapter[] = [
  {
    id: 'origins',
    title: 'Le Origini',
    subtitle: 'Come tutto ebbe inizio',
    icon: '📜',
    unlocked: true,
    collectibles: ['ancient_scroll', 'first_seed'],
    pages: [
      {
        id: 'origins_1',
        title: 'L\'Alba Verde',
        content: 'In un tempo dimenticato, quando il mondo era giovane e la terra fertile, nacque il primo Giardino. Non era un giardino ordinario, ma un luogo dove la natura stessa pulsava di energia primordiale.\n\nI primi coltivatori scoprirono che alcune piante possedevano proprietà straordinarie. Non solo guarivano il corpo, ma potevano rafforzare lo spirito e proteggere dai mali del mondo.',
        hasCutscene: true,
      },
      {
        id: 'origins_2',
        title: 'I Guardiani',
        content: 'Con il passare dei secoli, emerse un ordine di protettori: i Guardiani del Verde. Questi valorosi coltivatori dedicarono la loro vita alla protezione delle piante sacre e alla lotta contro le creature che minacciavano il Giardino.\n\nOgni Guardiano portava con sé uno Spray Sacro, un\'arma forgiata con l\'essenza delle piante più potenti, capace di respingere qualsiasi parassita.',
      },
      {
        id: 'origins_3',
        title: 'La Prima Invasione',
        content: 'Ma la pace non durò per sempre. Dall\'oscurità emersero i primi parassiti: creature corrotte dalla brama di distruggere tutto ciò che era verde e vivo.\n\nLa Locusta Regina, la più temibile di tutte, guidò il primo grande assalto. Solo l\'unione di tutti i Guardiani riuscì a respingerla, ma a caro prezzo.',
        hasCutscene: true,
      },
    ],
  },
  {
    id: 'kurstaki',
    title: 'Il Segreto di Kurstaki',
    subtitle: 'La scoperta che cambiò tutto',
    icon: '🧬',
    unlocked: true,
    collectibles: ['kurstaki_sample', 'research_notes'],
    pages: [
      {
        id: 'kurstaki_1',
        title: 'Una Scoperta Rivoluzionaria',
        content: 'Nelle profondità del Laboratorio Ancestrale, uno scienziato di nome Dr. Elena Verdani fece una scoperta che avrebbe cambiato il corso della storia.\n\nIsolò un batterio naturale, il Bacillus thuringiensis var. kurstaki, capace di proteggere le piante senza danneggiare l\'ambiente. Era la chiave per una nuova era di coltivazione.',
      },
      {
        id: 'kurstaki_2',
        title: 'L\'Arma Definitiva',
        content: 'Il Kurstaki divenne la base per una nuova generazione di Spray. Più potenti, più sicuri, più efficaci. I Guardiani moderni ora avevano un\'arma che poteva competere con le orde di parassiti sempre più numerose.\n\nMa con grande potere viene grande responsabilità. Non tutti usarono il Kurstaki per il bene...',
        hasCutscene: true,
      },
    ],
  },
  {
    id: 'breeding',
    title: 'L\'Arte del Breeding',
    subtitle: 'Creare la vita perfetta',
    icon: '🌱',
    unlocked: true,
    collectibles: ['breeding_manual', 'legendary_seed'],
    pages: [
      {
        id: 'breeding_1',
        title: 'I Maestri Breeder',
        content: 'Nel corso dei millenni, alcuni Guardiani si specializzarono nell\'arte del breeding. Impararono a combinare i tratti genetici delle piante per creare varietà sempre più resistenti e potenti.\n\nOgni ibrido era unico, portando con sé le caratteristiche dei suoi genitori e, occasionalmente, mutazioni sorprendenti.',
      },
      {
        id: 'breeding_2',
        title: 'Le Varietà Leggendarie',
        content: 'Le leggende parlano di piante così rare e potenti da essere considerate mitiche. La "Aurora Boreale", con i suoi fiori che brillano di notte. La "Tempesta Verde", capace di resistere a qualsiasi parassita.\n\nSolo i Maestri Breeder più abili potevano sperare di creare tali meraviglie.',
        hasCutscene: true,
      },
    ],
  },
  {
    id: 'enemies',
    title: 'Bestiario dei Parassiti',
    subtitle: 'Conosci il tuo nemico',
    icon: '🐛',
    unlocked: true,
    collectibles: ['pest_encyclopedia', 'boss_trophy'],
    pages: [
      {
        id: 'enemies_1',
        title: 'Gli Afidi',
        content: 'Piccoli ma letali in gruppo. Gli afidi sono i soldati di fanteria dell\'esercito parassita. Si riproducono rapidamente e possono sopraffare anche le difese più solide con il loro numero.\n\nPunto debole: Lo spray li elimina facilmente, ma attenzione alle ondate successive.',
      },
      {
        id: 'enemies_2',
        title: 'Il Ragnetto Rosso',
        content: 'Invisibile ad occhio nudo, il ragnetto rosso è un assassino silenzioso. Tesse le sue ragnatele sulle foglie, soffocando lentamente la pianta.\n\nPunto debole: Preferisce ambienti secchi. L\'umidità è il suo nemico.',
      },
      {
        id: 'enemies_3',
        title: 'La Locusta Regina',
        content: 'Il terrore di ogni coltivatore. La Locusta Regina è un boss devastante che comanda sciami di locuste minori. Il suo arrivo è preceduto da un\'ombra che oscura il sole.\n\nPunto debole: Attaccare durante la fase di richiamo dello sciame, quando è vulnerabile.',
        hasCutscene: true,
      },
    ],
  },
  {
    id: 'future',
    title: 'Il Futuro',
    subtitle: 'Cosa ci attende',
    icon: '🔮',
    unlocked: false,
    collectibles: ['prophecy_scroll'],
    pages: [
      {
        id: 'future_1',
        title: '???',
        content: 'Questo capitolo sarà sbloccato completando la storia principale...',
      },
    ],
  },
];

// 3D Cutscene Component
function CutsceneViewer({ pageId }: { pageId: string }) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.2;
    }
  });

  // Different scenes based on page
  const getScene = () => {
    switch (pageId) {
      case 'origins_1':
        return (
          <group ref={meshRef}>
            {/* Ancient garden scene */}
            <mesh position={[0, 0, 0]}>
              <coneGeometry args={[1, 2, 8]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
            <mesh position={[-1.5, 0, 0]}>
              <coneGeometry args={[0.7, 1.5, 8]} />
              <meshStandardMaterial color="#16a34a" />
            </mesh>
            <mesh position={[1.5, 0, 0]}>
              <coneGeometry args={[0.8, 1.7, 8]} />
              <meshStandardMaterial color="#15803d" />
            </mesh>
            {/* Sun */}
            <mesh position={[0, 3, -2]}>
              <sphereGeometry args={[0.5, 16, 16]} />
              <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
            </mesh>
          </group>
        );
      case 'origins_3':
        return (
          <group ref={meshRef}>
            {/* Locust boss scene */}
            <mesh position={[0, 0.5, 0]}>
              <dodecahedronGeometry args={[1, 0]} />
              <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
            </mesh>
            {/* Swarm */}
            {Array.from({ length: 20 }).map((_, i) => (
              <mesh key={i} position={[
                Math.sin(i * 0.5) * 2,
                Math.cos(i * 0.3) * 0.5 + 1,
                Math.cos(i * 0.5) * 2
              ]}>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshStandardMaterial color="#7f1d1d" />
              </mesh>
            ))}
          </group>
        );
      default:
        return (
          <group ref={meshRef}>
            <mesh>
              <torusKnotGeometry args={[0.8, 0.3, 100, 16]} />
              <meshStandardMaterial color="#22c55e" metalness={0.5} roughness={0.3} />
            </mesh>
          </group>
        );
    }
  };

  return getScene();
}

export default function LoreArchiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedChapter, setSelectedChapter] = useState<LoreChapter | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showCutscene, setShowCutscene] = useState(false);
  const fadeAnim = useSharedValue(1);

  const currentPage = selectedChapter?.pages[currentPageIndex];

  const openChapter = (chapter: LoreChapter) => {
    if (!chapter.unlocked) return;
    setSelectedChapter(chapter);
    setCurrentPageIndex(0);
  };

  const nextPage = () => {
    if (!selectedChapter) return;
    if (currentPageIndex < selectedChapter.pages.length - 1) {
      fadeAnim.value = withSequence(
        withTiming(0, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
      setTimeout(() => setCurrentPageIndex(prev => prev + 1), 200);
    }
  };

  const prevPage = () => {
    if (currentPageIndex > 0) {
      fadeAnim.value = withSequence(
        withTiming(0, { duration: 200 }),
        withTiming(1, { duration: 200 })
      );
      setTimeout(() => setCurrentPageIndex(prev => prev - 1), 200);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
  }));

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => selectedChapter ? setSelectedChapter(null) : router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← {selectedChapter ? 'Capitoli' : 'Indietro'}</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Archivio Lore</ThemedText>
        <View style={{ width: 60 }} />
      </View>

      {!selectedChapter ? (
        // Chapter Selection
        <ScrollView style={styles.chaptersContainer} contentContainerStyle={styles.chaptersContent}>
          <ThemedText style={styles.archiveTitle}>📚 Cronache di Kurstaki Strike</ThemedText>
          <ThemedText style={styles.archiveSubtitle}>Scopri la storia del mondo</ThemedText>
          
          {LORE_CHAPTERS.map((chapter, index) => (
            <Animated.View key={chapter.id} entering={SlideInRight.delay(index * 100)}>
              <Pressable 
                style={[styles.chapterCard, !chapter.unlocked && styles.chapterLocked]}
                onPress={() => openChapter(chapter)}
              >
                <View style={styles.chapterIcon}>
                  <ThemedText style={styles.chapterIconText}>
                    {chapter.unlocked ? chapter.icon : '🔒'}
                  </ThemedText>
                </View>
                <View style={styles.chapterInfo}>
                  <ThemedText style={styles.chapterTitle}>{chapter.title}</ThemedText>
                  <ThemedText style={styles.chapterSubtitle}>{chapter.subtitle}</ThemedText>
                  <View style={styles.chapterMeta}>
                    <ThemedText style={styles.chapterPages}>
                      📄 {chapter.pages.length} pagine
                    </ThemedText>
                    <ThemedText style={styles.chapterCollectibles}>
                      🏆 {chapter.collectibles.length} collezionabili
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.chapterArrow}>{chapter.unlocked ? '→' : ''}</ThemedText>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      ) : (
        // Page Reader
        <View style={styles.readerContainer}>
          {/* Cutscene Button */}
          {currentPage?.hasCutscene && (
            <Pressable 
              style={styles.cutsceneButton}
              onPress={() => setShowCutscene(true)}
            >
              <ThemedText style={styles.cutsceneButtonText}>🎬 Guarda Cutscene</ThemedText>
            </Pressable>
          )}

          {/* Page Content */}
          <Animated.View style={[styles.pageContainer, animatedStyle]}>
            <ThemedText style={styles.pageNumber}>
              {currentPageIndex + 1} / {selectedChapter.pages.length}
            </ThemedText>
            <ThemedText style={styles.pageTitle}>{currentPage?.title}</ThemedText>
            <ScrollView style={styles.pageScroll}>
              <ThemedText style={styles.pageContent}>{currentPage?.content}</ThemedText>
            </ScrollView>
          </Animated.View>

          {/* Navigation */}
          <View style={[styles.navigation, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <Pressable 
              style={[styles.navButton, currentPageIndex === 0 && styles.navButtonDisabled]}
              onPress={prevPage}
              disabled={currentPageIndex === 0}
            >
              <ThemedText style={styles.navButtonText}>← Precedente</ThemedText>
            </Pressable>
            
            <View style={styles.pageIndicators}>
              {selectedChapter.pages.map((_, i) => (
                <View 
                  key={i} 
                  style={[styles.pageIndicator, i === currentPageIndex && styles.pageIndicatorActive]} 
                />
              ))}
            </View>
            
            <Pressable 
              style={[styles.navButton, currentPageIndex === selectedChapter.pages.length - 1 && styles.navButtonDisabled]}
              onPress={nextPage}
              disabled={currentPageIndex === selectedChapter.pages.length - 1}
            >
              <ThemedText style={styles.navButtonText}>Successiva →</ThemedText>
            </Pressable>
          </View>
        </View>
      )}

      {/* Cutscene Modal */}
      <Modal visible={showCutscene} animationType="fade" transparent>
        <View style={styles.cutsceneOverlay}>
          <View style={styles.cutsceneContainer}>
            <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
              <ambientLight intensity={0.3} />
              <pointLight position={[10, 10, 10]} intensity={1} />
              <pointLight position={[-10, 5, -10]} intensity={0.5} color="#22c55e" />
              <Suspense fallback={null}>
                <CutsceneViewer pageId={currentPage?.id || ''} />
              </Suspense>
            </Canvas>
            
            <View style={styles.cutsceneControls}>
              <ThemedText style={styles.cutsceneTitle}>{currentPage?.title}</ThemedText>
              <Pressable style={styles.closeCutsceneButton} onPress={() => setShowCutscene(false)}>
                <ThemedText style={styles.closeCutsceneText}>Chiudi</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Progress Footer */}
      <View style={styles.progressFooter}>
        <ThemedText style={styles.progressText}>
          Capitoli Sbloccati: {LORE_CHAPTERS.filter(c => c.unlocked).length}/{LORE_CHAPTERS.length}
        </ThemedText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  backButton: { padding: 8 },
  backText: { color: '#a78bfa', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  chaptersContainer: { flex: 1 },
  chaptersContent: { paddingHorizontal: 20, paddingBottom: 100 },
  archiveTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  archiveSubtitle: { fontSize: 14, color: '#a78bfa', textAlign: 'center', marginBottom: 24 },
  chapterCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 },
  chapterLocked: { opacity: 0.5 },
  chapterIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(167,139,250,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  chapterIconText: { fontSize: 28 },
  chapterInfo: { flex: 1 },
  chapterTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  chapterSubtitle: { fontSize: 14, color: '#a78bfa', marginBottom: 8 },
  chapterMeta: { flexDirection: 'row', gap: 16 },
  chapterPages: { fontSize: 12, color: '#9ca3af' },
  chapterCollectibles: { fontSize: 12, color: '#9ca3af' },
  chapterArrow: { fontSize: 24, color: '#a78bfa' },
  readerContainer: { flex: 1, paddingHorizontal: 20 },
  cutsceneButton: { backgroundColor: 'rgba(167,139,250,0.3)', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  cutsceneButtonText: { color: '#a78bfa', fontSize: 16, fontWeight: 'bold' },
  pageContainer: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 20 },
  pageNumber: { color: '#6b7280', fontSize: 12, textAlign: 'center', marginBottom: 8 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 16 },
  pageScroll: { flex: 1 },
  pageContent: { fontSize: 16, color: '#d1d5db', lineHeight: 28 },
  navigation: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  navButton: { paddingVertical: 12, paddingHorizontal: 16 },
  navButtonDisabled: { opacity: 0.3 },
  navButtonText: { color: '#a78bfa', fontSize: 14 },
  pageIndicators: { flexDirection: 'row', gap: 8 },
  pageIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(167,139,250,0.3)' },
  pageIndicatorActive: { backgroundColor: '#a78bfa', width: 24 },
  cutsceneOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  cutsceneContainer: { width: width - 40, height: height * 0.6, borderRadius: 20, overflow: 'hidden', backgroundColor: '#1a1a2e' },
  cutsceneControls: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: 'rgba(0,0,0,0.7)' },
  cutsceneTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  closeCutsceneButton: { backgroundColor: '#a78bfa', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  closeCutsceneText: { color: '#fff', fontWeight: 'bold' },
  progressFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  progressText: { color: '#a78bfa', fontSize: 14, textAlign: 'center' },
});
