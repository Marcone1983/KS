import React, { useRef, useState, useEffect, Suspense } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, Text as DreiText, Box } from '@react-three/drei/native';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { Audio } from 'expo-av';

// --- THEME COLORS ---
const COLORS = {
  background: '#1a1a2e',
  primary: '#228B22', // Verde
  accent: '#FFD700',   // Oro
  text: '#FFFFFF',
  textSecondary: '#a9a9a9',
};

// --- DATA STRUCTURES & MOCK DATA ---
interface Collectible {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
}

interface StoryNode {
  id: string;
  title: string;
  year: number;
  description: string;
  audioPath?: string; // Optional audio narration
  collectibleId?: string;
}

const LORE_DATA: StoryNode[] = [
  { id: '1', year: 2098, title: "L'Inizio della Guerra", description: "Le prime ostilità scoppiarono ai confini del sistema solare, segnando l'inizio di un'era oscura per l'umanità.", collectibleId: 'crystal' },
  { id: '2', year: 2105, title: "La Caduta di Marte", description: "Le forze Kurstaki travolsero le difese marziane. La colonia cadde in meno di una settimana, un colpo devastante per il morale terrestre." },
  { id: '3', year: 2112, title: "Progetto Chimera", description: "In segreto, gli scienziati della Terra iniziarono a lavorare su una nuova super-arma, nome in codice: Progetto Chimera.", collectibleId: 'ship_model' },
  { id: '4', year: 2120, title: "La Battaglia della Cintura", description: "Una vittoria cruciale per le forze terrestri nella cintura di asteroidi, rallentando l'avanzata nemica e guadagnando tempo prezioso." },
  { id: '5', year: 2125, title: "Il Tradimento", description: "Un alto ammiraglio terrestre disertò, portando con sé i piani del Progetto Chimera. La speranza sembrava perduta.", collectibleId: 'datapad' },
];

const INITIAL_COLLECTIBLES: Record<string, Collectible> = {
  crystal: { id: 'crystal', name: "Cristallo Kurstaki", description: "Un frammento energetico proveniente da una nave da guerra Kurstaki.", unlocked: false },
  ship_model: { id: 'ship_model', name: "Modellino 'Vendetta'", description: "Un modello in scala della nave che guidò la controffensiva terrestre.", unlocked: false },
  datapad: { id: 'datapad', name: "Datapad Criptato", description: "Contiene i registri parziali del traditore, ancora da decifrare.", unlocked: false },
};

const STORAGE_KEY = '@KurstakiStrike_LoreArchive';

// --- 3D COMPONENTS ---

function SpinningCollectible({ modelId }: { modelId: string }) {
    const mesh = useRef<THREE.Mesh>(null!);
    const [active, setActive] = useState(false);

    useFrame((_, delta) => {
        if (mesh.current) {
            mesh.current.rotation.y += delta * 0.5;
            mesh.current.rotation.x += delta * 0.2;
        }
    });

    let geometry;
    switch (modelId) {
        case 'crystal':
            geometry = <octahedronGeometry args={[0.8, 0]} />;
            break;
        case 'ship_model':
            geometry = <coneGeometry args={[0.7, 1.5, 32]} />;
            break;
        case 'datapad':
            geometry = <boxGeometry args={[1.2, 1.6, 0.2]} />;
            break;
        default:
            geometry = <boxGeometry args={[1, 1, 1]} />;
    }

    return (
        <mesh
            ref={mesh}
            scale={active ? 1.2 : 1}
            onClick={() => setActive(!active)}
        >
            {geometry}
            <meshStandardMaterial color={active ? COLORS.accent : COLORS.primary} wireframe />
        </mesh>
    );
}

function Scene({ story }: { story: StoryNode | null }) {
    return (
        <Suspense fallback={<ActivityIndicator color={COLORS.accent} size="large" />}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <DreiText
                position={[0, 2.5, -2]}
                color={COLORS.accent}
                fontSize={0.5}
                anchorX="center"
                anchorY="middle"
            >
                {story ? story.title : "Archivio"}
            </DreiText>
            {story && story.collectibleId && (
                <SpinningCollectible modelId={story.collectibleId} />
            )}
            <OrbitControls enableZoom={true} enablePan={true} />
        </Suspense>
    );
}

// --- MAIN COMPONENT ---

const LoreArchive3D = () => {
  const [selectedStory, setSelectedStory] = useState<StoryNode | null>(null);
  const [collectibles, setCollectibles] = useState<Record<string, Collectible>>(INITIAL_COLLECTIBLES);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const detailsOpacity = useSharedValue(0);
  const detailsTranslateY = useSharedValue(30);

  const animatedDetailsStyle = useAnimatedStyle(() => {
    return {
      opacity: detailsOpacity.value,
      transform: [{ translateY: detailsTranslateY.value }],
    };
  });

  // --- DATA PERSISTENCE ---
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const { unlockedCollectibles } = JSON.parse(savedData);
          const updatedCollectibles = { ...INITIAL_COLLECTIBLES };
          for (const id of unlockedCollectibles) {
            if (updatedCollectibles[id]) {
              updatedCollectibles[id].unlocked = true;
            }
          }
          setCollectibles(updatedCollectibles);
        }
      } catch (e) {
        console.error("Failed to load lore data.", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const unlockCollectible = async (collectibleId: string) => {
    if (collectibles[collectibleId] && !collectibles[collectibleId].unlocked) {
      const newCollectibles = { ...collectibles };
      newCollectibles[collectibleId].unlocked = true;
      setCollectibles(newCollectibles);

      try {
        const unlockedIds = Object.values(newCollectibles)
          .filter(c => c.unlocked)
          .map(c => c.id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ unlockedCollectibles: unlockedIds }));
      } catch (e) {
        console.error("Failed to save lore data.", e);
      }
    }
  };

  // --- AUDIO PLAYBACK ---
  async function playSound(path?: string) {
    if (!path) return;
    // In a real app, path would be a remote URI or a local file asset
    // For this demo, we simulate playback without actual files.
    console.log(`Simulating playback of: ${path}`);
    // Example of how it would work with expo-av:
    /*
    if (sound) {
      await sound.unloadAsync();
    }
    const { sound: newSound } = await Audio.Sound.createAsync(
       require(path) // or { uri: path }
    );
    setSound(newSound);
    await newSound.playAsync();
    */
  }

  useEffect(() => {
    return sound ? () => { sound.unloadAsync(); } : undefined;
  }, [sound]);

  // --- UI HANDLERS ---
  const handleStorySelect = (story: StoryNode) => {
    detailsOpacity.value = withTiming(0, { duration: 200 }, () => {
      setSelectedStory(story);
      if (story.collectibleId) {
        unlockCollectible(story.collectibleId);
      }
      playSound(story.audioPath);
      detailsOpacity.value = withTiming(1, { duration: 300 });
      detailsTranslateY.value = withTiming(0, { duration: 300 });
    });
    detailsTranslateY.value = withTiming(30, { duration: 200 });
  };

  if (isLoading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.accent} /></View>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <Scene story={selectedStory} />
        </Canvas>
      </View>
      <View style={styles.timelineContainer}>
        <Text style={styles.timelineTitle}>Timeline Storica</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {LORE_DATA.map((story, index) => (
            <TouchableOpacity key={story.id} style={styles.timelineNode} onPress={() => handleStorySelect(story)}>
              <View style={[styles.timelineDot, selectedStory?.id === story.id && styles.timelineDotSelected]} />
              <Text style={styles.timelineYear}>{story.year}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <Animated.View style={[styles.detailsContainer, animatedDetailsStyle]}>
        {selectedStory ? (
          <>
            <Text style={styles.detailsTitle}>{selectedStory.title}</Text>
            <Text style={styles.detailsDescription}>{selectedStory.description}</Text>
            {selectedStory.collectibleId && collectibles[selectedStory.collectibleId]?.unlocked && (
              <View style={styles.collectibleInfo}>
                <Text style={styles.collectibleTitle}>Collezionabile Sbloccato:</Text>
                <Text style={styles.collectibleName}>{collectibles[selectedStory.collectibleId].name}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.detailsPlaceholder}>Seleziona un evento dalla timeline per visualizzare i dettagli.</Text>
        )}
      </Animated.View>
    </SafeAreaView>
  );
};

// --- STYLES ---
const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  canvasContainer: {
    flex: 0.55,
  },
  timelineContainer: {
    flex: 0.15,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.primary,
  },
  timelineTitle: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 15,
    marginBottom: 10,
  },
  timelineNode: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.textSecondary,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  timelineDotSelected: {
    backgroundColor: COLORS.accent,
  },
  timelineYear: {
    color: COLORS.text,
    marginTop: 5,
    fontSize: 14,
  },
  detailsContainer: {
    flex: 0.3,
    padding: 20,
  },
  detailsPlaceholder: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  detailsTitle: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  detailsDescription: {
    color: COLORS.text,
    fontSize: 16,
    lineHeight: 24,
  },
  collectibleInfo: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(34, 139, 34, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  collectibleTitle: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: 'bold',
  },
  collectibleName: {
    color: COLORS.text,
    fontSize: 16,
    marginTop: 4,
  },
});

export default LoreArchive3D;
